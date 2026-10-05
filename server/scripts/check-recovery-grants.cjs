// Run real hashing/JWT/recovery code with in-memory persistence; no DB or emails.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const crypto = require('node:crypto'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
const { AuthError } = require('../dist/lib/authLimits');
const { sessionCredential } = require('../dist/lib/sessionCredential');
let user, reset, code, audit = [], failAudit = false;
const query = result => ({ select: async () => result });
const matches = (row, filter) => row && Object.entries(filter).every(([key, value]) => {
  if (key === 'expiresAt') return row.expiresAt > value.$gt;
  if (key === 'attempts') return row.attempts < value.$lt;
  return String(row[key]) === String(value);
});
const User = {
  findOne: filter => query(user?.email === filter.email ? { ...user } : null),
  findById: id => query(String(id) === user?._id ? { ...user } : null),
  updateOne: async (filter, update) => { if (!matches(user, filter)) return { modifiedCount: 0 }; Object.assign(user, update.$set); return { modifiedCount: 1 }; },
};
const PasswordReset = {
  findOneAndUpdate(filter, update) {
    if (filter.userId) {
      reset = { _id: 'reset-record', userId: filter.userId, ...update.$set };
      return Promise.resolve({ ...reset });
    }
    if (!matches(reset, filter)) return query(null);
    reset.attempts += update.$inc.attempts;
    return query({ ...reset });
  },
  findOne: filter => query(matches(reset, filter) ? { ...reset } : null),
  updateOne: async (filter, update) => { if (!matches(reset, filter)) return { modifiedCount: 0 }; Object.assign(reset, update.$set); return { modifiedCount: 1 }; },
  findOneAndDelete: async filter => { if (!matches(reset, filter)) return null; const previous = reset; reset = null; return previous; },
  deleteMany: async () => { reset = null; }, deleteOne: async () => { reset = null; },
};
const mocks = {
  '../models': { User, AuditLog: { create: async entries => { if (failAudit) throw Error('Audit unavailable'); audit.push(...entries); } } },
  '../models/PasswordReset': { PasswordReset },
  './authLimits': { AuthError, authLimit: async () => {} },
  './verificationEmail': { emailTransport: () => ({ close() {} }), sendVerificationEmail: async (_email, value) => { code = value; } },
  'node:timers/promises': { setTimeout: async () => {} },
  mongoose: { connection: { transaction: async operation => {
    const previous = { user: { ...user }, reset: reset && { ...reset }, audit: [...audit] };
    try { return await operation({}); } catch (error) { user = previous.user; reset = previous.reset; audit = previous.audit; throw error; }
  } } },
};
const file = path.resolve(__dirname, '../dist/lib/passwordSecurity.js');
const moduleValue = { exports: {} };
vm.runInThisContext(`(function(require,module,exports){${fs.readFileSync(file, 'utf8')}\n})`, { filename: file })(name => mocks[name] || (name.startsWith('.') ? require(path.resolve(path.dirname(file), name)) : require(name)), moduleValue, moduleValue.exports);
const security = moduleValue.exports;
(async () => {
  user = { _id: 'a'.repeat(24), email: 'recovery.grant.check@gmail.com', passwordHash: await bcrypt.hash('Travel_2028', 4) };
  const original = sessionCredential(user.passwordHash);
  let challenge = await security.requestPasswordReset(user.email);
  for (let i = 0; i < 5; i++) await assert.rejects(security.verifyPasswordReset(challenge.challengeId, '000000'));
  await assert.rejects(security.verifyPasswordReset(challenge.challengeId, code), 'Correct OTP fails after the attempt limit');
  challenge = await security.requestPasswordReset(user.email);
  const oldCode = code;
  const results = await Promise.allSettled([security.verifyPasswordReset(challenge.challengeId, code), security.verifyPasswordReset(challenge.challengeId, code)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1, 'Concurrent OTP exchanges issue one grant');
  const grant = results.find(result => result.status === 'fulfilled').value.grantToken;
  await assert.rejects(security.resetPassword(challenge.challengeId, oldCode, 'Travel_2029'), 'The OTP cannot be reused after exchange');
  await assert.rejects(security.recoverPassword(jwt.sign({ userId: user._id, purpose: 'login' }, process.env.JWT_SECRET), 'Travel_2029'));
  const claims = jwt.verify(grant, process.env.JWT_SECRET);
  const { iat, exp, ...payload } = claims;
  await assert.rejects(security.recoverPassword(jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS384', expiresIn: '5m' }), 'Travel_2029'));
  await assert.rejects(security.recoverPassword(jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: -1 }), 'Travel_2029'));
  await assert.rejects(security.recoverPassword(grant + 'corrupt', 'Travel_2029'));
  await assert.rejects(security.recoverPassword(grant, 'weak'));
  await assert.rejects(security.recoverPassword(grant, 'Travel_2028'), 'A new password must differ');
  failAudit = true; await assert.rejects(security.recoverPassword(grant, 'Travel_2029')); failAudit = false;
  assert.equal(sessionCredential(user.passwordHash), original, 'Transaction failure preserves the existing credential');
  assert(reset, 'Transaction failure retains the grant for retry');
  const recovered = await security.recoverPassword(grant, 'Travel_2029');
  assert(await bcrypt.compare('Travel_2029', recovered.passwordHash));
  assert.notEqual(sessionCredential(recovered.passwordHash), original, 'Old access tokens are revoked');
  await assert.rejects(security.recoverPassword(grant, 'Travel_2030'), 'Grants are consumed once');
  challenge = await security.requestPasswordReset(user.email);
  const verified = await security.verifyPasswordReset(challenge.challengeId, code);
  reset.expiresAt = new Date(0);
  await assert.rejects(security.recoverPassword(verified.grantToken, 'Travel_2030'), 'A valid JWT cannot revive an expired challenge');
  challenge = await security.requestPasswordReset(user.email);
  const pending = await security.verifyPasswordReset(challenge.challengeId, code);
  await security.changePassword(user._id, 'Travel_2029', 'Travel_2030');
  await assert.rejects(security.recoverPassword(pending.grantToken, 'Travel_2031'), 'Normal password change invalidates outstanding recovery grants');
  console.log('PASS: real OTP hashing, attempt limits, concurrent exchange, JWT purpose/algorithm/expiry/signature, password policy, rollback/retry, single-use grants, credential revocation and reset invalidation with mocked persistence.');
})().catch(error => { console.error(error); process.exitCode = 1; });
