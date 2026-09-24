const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const path = require('node:path');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Never run against the application's database. Opt-in creates a separate,
// randomly named database and drops ONLY that database when the checks finish.
if (!process.argv.includes('--isolated-database')) {
  console.error('Run with --isolated-database to test in a temporary MongoDB database (SMTP is mocked).');
  process.exit(1);
}
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const uri = process.env.AUTH_TEST_MONGODB_URI || process.env.MONGODB_URI;
if (!uri) { console.error('Configure AUTH_TEST_MONGODB_URI or MONGODB_URI first.'); process.exit(1); }
process.env.JWT_SECRET = randomBytes(32).toString('hex');
Object.assign(process.env, { SMTP_HOST: 'smtp.test.invalid', SMTP_PORT: '465', SMTP_USER: 'test', SMTP_PASS: 'test', MAIL_FROM: 'test@test.invalid' });
const dbName = `multraverse_auth_test_${randomBytes(6).toString('hex')}`;
const { User, Trip, TripStop, BudgetEntry, BudgetSettings, SavedPlace } = require('../dist/models');
const { PendingRegistration } = require('../dist/models/PendingRegistration');
const { PlannerDraft } = require('../dist/models/PlannerDraft');
const { AuthLimit, AuthError, authLimit } = require('../dist/lib/authLimits');
const email = require('../dist/lib/verificationEmail');
const domain = require('../dist/lib/emailDomain');
const { RegistrationError } = require('../dist/lib/registration');
const deliveries = new Map(); let deliveryFails = false; let domainCalls = 0;
email.sendVerificationEmail = async (recipient, code) => {
  if (deliveryFails) throw new AuthError('Email delivery unavailable', 503);
  deliveries.set(recipient, code);
};
domain.ensureEmailDomain = async address => {
  domainCalls++;
  if (address.endsWith('@no-mail.org')) throw new RegistrationError({ email: 'Email domain does not accept mail' });
};
const app = express(); app.use(express.json());
app.use('/api/auth', require('../dist/routes/auth').default);
app.use('/api/users', require('../dist/routes/users').default);
app.use((error, req, res, next) => res.status(500).json({ error: 'Test operation failed' }));
let server;
(async () => {
  try {
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });
    assert.equal(mongoose.connection.name, dbName);
    await Promise.all([User, Trip, TripStop, BudgetEntry, BudgetSettings, SavedPlace, PendingRegistration, PlannerDraft, AuthLimit].map(model => model.init()));
    server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
    const call = async (route, body, token, method = 'POST') => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/${route}`, {
        method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(method !== 'GET' ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, body: await response.json() };
    };
    const valid = { firstName: 'Juan', middleName: 'Reyes', surname: 'dela Cruz', email: 'juan@gmail.com', password: 'Lakbay_2026' };
    const register = body => call('auth/register', { ...valid, ...body });
    const verify = (challengeId, code) => call('auth/register/verify', { challengeId, code });
    const resetLimits = () => AuthLimit.deleteMany({});
    for (const body of [{ firstName: '' }, { email: 'a@example.com' }, { password: 'bad password' }, { firstName: {} }]) assert.equal((await register(body)).status, 400);
    assert.equal(domainCalls, 0); assert.equal(await User.countDocuments(), 0);
    assert.equal((await register({ email: 'a@no-mail.org' })).status, 400);
    const configuredHost = process.env.SMTP_HOST; delete process.env.SMTP_HOST;
    assert.equal((await register({})).status, 503); process.env.SMTP_HOST = configuredHost;
    assert.equal(await PendingRegistration.countDocuments(), 0);
    deliveryFails = true;
    assert.equal((await register({})).status, 503); assert.equal(await PendingRegistration.countDocuments(), 0);
    deliveryFails = false;
    const started = await register({ role: 'ADMIN', email: ' JUAN@GMAIL.COM ' });
    assert.equal(started.status, 202); assert.equal(started.body.token, undefined); assert.equal(started.body.code, undefined);
    const challenge = started.body.challengeId;
    let pending = await PendingRegistration.findOne({ challengeId: challenge });
    assert.notEqual(pending.codeHash, deliveries.get(valid.email)); assert.equal(pending.password, undefined);
    assert.ok(await bcrypt.compare(valid.password, pending.passwordHash));
    assert.equal(await User.countDocuments(), 0, 'No login-capable account before verification');
    assert.equal((await call('auth/login', valid)).status, 401);
    assert.equal((await call('auth/register/resend', { challengeId: challenge })).status, 429);
    assert.equal((await register({})).status, 429);
    assert.equal((await verify({ $ne: null }, '123456')).status, 400);
    const wrong = String((Number(deliveries.get(valid.email)) + 1) % 1000000).padStart(6, '0');
    for (let index = 0; index < 5; index++) assert.equal((await verify(challenge, wrong)).status, 400);
    assert.equal((await verify(challenge, deliveries.get(valid.email))).status, 400, 'Five wrong attempts lock the code');
    const oldCode = deliveries.get(valid.email);
    await PendingRegistration.updateOne({ challengeId: challenge }, { resendAt: new Date(0) });
    assert.equal((await call('auth/register/resend', { challengeId: challenge })).status, 200);
    if (oldCode !== deliveries.get(valid.email)) assert.equal((await verify(challenge, oldCode)).status, 400);
    await PendingRegistration.updateOne({ challengeId: challenge }, { expiresAt: new Date(Date.now() - 1) });
    assert.equal((await verify(challenge, deliveries.get(valid.email))).status, 400, 'Expired codes fail before TTL cleanup');
    // Restore only this fixture to test the transaction's rollback and replay protection.
    await PendingRegistration.updateOne({ challengeId: challenge }, { expiresAt: new Date(Date.now() + 600000), attempts: 0 });
    const originalCreate = User.create;
    User.create = async () => { throw new Error('Simulated persistence failure'); };
    try { assert.equal((await verify(challenge, deliveries.get(valid.email))).status, 500); }
    finally { User.create = originalCreate; }
    assert.ok(await PendingRegistration.exists({ challengeId: challenge }), 'Failed transaction preserves signup');
    const raced = await Promise.all([verify(challenge, deliveries.get(valid.email)), verify(challenge, deliveries.get(valid.email))]);
    assert.deepEqual(raced.map(result => result.status).sort(), [201, 400]);
    const registered = raced.find(result => result.status === 201).body;
    assert.equal(registered.user.name, 'Juan R. dela Cruz'); assert.equal(registered.user.middleName, 'R');
    assert.equal(registered.user.role, 'EXPLORER'); assert.equal(registered.user.passwordHash, undefined);
    assert.equal(jwt.verify(registered.token, process.env.JWT_SECRET).userId, registered.user.id);
    assert.ok((await User.findById(registered.user.id)).emailVerifiedAt);
    assert.equal((await verify(challenge, deliveries.get(valid.email))).status, 400);
    assert.equal((await register({})).status, 400);
    assert.equal((await call('auth/login', valid)).status, 200);
    await resetLimits();
    const other = await User.create({ name: 'Other Traveler', email: 'other@gmail.com', passwordHash: await bcrypt.hash(valid.password, 10) });
    const otherToken = jwt.sign({ userId: other._id.toString(), role: 'ADMIN' }, process.env.JWT_SECRET);
    assert.equal((await call('users', undefined, otherToken, 'GET')).status, 403, 'Database role overrides stale token role');
    assert.equal((await call('auth/login', { email: other.email, password: valid.password })).status, 200, 'Existing accounts remain usable');
    const owner = registered.user.id;
    for (const userId of [owner, other._id]) {
      const trip = await Trip.create({ userId, title: 'Test trip', location: 'Pangasinan', date: '2027-01-01' });
      await TripStop.create({ tripId: trip._id, name: 'Test stop', order: 1 });
      await BudgetEntry.create({ userId, tripId: trip._id, label: 'Lunch', amount: 100 });
      await BudgetSettings.create({ userId });
      await SavedPlace.create({ userId, name: 'Test place', category: 'Nature', isPublic: true });
      await PlannerDraft.create({ userId, plan: { test: true }, expiresAt: new Date(Date.now() + 600000) });
    }
    const remove = body => call('users/me', body, registered.token, 'DELETE');
    assert.equal((await call('users/me', { password: valid.password, confirmation: true }, null, 'DELETE')).status, 401);
    assert.equal((await remove({ password: valid.password })).status, 400);
    assert.equal((await remove({ password: 'Wrong123', confirmation: true })).status, 400);
    assert.equal(await User.countDocuments(), 2);
    const originalDelete = BudgetEntry.deleteMany;
    BudgetEntry.deleteMany = async () => { throw new Error('Simulated deletion failure'); };
    try { assert.equal((await remove({ password: valid.password, confirmation: true })).status, 500); }
    finally { BudgetEntry.deleteMany = originalDelete; }
    assert.equal(await User.countDocuments(), 2); assert.equal(await Trip.countDocuments(), 2); assert.equal(await TripStop.countDocuments(), 2);
    assert.equal((await remove({ password: valid.password, confirmation: true, userId: other._id })).status, 200);
    assert.equal(await User.countDocuments(), 1); assert.ok(await User.exists({ _id: other._id }));
    for (const model of [Trip, BudgetEntry, BudgetSettings, SavedPlace, PlannerDraft]) {
      assert.equal(await model.countDocuments({ userId: owner }), 0, `${model.modelName} removed`);
      assert.equal(await model.countDocuments({ userId: other._id }), 1, `${model.modelName} owner isolation`);
    }
    assert.equal(await TripStop.countDocuments(), 1);
    assert.equal((await call('users/me', undefined, registered.token, 'GET')).status, 401);
    assert.equal((await call('auth/login', valid)).status, 401);
    assert.equal((await register({})).status, 202, 'Deleted email can register again with a new verification');
    assert.equal((await call('auth/register/resend', { challengeId: '0'.repeat(64) })).status, 410);
    for (let i = 0; i < 5; i++) await authLimit('test-limit', 'test-key', 5, 600000);
    await assert.rejects(authLimit('test-limit', 'test-key', 5, 600000), error => error.status === 429);
    console.log('PASS: verification, expiry, attempt/resend limits, SMTP failure, concurrent redemption, rollback, legacy login, password-confirmed cascading deletion, owner isolation and token revocation. No emails sent or existing accounts modified.');
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) {
      if (mongoose.connection.name !== dbName || !/^multraverse_auth_test_[a-f0-9]{12}$/.test(dbName)) throw new Error('Refusing unsafe test cleanup');
      // Some Atlas roles allow dropping collections but not the database itself.
      // Only inspect/drop collections after the exact random database guard above.
      const collections = await mongoose.connection.db.listCollections().toArray();
      for (const collection of collections) {
        if (!collection.name.startsWith('system.')) await mongoose.connection.db.dropCollection(collection.name);
      }
      console.log('All temporary test collections removed.');
    }
    await mongoose.disconnect();
  }
})().catch(error => { console.error(error instanceof assert.AssertionError ? error : `Auth lifecycle checks failed (${[error.name, error.codeName, error.code].filter(Boolean).join('/')}; connection details hidden).`); process.exit(1); });
