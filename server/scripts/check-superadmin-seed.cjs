const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
let existing = null, created = [], collision = false;
const User = {
  collection: { createIndex: async () => {} },
  findOne: () => ({ select: async () => existing }),
  create: async input => { if (collision) throw { code: 11000 }; created.push(input); return input; },
};
const file = path.resolve(__dirname, '../dist/lib/bootstrapSuperAdmin.js');
const moduleStub = { exports: {} };
vm.runInNewContext(`(function(require,module,exports){${fs.readFileSync(file, 'utf8')}\n})`)(name => {
  if (name === '../models') return { User };
  if (name === 'bcryptjs') return { hash: async () => 'hashed-password' };
  return require(require.resolve(name, { paths: [path.dirname(file)] }));
}, moduleStub, moduleStub.exports);
(async () => {
  const { bootstrapSuperAdmin } = moduleStub.exports;
  const result = await bootstrapSuperAdmin('Owner@Example.com', 'UniqueSeedPassword123@');
  assert.equal(result.created, true);
  assert.equal(created[0].email, 'owner@example.com');
  assert.equal(created[0].role, 'SUPERADMIN');
  assert.equal(created[0].createdBy, null);
  assert.equal(created[0].passwordHash, 'hashed-password');
  assert.ok(created[0].emailVerifiedAt);
  await assert.rejects(() => bootstrapSuperAdmin('invalid', 'UniqueSeedPassword123@'));
  await assert.rejects(() => bootstrapSuperAdmin('owner@example.com', 'weak'));
  existing = { email: 'original@example.com' };
  const preserved = await bootstrapSuperAdmin('other@example.com', 'UniqueSeedPassword123@');
  assert.equal(preserved.email, existing.email);
  assert.equal(preserved.created, false);
  assert.equal(created.length, 1);
  existing = null; collision = true;
  await assert.rejects(() => bootstrapSuperAdmin('owner@example.com', 'UniqueSeedPassword123@'), /No account was promoted/);
  console.log('PASS: superadmin creation, credential validation, password hashing, existing-account preservation and email collision handling (mock database).');
})().catch(error => { console.error(error); process.exitCode = 1; });
