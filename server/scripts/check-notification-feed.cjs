// Exercise the real feed against in-memory queries, with no database changes.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const owner = 'a'.repeat(24), other = 'b'.repeat(24), referenced = 'c'.repeat(24);
const date = new Date('2026-10-05T00:00:00Z');
function matches(row, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(part => matches(row, part));
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('$exists' in value) return (row[key] !== undefined) === value.$exists;
      if ('$in' in value) return value.$in.includes(String(row[key]));
    }
    return String(row[key]) === String(value);
  });
}
const model = rows => ({ find: filter => {
  let result = rows.filter(row => matches(row, filter));
  const query = { sort: () => query, select: () => query, limit: count => { result = result.slice(0, count); return query; }, lean: async () => result };
  return query;
} });
const review = (id, status, submittedBy, extra = {}) => ({ _id: id, name: `Private draft ${id}`, approvalStatus: status, submittedBy, submittedAt: date, updatedAt: date, reviewRevision: 1, rejectionReason: status === 'rejected' ? 'Private rejection reason' : undefined, ...extra });
const mocks = {
  '../middleware/auth': { authenticate: (_req, _res, next) => next() },
  '../models': {
    AuditLog: model([{ _id: 'secret-owner', targetUser: owner, action: 'password_changed', createdAt: date }, { _id: 'secret-other', targetUser: other, action: 'password_reset', createdAt: date }]),
    BudgetEntry: model([{ _id: 'expense-owner', userId: owner, label: 'Bus fare', amount: 50, createdAt: date }, { _id: 'expense-other', userId: other, label: 'Other private expense', amount: 500, createdAt: date }]),
    Trip: model([{ userId: owner, plan: { guided: { stops: [{ entryId: referenced }] } } }]),
  },
  '../lib/lguResources': { lguResources: { places: { model: model([
    review('approved', 'approved', other, { name: 'Published destination' }),
    review('own-pending', 'pending', owner), review('own-rejected', 'rejected', owner),
    review(referenced, 'pending', other), review('unrelated-pending', 'pending', other),
  ]) } } },
};
const file = path.resolve(__dirname, '../dist/routes/notifications.js'), moduleValue = { exports: {} };
vm.runInThisContext(`(function(require,module,exports){${fs.readFileSync(file, 'utf8')}\n})`, { filename: file })(name => mocks[name] || require(name), moduleValue, moduleValue.exports);
const route = moduleValue.exports.default.stack.find(layer => layer.route?.path === '/').route.stack[0].handle;
const feed = async (userId, userRole = 'EXPLORER') => { let result; await route({ userId, userRole }, { json: value => { result = value; } }); return result; };
(async () => {
  const first = await feed(owner);
  assert(first.some(item => item.type === 'password' && item.screen === 'PasswordRecovery'));
  assert(first.some(item => item.type === 'expense' && item.message.includes('Bus fare')));
  assert(!JSON.stringify(first).includes('Other private expense') && !JSON.stringify(first).includes('secret-other'));
  assert(first.some(item => item.title === 'Review ongoing'));
  assert(first.some(item => item.title === 'Review approved'));
  assert(first.some(item => item.title === 'Review rejected' && item.message.includes('Private rejection reason')));
  assert(!first.some(item => item.id.includes('unrelated-pending')));
  const linked = first.find(item => item.id.includes(referenced));
  assert(linked && !linked.message.includes('Private draft'), 'Travelers see review state without unpublished draft content');
  const unrelated = await feed('d'.repeat(24));
  assert.equal(unrelated.length, 1); assert.equal(unrelated[0].title, 'Review approved');
  const admin = await feed('d'.repeat(24), 'ADMIN');
  assert(admin.some(item => item.id.includes('unrelated-pending')), 'Admins see the ongoing review queue');
  assert(!admin.some(item => item.type === 'password' || item.type === 'expense'), 'Admin privileges never expose another user’s private notices');
  console.log('PASS: private password/expense ownership, approved updates, owned and linked pending/rejected reviews, hidden draft content, and Admin queue access.');
})().catch(error => { console.error(error); process.exitCode = 1; });
