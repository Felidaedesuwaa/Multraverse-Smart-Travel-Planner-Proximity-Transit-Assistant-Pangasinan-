// In-memory HTTP checks: no real accounts or database writes.
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, AuditLog } = require('../dist/models');
const { RevokedSession } = require('../dist/models/AccountSecurity');
const { sessionCredential } = require('../dist/lib/sessionCredential');
process.env.JWT_SECRET = 'isolated-account-disable-test-secret';
require('../dist/lib/authLimits').authLimit = async () => {};

(async () => {
  let server;
  try {
    const password = 'TestingPassword_2026';
    const hash = await bcrypt.hash(password, 4);
    const admin = { _id: new mongoose.Types.ObjectId(), role: 'ADMIN', passwordHash: hash };
    const explorer = { _id: new mongoose.Types.ObjectId(), role: 'EXPLORER', email: 'user@example.test', passwordHash: hash };
    const superadmin = { _id: new mongoose.Types.ObjectId(), role: 'SUPERADMIN', passwordHash: hash };
    const lgu = { _id: new mongoose.Types.ObjectId(), role: 'LGU', municipality: 'Dagupan', email: 'lgu.dagupan@multraverse.ph', passwordHash: hash };
    admin.email = 'admin.juan@multraverse.ph';
    const accounts = [admin, explorer, superadmin, lgu];
    const audits = [];
    RevokedSession.exists = async () => null;
    User.findById = id => ({ select: async () => accounts.find(a => String(a._id) === String(id)) });
    User.findOne = filter => ({ select: async () => accounts.find(a => a.email === filter.email) });
    User.findOneAndUpdate = async (filter, update) => {
      const user = accounts.find(a => String(a._id) === String(filter._id) && a.role === filter.role);
      if (user) Object.assign(user, update.$set);
      return user;
    };
    mongoose.connection.transaction = async work => work({});
    AuditLog.create = async rows => audits.push(...rows);
    const token = user => jwt.sign({ userId: String(user._id), role: user.role, credential: sessionCredential(hash), mfa: true }, process.env.JWT_SECRET);
    const app = express();
    app.use(express.json());
    app.use('/api/users', require('../dist/routes/users').default);
    app.use('/api/auth', require('../dist/routes/auth').default);
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const request = async (path, body, user = admin) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, {
        method: path === 'auth/login' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` }, body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };
    const path = `users/explorers/${explorer._id}/status`;
    assert.equal((await request(path, { disabled: true }, explorer)).status, 403);
    assert.equal((await request(path, { disabled: 'true' })).status, 400);
    assert.equal((await request(path, { disabled: true, role: 'ADMIN' })).status, 400);
    assert.equal((await request(`users/explorers/${admin._id}/status`, { disabled: true })).status, 404);
    assert.equal((await request(path, { disabled: true })).status, 200);
    assert.equal(explorer.disabled, true);
    assert.equal((await request('users/me', { location: 'Dagupan' }, explorer)).status, 401);
    assert.equal((await request('auth/login', { email: explorer.email, password })).status, 403);
    assert.equal((await request(path, { disabled: false })).status, 200);
    assert.equal((await request('auth/login', { email: explorer.email, password })).status, 200);
    assert.deepEqual(audits.map(a => a.action), ['disable_explorer_account', 'reactivate_explorer_account']);
    for (const [kind, account] of [['admin', admin], ['lgu', lgu]]) {
      const route = `users/${kind}-accounts/${account._id}/status`;
      assert.equal((await request(route, { disabled: true }, admin)).status, 403);
      assert.equal((await request(route, { disabled: 'true' }, superadmin)).status, 400);
      assert.equal((await request(route, { disabled: true, role: 'SUPERADMIN' }, superadmin)).status, 400);
      assert.equal((await request(`users/${kind}-accounts/${superadmin._id}/status`, { disabled: true }, superadmin)).status, 404);
      assert.equal((await request(route, { disabled: true }, superadmin)).status, 200);
      assert.equal(account.disabled, true);
      assert.equal((await request('users/me', { location: 'Dagupan' }, account)).status, 401);
      assert.equal((await request('auth/login', { email: account.email, password })).status, 403);
      assert.equal(audits.at(-1).action, `disable_${kind}_account`);
      assert.equal((await request(route, { disabled: false }, superadmin)).status, 200);
      assert.equal(account.disabled, false);
      assert.equal((await request('auth/login', { email: account.email, password })).body.mfaRequired, true);
      assert.equal(audits.at(-1).action, `reactivate_${kind}_account`);
    }
    console.log('PASS: permissions, status validation, protected roles, disable, session blocking, login blocking, reactivation and audit logs.');
  } finally { if (server) await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
