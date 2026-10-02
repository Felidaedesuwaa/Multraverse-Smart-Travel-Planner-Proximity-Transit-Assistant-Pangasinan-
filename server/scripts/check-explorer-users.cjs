// Isolated HTTP/query-contract tests; no production accounts or database writes.
const assert = require('node:assert/strict');
const express = require('express');
const { User, Trip } = require('../dist/models');
const { explorerPeriods } = require('../dist/lib/explorerUsers');
const auth = require('../dist/middleware/auth');
assert.equal(explorerPeriods(new Date('2026-10-04T16:00:00Z')).week.toISOString(), '2026-10-04T16:00:00.000Z');
assert.equal(explorerPeriods(new Date('2026-10-04T15:59:59Z')).week.toISOString(), '2026-09-27T16:00:00.000Z');
const accounts = [
  { _id: '000000000000000000000001', name: 'Explorer fixture', email: 'fixture@example.test', role: 'EXPLORER', emailVerifiedAt: new Date(), createdAt: new Date(), tripCount: 3 },
  { _id: '000000000000000000000002', name: 'Second fixture', email: 'second@example.test', role: 'EXPLORER', emailVerifiedAt: null, createdAt: new Date('2020-01-01'), tripCount: 0 },
  ...['PRO', 'ADMIN', 'LGU', 'SUPERADMIN'].map((role, i) => ({ _id: '00000000000000000000000' + (i + 3), name: role + ' fixture', role, email: role + '@example.test', tripCount: 20 })),
];
let calls = 0;
User.aggregate = async pipeline => {
  calls++;
  assert.deepEqual(pipeline[0], { $match: { role: 'EXPLORER' } }, 'Explorer scope must apply before search, pagination and statistics');
  const facet = pipeline[1].$facet;
  const scoped = accounts.filter(u => u.role === pipeline[0].$match.role);
  const match = facet.users.find(s => s.$match)?.$match;
  const regex = match && new RegExp(match.$or[0].name.$regex, 'i');
  const found = scoped.filter(u => !regex || regex.test(u.name) || regex.test(u.email));
  const skip = facet.users.find(s => s.$skip !== undefined).$skip;
  const limit = facet.users.find(s => s.$limit).$limit;
  assert.equal(facet.users.find(s => s.$lookup).$lookup.from, Trip.collection.collectionName);
  assert.deepEqual(facet.users.find(s => s.$lookup).$lookup.pipeline[0], { $match: { $expr: { $eq: ['$userId', '$$user'] } } });
  const fields = Object.keys(facet.users.find(s => s.$project).$project);
  assert.ok(!fields.includes('passwordHash')); assert.ok(!fields.includes('budgetSettings'));
  return [{ users: found.slice(skip, skip + limit), matching: [{ total: found.length }], summary: [{ total: scoped.length, verified: 1, newThisWeek: 1, newLastWeek: 0 }] }];
};
Trip.aggregate = async pipeline => {
  assert.equal(pipeline[0].$lookup.pipeline[0].$match.role, 'EXPLORER', 'Staff and Pro trips must be excluded');
  assert.deepEqual(pipeline[1], { $match: { 'explorer.0': { $exists: true } } });
  return [{ total: 3, completed: 2 }];
};
let legacyScope;
User.find = filter => { legacyScope = filter; const value = accounts.filter(a => !filter.role || a.role === filter.role); return { select() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } }; };
auth.authenticate = (req, _res, next) => { req.userId = accounts[0]._id; req.userRole = req.headers['x-role'] || 'ADMIN'; next(); };
const app = express(); app.use(express.json()); app.use('/api/users', require('../dist/routes/users').default);
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));
const server = app.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}/api/users`;
  const get = async (url = '/explorers', role = 'ADMIN') => { const response = await fetch(base + url, { headers: { 'x-role': role } }); return { status: response.status, body: await response.json() }; };
  try {
    for (const role of ['EXPLORER', 'PRO', 'LGU']) assert.equal((await get('/explorers', role)).status, 403);
    assert.equal(calls, 0);
    const all = await get(); assert.equal(all.status, 200);
    assert.deepEqual(all.body.users.map(u => u.role), ['EXPLORER', 'EXPLORER']);
    assert.equal(all.body.summary.total, 2); assert.equal(all.body.summary.totalTrips, 3); assert.equal(all.body.summary.verified, 1);
    assert.equal(all.body.users[0].tripCount, 3); assert.equal(all.body.users[1].tripCount, 0);
    assert.equal(all.body.users[0].id, accounts[0]._id); assert.equal(all.body.users[0]._id, undefined);
    const searched = await get('/explorers?search=Second'); assert.equal(searched.body.total, 1); assert.equal(searched.body.summary.total, 2);
    const literal = await get('/explorers?search=.*'); assert.equal(literal.body.total, 0, 'Search treats regex input as literal text');
    const page = await get('/explorers?page=2&limit=1'); assert.equal(page.body.users.length, 1); assert.equal(page.body.users[0].id, accounts[1]._id); assert.equal(page.body.total, 2);
    assert.equal((await get('/explorers?role=ADMIN')).status, 400);
    assert.equal((await get('/explorers?page=0')).status, 400);
    assert.equal((await get('/explorers?search=' + 'x'.repeat(121))).status, 400);
    assert.equal((await get('/explorers', 'SUPERADMIN')).status, 200);
    await get('/'); assert.deepEqual(legacyScope, { role: 'EXPLORER' });
    console.log('PASS: Explorer-only scope, real trip-count contract, filtered summary, literal search, pagination, role guards, safe fields and Manila week boundaries.');
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { server.close(); }
});
