// Uses only a randomly named test database. SMTP and response-delay clocks are
// mocked: no messages are sent and no existing application records are touched.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
if (!process.argv.includes('--isolated-database')) throw new Error('Use --isolated-database to run security integration checks');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const uri = process.env.AUTH_TEST_MONGODB_URI;
if (!uri) throw new Error('Configure AUTH_TEST_MONGODB_URI for a dedicated test replica set');
process.env.JWT_SECRET = randomBytes(32).toString('hex');
const dbName = `multraverse_security_test_${randomBytes(8).toString('hex')}`;
const { User, Trip, AuditLog } = require('../dist/models');
const { PasswordReset, preparePasswordResetStorage } = require('../dist/models/PasswordReset');
const { AuthLimit } = require('../dist/models/AuthLimit');
const { authLimit } = require('../dist/lib/authLimits');
const { sessionCredential } = require('../dist/lib/sessionCredential');
const { profileUpdate } = require('../dist/lib/profile');
const { tripFieldErrors } = require('../dist/lib/tripValidation');
const mail = require('../dist/lib/verificationEmail');
const deliveries = new Map(); let mailFails = false;
mail.emailTransport = () => ({ close() {} });
mail.sendVerificationEmail = async (email, code, purpose) => {
  assert.equal(purpose, 'reset');
  if (mailFails) throw new Error('mock private SMTP failure');
  deliveries.set(email, code);
};
const delays = [];
require('node:timers/promises').setTimeout = async milliseconds => { delays.push(milliseconds); };
const { rateLimit, securityHeaders } = require('../dist/middleware/security');
const app = express(); app.disable('x-powered-by'); app.use(securityHeaders);
app.use(express.json({ limit: '16kb' }));
for (const name of ['auth', 'users', 'trips']) app.use('/api/' + name, require('../dist/routes/' + name).default);
app.get('/limited', rateLimit('test-http', 2, 60000), (_req, res) => res.json({ ok: true }));
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: 'Unable to complete request' }));
let server;
(async () => {
  try {
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });
    assert.equal(mongoose.connection.name, dbName);
    const { models, jsonSchema } = require('./database-rules.cjs');
    for (const model of models()) { await model.createCollection({ validator: { $jsonSchema: jsonSchema(model.schema) } }); await model.createIndexes(); }
    await preparePasswordResetStorage(); await preparePasswordResetStorage(); // additive/idempotent on an existing schema
    const initialPassword = 'Travel_2026'; const changedPassword = 'Island_2027'; const resetPassword = 'Summer_2028';
    const owner = await User.create({ name: 'Juan Reyes', email: 'juan.security@gmail.com', passwordHash: await bcrypt.hash(initialPassword, 10) });
    const other = await User.create({ name: 'Maria Santos', email: 'maria.security@gmail.com', passwordHash: await bcrypt.hash(initialPassword, 10) });
    const otherTrip = await Trip.create({ userId: other._id, title: 'Private trip', location: 'Alaminos', date: '2027-01-15' });
    server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const call = async (route, body, token, method = 'POST') => {
      const response = await fetch(base + '/api/' + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, body: await response.json(), headers: response.headers };
    };
    const login = password => call('auth/login', { email: owner.email, password });
    const limits = () => AuthLimit.deleteMany({});
    const forgot = email => call('auth/password/forgot', { email });
    const reset = (challengeId, code, newPassword = resetPassword) => call('auth/password/reset', { challengeId, code, newPassword });
    let signedIn = await login(initialPassword); assert.equal(signedIn.status, 200);
    const oldToken = signedIn.body.token;
    assert.equal(signedIn.body.user.passwordHash, undefined);
    const legacy = jwt.sign({ userId: String(owner._id), role: 'ADMIN' }, process.env.JWT_SECRET);
    assert.equal((await call('users/me', undefined, legacy, 'GET')).status, 401, 'Old tokens must require login');
    const forgedRole = jwt.sign({ userId: String(owner._id), role: 'SUPERADMIN', credential: sessionCredential(owner.passwordHash) }, process.env.JWT_SECRET);
    assert.equal((await call('users/admin-accounts', undefined, forgedRole, 'GET')).status, 403, 'DB role defeats forged token role');
    assert.equal((await call('trips/' + otherTrip._id, { title: 'Stolen trip' }, oldToken, 'PUT')).status, 404);
    assert.equal((await call('trips/' + otherTrip._id, undefined, oldToken, 'DELETE')).status, 404);
    assert.equal((await call('users/me', { name: 'Juan123' }, oldToken, 'PUT')).status, 400);
    assert.equal((await call('users/me', { firstName: 'Juan1', surname: 'Reyes' }, oldToken, 'PUT')).status, 400);
    assert.equal((await call('users/me', { role: 'ADMIN' }, oldToken, 'PUT')).status, 400);
    assert.throws(() => profileUpdate({ name: 123 })); assert.throws(() => profileUpdate({ name: 'Juan123' }));
    assert.equal(profileUpdate({ name: "José R. O'Neill" }).name, "José R. O'Neill");
    for (const body of [{ email: { $ne: null }, password: initialPassword }, { email: owner.email, password: { $gt: '' } }, JSON.parse('{"email":"a@gmail.com","password":"Travel_2026","__proto__":{"role":"ADMIN"}}')]) assert.equal((await call('auth/login', body)).status, 400);
    assert.equal((await call('auth/login', { email: "' OR 1=1 --", password: initialPassword })).status, 401);
    const front = await import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.resolve(__dirname, '../../src/utils/validation.js'), 'utf8')).toString('base64'));
    const trip = { title: 'Island Adventure', location: 'Alaminos, Pangasinan', date: '2028-02-29', budget: 500 };
    for (const patch of [{ date: '2027-02-29' }, { date: '2027-13-01' }, { date: '' }, { title: '12345' }, { location: '<script>bad</script>' }, { budget: -1 }, { budget: 1000001 }]) {
      const body = { ...trip, ...patch };
      assert.ok(Object.keys(front.validateTrip(body)).length);
      assert.deepEqual(Object.keys(front.validateTrip(body)), Object.keys(tripFieldErrors(body)));
      assert.equal((await call('trips', body, oldToken)).status, 400);
    }
    assert.equal((await call('trips', { ...trip, userId: String(other._id) }, oldToken)).status, 400);
    assert.equal((await call('trips', trip, oldToken)).status, 201, 'The new manual trip payload must work');
    assert.equal((await call('auth/password/change', { currentPassword: initialPassword, newPassword: changedPassword })).status, 401);
    assert.equal((await call('auth/password/change', { currentPassword: 'Wrong123', newPassword: changedPassword }, oldToken)).status, 400);
    for (const password of ['no capital1', 'lowercase1', 'NoNumber', 'Bad!Pass12']) assert.equal((await call('auth/password/reset', { challengeId: 'a'.repeat(64), code: '123456', newPassword: password })).status, 400);
    await limits();
    const unknown = await forgot('unregistered.security@gmail.com'); assert.equal(unknown.status, 202);
    assert.equal(deliveries.has('unregistered.security@gmail.com'), false);
    let pending = await forgot(owner.email); assert.equal(pending.status, 202); assert.equal(pending.body.message, unknown.body.message);
    assert.equal((await forgot(owner.email)).status, 429);
    assert.ok(delays.length >= 2 && delays.every(ms => ms >= 0 && ms <= 6000));
    let challenge = pending.body.challengeId, code = deliveries.get(owner.email);
    const stored = await PasswordReset.findOne({ challengeId: challenge }).select('+codeHash');
    assert.notEqual(stored.codeHash, code); assert.equal(stored.toJSON().codeHash, undefined);
    for (let attempt = 0; attempt < 5; attempt++) assert.equal((await reset(challenge, '000000')).status, 400);
    assert.equal((await reset(challenge, code)).status, 400, 'Attempts exhausted even with correct code');
    await limits(); pending = await forgot(owner.email); challenge = pending.body.challengeId; code = deliveries.get(owner.email);
    await PasswordReset.updateOne({ challengeId: challenge }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await reset(challenge, code)).status, 400);
    await limits(); const replaced = await forgot(owner.email); const replacedCode = deliveries.get(owner.email);
    await limits(); pending = await forgot(owner.email); challenge = pending.body.challengeId; code = deliveries.get(owner.email);
    assert.equal((await reset(replaced.body.challengeId, replacedCode)).status, 400, 'Resend invalidates prior code');
    assert.equal((await reset(unknown.body.challengeId, code)).status, 400);
    const auditCreate = AuditLog.create;
    AuditLog.create = async () => { throw new Error('mock audit failure'); };
    try { assert.equal((await reset(challenge, code)).status, 500); } finally { AuditLog.create = auditCreate; }
    assert.equal((await login(initialPassword)).status, 200, 'Audit failure must roll back the password');
    assert.ok(await PasswordReset.exists({ challengeId: challenge }));
    const concurrent = await Promise.all([reset(challenge, code), reset(challenge, code)]);
    assert.equal(concurrent.filter(result => result.status === 200).length, 1, 'Exactly one concurrent redemption');
    assert.equal((await reset(challenge, code)).status, 400);
    assert.equal((await login(initialPassword)).status, 401);
    assert.equal((await call('users/me', undefined, oldToken, 'GET')).status, 401);
    signedIn = await login(resetPassword); assert.equal(signedIn.status, 200);
    assert.equal(await AuditLog.countDocuments({ action: 'password_reset' }), 1);
    await limits(); pending = await forgot(owner.email); code = deliveries.get(owner.email);
    assert.equal((await call('auth/password/change', { currentPassword: resetPassword, newPassword: changedPassword }, signedIn.body.token)).status, 200);
    assert.equal((await reset(pending.body.challengeId, code)).status, 400, 'Authenticated change cancels pending OTPs');
    assert.equal((await call('users/me', undefined, signedIn.body.token, 'GET')).status, 401);
    assert.equal((await login(changedPassword)).status, 200);
    assert.equal(await AuditLog.countDocuments({ action: 'password_changed' }), 1);
    // Managed LGU accounts use the same recovery flow, preserving their role and scope.
    await limits();
    const lgu = await User.create({ name: 'Municipal Tourism Officer', email: 'lgu.security@gmail.com', role: 'LGU', municipality: 'Dagupan', passwordHash: await bcrypt.hash('LegacyPass1!', 4) });
    const lguLogin = password => call('auth/login', { email: lgu.email, password });
    let lguSession = await lguLogin('LegacyPass1!'); assert.equal(lguSession.status, 200);
    assert.equal((await call('auth/password/change', { currentPassword: 'LegacyPass1!', newPassword: changedPassword }, lguSession.body.token)).status, 200);
    assert.equal((await call('users/me', undefined, lguSession.body.token, 'GET')).status, 401);
    lguSession = await lguLogin(changedPassword); assert.equal(lguSession.status, 200);
    const lguChallenge = await forgot(lgu.email); assert.equal(lguChallenge.status, 202);
    assert.equal((await reset(lguChallenge.body.challengeId, '000000')).status, 400);
    assert.equal((await reset(lguChallenge.body.challengeId, deliveries.get(lgu.email))).status, 200);
    assert.equal((await call('users/me', undefined, lguSession.body.token, 'GET')).status, 401);
    assert.equal((await lguLogin(changedPassword)).status, 401);
    const recoveredLGU = await lguLogin(resetPassword); assert.equal(recoveredLGU.status, 200);
    assert.equal(recoveredLGU.body.user.role, 'LGU'); assert.equal(recoveredLGU.body.user.municipality, 'Dagupan');
    assert.equal((await login(changedPassword)).status, 200, 'LGU recovery must not change another account');
    console.log('PASS: LGU password change and email OTP recovery preserve the role/municipality and revoke previous sessions.');
    await limits(); mailFails = true; const failedMail = await forgot(owner.email); mailFails = false;
    assert.equal(failedMail.status, 202); assert.equal(failedMail.body.message, unknown.body.message);
    assert.equal(await PasswordReset.countDocuments({ userId: owner._id }), 0);
    await limits();
    const reservations = await Promise.allSettled(Array.from({ length: 8 }, () => authLimit('concurrent', 'one-user', 3, 60000)));
    assert.equal(reservations.filter(r => r.status === 'fulfilled').length, 3, 'Database limits are atomic');
    await fetch(base + '/limited'); await fetch(base + '/limited');
    const limited = await fetch(base + '/limited'); assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get('retry-after')) > 0);
    assert.equal(limited.headers.get('cache-control'), 'no-store'); assert.equal(limited.headers.get('x-content-type-options'), 'nosniff');
    console.log('PASS: OTP privacy, hashing, attempts, expiry, resend, single-use concurrency, rollback, session revocation, password policy, name/trip validation, ownership, role enforcement, injection rejection, shared rate limits and security headers. No emails sent.');
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (mongoose.connection.readyState === 1) {
      if (mongoose.connection.name !== dbName || !/^multraverse_security_test_[a-f0-9]{16}$/.test(dbName)) throw new Error('Refusing unsafe test cleanup');
      for (const collection of await mongoose.connection.db.listCollections().toArray()) if (!collection.name.startsWith('system.')) await mongoose.connection.db.dropCollection(collection.name);
      console.log('Removed only isolated security-test collections.');
    }
    await mongoose.disconnect();
  }
})().catch(error => { console.error(error instanceof assert.AssertionError ? error : `Security checks failed (${[error.name, error.codeName, error.code].filter(Boolean).join('/')}; connection details hidden).`); process.exitCode = 1; });
