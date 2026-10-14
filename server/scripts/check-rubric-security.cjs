// Real crypto and HTTP handlers with in-memory persistence. No accounts or emails touched.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.MFA_ENCRYPTION_KEY = randomBytes(32).toString('hex');
const { User } = require('../dist/models');
const { AccountFactor, RevokedSession } = require('../dist/models/AccountSecurity');
const { AuthLimit } = require('../dist/models/AuthLimit');
const crypto = require('../dist/lib/totp');
const { sessionCredential } = require('../dist/lib/sessionCredential');
const users = new Map(), factors = new Map(), revoked = new Map();
const query = value => ({ select: async () => value });
User.findById = id => query(users.get(String(id)));
User.findOne = filter => query([...users.values()].find(user => user.email === filter.email));
AuthLimit.findOneAndUpdate = async () => ({ count: 1 });
AccountFactor.findOne = filter => query(factors.get(String(filter.userId)));
AccountFactor.create = async value => {
  const key = String(value.userId);
  if (factors.has(key)) throw Object.assign(new Error('Duplicate'), { code: 11000 });
  const factor = { _id: key, enabled: false, lastCounter: -1, ...value };
  factors.set(key, factor); return factor;
};
AccountFactor.findOneAndUpdate = (filter, update) => {
  const row = factors.get(String(filter.userId));
  if (!row || row.enabled !== filter.enabled) return query(null);
  Object.assign(row, update.$set); return query({ ...row });
};
AccountFactor.updateOne = async (filter, update) => {
  const row = factors.get(String(filter._id));
  if (!row || row.lastCounter >= filter.lastCounter.$lt || (filter.enrollmentId && row.enrollmentId !== filter.enrollmentId)) return { modifiedCount: 0 };
  Object.assign(row, update.$set); return { modifiedCount: 1 };
};
RevokedSession.exists = async filter => revoked.has(filter.digest);
RevokedSession.updateOne = async (filter, update) => revoked.set(filter.digest, update.$setOnInsert);
const app = express(); app.use(express.json());
app.use('/auth', require('../dist/routes/auth').default);
app.get('/private', require('../dist/middleware/auth').authenticate, (req, res) => res.json({ role: req.userRole }));
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: 'Request failed' }));
let server;
(async () => {
  // RFC 6238 SHA-1 vectors verify the algorithm independently of our implementation.
  const secret = crypto.base32(Buffer.from('12345678901234567890'));
  for (const [time, expected] of [[59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'], [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130']]) assert.equal(crypto.totp(secret, Math.floor(time / 30), 8), expected);
  const encrypted = crypto.encryptFactor(secret, 'owner');
  assert.equal(crypto.decryptFactor(encrypted, 'owner'), secret);
  assert.throws(() => crypto.decryptFactor(encrypted, 'other'));
  const damaged = Buffer.from(encrypted, 'base64'); damaged[30] ^= 1;
  assert.throws(() => crypto.decryptFactor(damaged.toString('base64'), 'owner'));
  assert.equal(crypto.matchingCounter(secret, '123'), null);
  const savedKey = process.env.MFA_ENCRYPTION_KEY; delete process.env.MFA_ENCRYPTION_KEY;
  assert.throws(() => crypto.encryptFactor(secret, 'owner')); process.env.MFA_ENCRYPTION_KEY = savedKey;
  const password = 'Travel_2026', passwordHash = await bcrypt.hash(password, 4);
  for (const [index, role] of ['ADMIN', 'SUPERADMIN', 'LGU', 'EXPLORER'].entries()) {
    const _id = (index + 1).toString(16).padStart(24, '0');
    users.set(_id, { _id, role, name: 'Test User', email: role.toLowerCase() + '@test.invalid', passwordHash, municipality: 'Dagupan' });
  }
  server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  const call = async (path, body, token) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  };
  for (const user of users.values()) {
    const login = await call('/auth/login', { email: user.email, password });
    assert.equal(login.status, 200);
    if (user.role === 'EXPLORER') {
      assert(login.body.token); assert.equal((await call('/private', undefined, login.body.token)).status, 200);
      assert.equal((await call('/auth/logout', {}, login.body.token)).status, 200);
      const nextLogin = await call('/auth/login', { email: user.email, password });
      assert.notEqual(nextLogin.body.token, login.body.token, 'Rapid re-login receives a unique session');
      assert.equal((await call('/private', undefined, nextLogin.body.token)).status, 200);
      continue;
    }
    assert.equal(login.body.token, undefined); assert.equal(login.body.mfaRequired, true);
    const challengeToken = login.body.challengeToken;
    const claims = jwt.decode(challengeToken);
    const { iat, exp, ...challengeClaims } = claims;
    assert.equal((await call('/auth/mfa/setup', { challengeToken: jwt.sign(challengeClaims, process.env.JWT_SECRET, { expiresIn: -1 }) })).status, 401);
    assert.equal((await call('/auth/mfa/setup', { challengeToken: jwt.sign(challengeClaims, process.env.JWT_SECRET, { algorithm: 'HS384', expiresIn: '10m' }) })).status, 401);
    assert.equal((await call('/private', undefined, challengeToken)).status, 401);
    const bypass = jwt.sign({ userId: user._id, role: user.role, credential: sessionCredential(user.passwordHash) }, process.env.JWT_SECRET);
    assert.equal((await call('/private', undefined, bypass)).status, 401);
    const setup = await call('/auth/mfa/setup', { challengeToken }); assert.equal(setup.status, 200);
    assert.equal(setup.body.secret.length, 32);
    assert.equal((await call('/auth/mfa/setup', { challengeToken })).body.secret, setup.body.secret, 'Enrollment retries retain the same key');
    const code = crypto.totp(setup.body.secret, Math.floor(Date.now() / 30000));
    const results = await Promise.all([1, 2].map(() => call('/auth/mfa/verify', { challengeToken, code })));
    assert.deepEqual(results.map(row => row.status).sort(), [200, 400], 'Concurrent code redemption succeeds only once');
    const session = results.find(row => row.status === 200).body;
    assert.equal((await call('/private', undefined, session.token)).status, 200);
    assert.equal(jwt.decode(session.token).exp - jwt.decode(session.token).iat, 3600);
    assert.equal((await call('/auth/mfa/setup', { challengeToken })).body.secret, undefined, 'Confirmed factor is never disclosed');
    assert.equal((await call('/auth/mfa/verify', { challengeToken, code })).status, 400);
    assert.equal((await call('/auth/logout', {}, session.token)).status, 200);
    assert.equal((await call('/private', undefined, session.token)).status, 401, 'Logout revokes the bearer token');
    user.passwordHash = await bcrypt.hash('Changed_2027', 4);
    assert.equal((await call('/auth/mfa/setup', { challengeToken })).status, 401, 'Password change revokes MFA challenges');
  }
  for (const privacyConsent of [undefined, false, 'true', {}]) assert.equal((await call('/auth/register', { firstName: 'Juan', surname: 'Reyes', email: 'juan@gmail.com', password, ...(privacyConsent === undefined ? {} : { privacyConsent }) })).status, 400);
  assert.equal((await call('/auth/login', { email: { $ne: null }, password })).status, 400);
  assert.equal((await call('/auth/mfa/verify', { challengeToken: 'invalid', code: '123456', role: 'SUPERADMIN' })).status, 400);
  console.log('PASS: RFC TOTP vectors, authenticated encryption, mandatory privileged MFA, no challenge-token access, enrollment, atomic replay protection, session expiry, logout revocation, credential changes, privacy acknowledgment enforcement and injection rejection.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server?.close());
