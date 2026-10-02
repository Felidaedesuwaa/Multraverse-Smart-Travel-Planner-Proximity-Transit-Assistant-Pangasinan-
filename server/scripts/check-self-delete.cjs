// Exercise the real HTTP route, JWT checks and bcrypt verification with an
// in-memory persistence fixture. This never connects to a database.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Trip, BudgetEntry, SavedPlace } = require('../dist/models');
const { PlannerDraft } = require('../dist/models/PlannerDraft');
const { PendingRegistration } = require('../dist/models/PendingRegistration');
const { PasswordReset } = require('../dist/models/PasswordReset');
const { AuthLimit } = require('../dist/lib/authLimits');
const { sessionCredential } = require('../dist/lib/sessionCredential');
const originalSecret = process.env.JWT_SECRET;
const restores = [];
const replace = (object, key, value) => {
  const original = object[key];
  restores.push(() => { object[key] = original; });
  object[key] = value;
};

(async () => {
  let server;
  try {
    process.env.JWT_SECRET = randomBytes(32).toString('hex');
    const password = 'CurrentPassword_2026';
    const owner = { _id: new mongoose.Types.ObjectId(), email: 'owner@example.test', role: 'EXPLORER', passwordHash: await bcrypt.hash(password, 4) };
    const other = { ...owner, _id: new mongoose.Types.ObjectId(), email: 'other@example.test' };
    const accounts = new Map([owner, other].map(user => [String(user._id), user]));
    const records = new Map([Trip, BudgetEntry, SavedPlace, PlannerDraft, PendingRegistration, PasswordReset].map(model => [model, new Set([String(owner._id), String(other._id)])]));
    let mutations = 0, transactions = 0, attempts = 0, changed = false;
    replace(User, 'findById', id => ({ select: async () => accounts.get(String(id)) || null }));
    replace(AuthLimit, 'findOneAndUpdate', async () => ({ count: ++attempts }));
    replace(mongoose.connection, 'transaction', async work => { transactions++; await work('fixture-session'); });
    replace(User, 'findOneAndDelete', async (query, options) => {
      assert.equal(String(query._id), String(owner._id));
      assert.equal(query.passwordHash, owner.passwordHash);
      assert.equal(options.session, 'fixture-session');
      if (changed) return null;
      mutations++;
      accounts.delete(String(owner._id));
      return owner;
    });
    for (const [model, entries] of records) replace(model, 'deleteMany', async (query, options) => {
      assert.deepEqual(query, model === PendingRegistration ? { email: owner.email } : { userId: String(owner._id) });
      assert.equal(options.session, 'fixture-session');
      mutations++;
      entries.delete(String(owner._id));
    });
    const app = express();
    app.use(express.json());
    app.use('/api/users', require('../dist/routes/users').default);
    app.use((error, _req, res, _next) => res.status(500).json({ error: error.message }));
    server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    const token = jwt.sign({ userId: String(owner._id), credential: sessionCredential(owner.passwordHash) }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' });
    const remove = async (body, credential = token) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/users/me`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json', ...(credential ? { Authorization: `Bearer ${credential}` } : {}) }, body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };
    const unchanged = () => {
      assert.equal(accounts.size, 2);
      assert.equal(mutations, 0);
      for (const entries of records.values()) assert.equal(entries.size, 2);
    };
    assert.equal((await remove({ password, confirmation: true }, null)).status, 401);
    assert.equal((await remove({ password, confirmation: true }, 'invalid-token')).status, 401);
    const staleToken = jwt.sign({ userId: String(owner._id), credential: '0'.repeat(64) }, process.env.JWT_SECRET);
    assert.equal((await remove({ password, confirmation: true }, staleToken)).status, 401);
    for (const body of [
      { confirmation: true }, { password: '', confirmation: true },
      { password: 'WrongPassword_2026', confirmation: true },
      { password: 'x'.repeat(257), confirmation: true },
      { password: { unexpected: 'object' }, confirmation: true },
      { password }, { password, confirmation: false }, { password, confirmation: 'true' },
    ]) {
      attempts = 0;
      assert.equal((await remove(body)).status, 400);
      unchanged();
    }
    assert.equal(transactions, 0, 'Rejected passwords must never start deletion');
    attempts = 0;
    for (let i = 0; i < 5; i++) assert.equal((await remove({ password: 'WrongPassword_2026', confirmation: true })).status, 400);
    assert.equal((await remove({ password, confirmation: true })).status, 429, 'A correct password must not bypass the attempt limit');
    unchanged();
    attempts = 0;
    changed = true;
    assert.equal((await remove({ password, confirmation: true })).status, 409, 'Credentials changed before removal');
    unchanged();
    changed = false;
    const deleted = await remove({ password, confirmation: true, userId: String(other._id) });
    assert.equal(deleted.status, 200);
    assert.ok(deleted.body.message.includes('permanently deleted'));
    assert.equal(accounts.has(String(owner._id)), false);
    assert.equal(accounts.has(String(other._id)), true, 'Only the signed-in account may be removed');
    for (const entries of records.values()) assert.deepEqual([...entries], [String(other._id)]);
    assert.equal((await remove({ password, confirmation: true })).status, 401, 'Deleted account tokens cannot be reused');
    console.log('PASS: missing, malformed and incorrect passwords block self-deletion; confirmation, session checks, attempt limits, credential changes, ownership and associated-data cleanup are enforced. In-memory fixtures only; no database writes.');
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    while (restores.length) restores.pop()();
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
