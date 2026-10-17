// Real route handlers with in-memory persistence; no account or database writes.
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), express = require('express');
const records = [], queries = [];
const matches = (row, filter) => Object.entries(filter).every(([key, value]) => value && typeof value === 'object' && '$ne' in value ? row[key] !== value.$ne : row[key] === value);
const SavedPlace = {
  create: async data => { const row = { _id: String(records.length + 1), ...data }; records.push(row); return row; },
  find: filter => { queries.push(filter); return { sort() { return this; }, skip() { return this; }, limit() { return Promise.resolve(records.filter(row => matches(row, filter))); } }; },
  findOneAndUpdate: async (filter, update) => { const row = records.find(row => matches(row, filter)); if (!row) return null; Object.assign(row, update.$set); row.reviewRevision += update.$inc.reviewRevision; return row; },
};
const mocks = {
  '../models': { SavedPlace, Place: { find: () => ({ select() { return this; }, limit: async () => [] }) } },
  '../models/_moderation': { publishedFilter: {} },
  '../middleware/auth': { authenticate: (req, res, next) => { req.userId = 'owner'; next(); } },
  '../middleware/input': { sanitizeRequest: (req, res, next) => next(), validateRouter: () => (req, res, next) => next(), validateId: (req, res, next) => next(), pagination: () => ({ skip: 0, limit: 200 }) },
};
const mod = { exports: {} };
vm.runInThisContext(`(function(require,module,exports){${fs.readFileSync(require.resolve('../dist/routes/places'), 'utf8')}\n})`)(name => mocks[name] || require(name), mod, mod.exports);
const app = express(); app.use(express.json()); app.use('/places', mod.exports.default);
let server;
(async () => {
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const call = async (path = '', method = 'GET', body) => { const response = await fetch(`http://127.0.0.1:${server.address().port}/places${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }); assert(response.ok); return response.json(); };
  for (const isPublic of [true, false]) {
    const row = await call('', 'POST', { name: 'Experience', category: 'Beach', isPublic, approvalStatus: 'approved' });
    assert.equal(row.approvalStatus, 'pending', 'Server controls moderation even if input attempts to approve');
    assert.equal(row.reviewRevision, 0);
  }
  assert.equal((await call('/public')).length, 0, 'New posts are invisible to other users');
  assert.equal((await call()).length, 2, 'Owner can track pending posts');
  records.forEach(row => row.approvalStatus = 'approved');
  assert.deepEqual((await call('/public')).map(row => row._id), ['1'], 'Approval never publishes private posts');
  await call('/1', 'PUT', { description: 'Edited experience', approvalStatus: 'approved' });
  assert.equal(records[0].approvalStatus, 'pending'); assert.equal(records[0].reviewRevision, 1);
  assert.equal((await call('/public')).length, 0, 'Edits require a new admin decision');
  records.push({ _id: 'legacy', isPublic: true }, { _id: 'rejected', isPublic: true, approvalStatus: 'rejected' });
  assert.equal((await call('/public')).length, 0, 'Missing or rejected approval never counts as published');
  console.log('PASS: pending public/private submissions, owner tracking, approved public visibility, private isolation, edit review and unapproved exclusion.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server?.close());
