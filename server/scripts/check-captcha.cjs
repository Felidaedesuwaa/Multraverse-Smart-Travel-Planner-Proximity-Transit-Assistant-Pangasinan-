// Exercise real HTTP routes with mocked Cloudflare, storage and email boundaries.
// No external requests, database connection, keys or email delivery are used.
const assert = require('node:assert/strict');
const express = require('express');
const { createHash } = require('node:crypto');
const nativeFetch = global.fetch;
process.env.NODE_ENV = 'test';
process.env.TURNSTILE_SECRET_KEY = 'private-test-fixture';
process.env.TURNSTILE_ALLOWED_HOSTNAMES = 'web.test,localhost';
process.env.JWT_SECRET = 'test-code-digest-only';
const passes = new Map();
const { CaptchaVerification } = require('../dist/models/CaptchaVerification');
CaptchaVerification.create = async record => { passes.set(record.digest, record); };
CaptchaVerification.findOneAndDelete = async query => {
  const record = passes.get(query.digest);
  if (!record || record.expiresAt <= query.expiresAt.$gt) return null;
  passes.delete(query.digest); return record;
};
let providerResult, providerCalls = 0, providerFailure = false, emails = 0, limited = false;
global.fetch = async (url, options) => {
  assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  providerCalls++;
  const body = JSON.parse(options.body);
  assert.equal(body.secret, 'private-test-fixture');
  assert.equal(typeof body.response, 'string');
  assert(options.signal instanceof AbortSignal);
  if (providerFailure) throw new Error('Network timeout');
  return { ok: true, json: async () => providerResult };
};
const { AuthError } = require('../dist/lib/authLimits');
require('../dist/lib/authLimits').authLimit = async scope => { if (limited && scope === 'captcha-ip') throw new AuthError('Try later', 429, 60); };
require('../dist/lib/emailDomain').ensureEmailDomain = async () => {};
require('../dist/lib/verificationEmail').emailTransport = () => ({ close() {} });
require('../dist/lib/verificationEmail').sendVerificationEmail = async () => { emails++; };
require('../dist/models').User.findOne = async () => null;
require('../dist/models/PendingRegistration').PendingRegistration.findOneAndUpdate = async (_query, update) => update.$set;
require('../dist/models/AccountSecurity').PrivacyAcknowledgment.create = async () => {};
const app = express(); app.use(express.json());
app.use('/api/auth', require('../dist/routes/auth').default);
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: 'Invalid request' }));
let server;
(async () => {
  server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const call = async (route, body) => {
    const response = await nativeFetch(`http://127.0.0.1:${server.address().port}/api/auth/${route}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  const challenge = () => call('captcha/verify', { token: 'provider-token' });
  const fields = { firstName: 'Juan', surname: 'Cruz', email: 'juan@gmail.com', password: 'Lakbay_2026', privacyConsent: true };
  const register = captchaProof => call('register', { ...fields, ...(captchaProof ? { captchaProof } : {}) });
  assert.equal((await register()).status, 400, 'Direct registration must require a pass');
  assert.equal((await register('a'.repeat(64))).status, 400, 'Forged passes must fail');
  for (const token of ['', {}, 'x'.repeat(2049)]) assert.equal((await call('captcha/verify', { token })).status, 400);
  assert.equal(providerCalls, 0);
  for (const result of [null, { success: false }, { success: true, hostname: 'evil.test', action: 'register' }, { success: true, hostname: 'web.test', action: 'login' }]) {
    providerResult = result;
    assert.equal((await challenge()).status, 400);
    assert.equal(passes.size, 0);
  }
  providerFailure = true;
  assert.equal((await challenge()).status, 503, 'Provider failures must fail closed');
  providerFailure = false;
  delete process.env.TURNSTILE_SECRET_KEY;
  assert.equal((await challenge()).status, 503);
  process.env.NODE_ENV = 'production';
  process.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';
  assert.equal((await challenge()).status, 503, 'Production cannot use an always-pass test secret');
  process.env.NODE_ENV = 'test';
  process.env.TURNSTILE_SECRET_KEY = 'private-test-fixture';
  limited = true;
  assert.equal((await challenge()).status, 429);
  limited = false;
  providerResult = { success: true, hostname: 'web.test', action: 'register' };
  const verified = await challenge();
  assert.equal(verified.status, 200);
  assert.match(verified.body.captchaProof, /^[a-f0-9]{64}$/);
  assert(new Date(verified.body.expiresAt).getTime() > Date.now());
  assert(!passes.has(verified.body.captchaProof), 'Raw pass is never stored');
  assert.equal((await register(verified.body.captchaProof)).status, 202);
  assert.equal(emails, 1);
  assert.equal((await register(verified.body.captchaProof)).status, 400, 'A used pass cannot send a second code');
  const expired = await challenge();
  const key = createHash('sha256').update(expired.body.captchaProof).digest('hex');
  passes.get(key).expiresAt = new Date(0);
  assert.equal((await register(expired.body.captchaProof)).status, 400, 'Expired passes fail even before TTL deletion');
  const concurrent = await challenge();
  const results = await Promise.all([register(concurrent.body.captchaProof), register(concurrent.body.captchaProof)]);
  assert.deepEqual(results.map(result => result.status).sort(), [202, 400]);
  assert.equal(emails, 2, 'Concurrent replay must send only one email');
  console.log('PASS: CAPTCHA HTTP validation, provider failures, hostname/action, production config, rate limit, required pass, expiry and concurrent single-use redemption.');
})().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => { global.fetch = nativeFetch; if (server) { server.closeAllConnections(); server.close(); } });
