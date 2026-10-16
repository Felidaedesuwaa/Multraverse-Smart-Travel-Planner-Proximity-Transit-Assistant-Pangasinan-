// Exercise the counts endpoint through Express with in-memory models and no database writes.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const express = require('express');
const resources = ['places', 'foods', 'route-prices', 'transit-routes'];
const queries = [];
let fail = false, server;
const rows = Object.fromEntries(resources.map((resource, i) => [resource, [
  ...Array.from({ length: i === 0 ? 220 : i }, (_, j) => ({ approvalStatus: 'pending', pendingDeletion: j === 0 })),
  { approvalStatus: 'approved' }, { approvalStatus: 'rejected' }, {},
]]));
const lguResources = Object.fromEntries(resources.map(resource => [resource, { model: {
  countDocuments: async filter => { queries.push({ resource, filter }); if (fail && resource === 'foods') throw Error('Database unavailable'); return rows[resource].filter(row => row.approvalStatus === filter.approvalStatus).length; },
} }]));
const mocks = {
  '../middleware/auth': {
    authenticate: (req, res, next) => req.headers['x-test-role'] ? (req.userRole = req.headers['x-test-role'], next()) : res.status(401).json({ error: 'Sign in required' }),
    requireAdmin: (req, res, next) => ['ADMIN', 'SUPERADMIN'].includes(req.userRole) ? next() : res.status(403).json({ error: 'Admin required' }),
  },
  '../middleware/input': { sanitizeRequest: (_req, _res, next) => next(), validateRouter: () => (_req, _res, next) => next(), validateId: (_req, _res, next) => next() },
  '../models': {}, '../lib/lguResources': { lguResources },
};
const file = path.resolve(__dirname, '../dist/routes/approvals.js'), mod = { exports: {} };
vm.runInThisContext(`(function(require,module,exports){${fs.readFileSync(file, 'utf8')}\n})`, { filename: file })(name => mocks[name] || require(name), mod, mod.exports);
const app = express(); app.use('/api/admin/approvals', mod.exports.default);
app.use((_error, _req, res, _next) => res.status(500).json({ error: 'Unavailable' }));
(async () => {
  server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  const call = async (role, endpoint = 'counts') => { const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/approvals/${endpoint}`, { headers: role ? { 'x-test-role': role } : {} }); return { status: response.status, body: await response.json() }; };
  assert.equal((await call()).status, 401);
  for (const role of ['EXPLORER', 'LGU']) assert.equal((await call(role)).status, 403);
  assert.equal(queries.length, 0, 'Unauthorized requests cannot count submissions');
  for (const role of ['ADMIN', 'SUPERADMIN']) {
    const result = await call(role); assert.equal(result.status, 200);
    assert.deepEqual(result.body, { counts: { places: 220, foods: 1, 'route-prices': 2, 'transit-routes': 3 }, total: 226 });
  }
  assert(queries.every(query => JSON.stringify(query.filter) === '{"approvalStatus":"pending"}'), 'Only pending submissions are counted, including deletion requests');
  assert.equal((await call('ADMIN', 'unknown')).status, 404, 'Resource validation stays intact');
  fail = true; assert.equal((await call('ADMIN')).status, 500, 'A failed category never returns misleading partial counts'); fail = false;
  for (const resource of resources) rows[resource] = [];
  const empty = await call('ADMIN'); assert.equal(empty.status, 200); assert.equal(empty.body.total, 0); assert(Object.values(empty.body.counts).every(count => count === 0));
  console.log('PASS: protected approval counts across all four categories, pending-only totals beyond pagination limits, pending deletion requests, empty queues, unknown resources, and failure handling.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server?.close());
