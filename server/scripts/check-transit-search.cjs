const assert = require('node:assert/strict');
const express = require('express');
const { TransitRoute } = require('../dist/models');
const { transitMunicipality } = require('../dist/lib/transitBoundary');
const auth = require('../dist/middleware/auth');
// The shared rate limiter has its own integration checks; keep this contract test offline.
require('../dist/middleware/security').rateLimit = () => (_req, _res, next) => next();
auth.authenticate = (req, res, next) => {
  if (!req.headers['x-test-user']) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = '0123456789abcdef01234567'; req.userRole = 'EXPLORER'; next();
};
const a = { name: 'Origin fixture', areaId: 'dagupan', lat: 16.043, lng: 120.334 };
const b = { name: 'Destination fixture', areaId: 'alaminos', lat: 16.156, lng: 119.981 };
assert.equal(transitMunicipality(a.lat, a.lng), a.areaId);
assert.equal(transitMunicipality(b.lat, b.lng), b.areaId);
let records = [
  { _id: 'b', name: 'Longer fixture', stopLocations: [a, a, b] },
  { _id: 'a', name: 'Direct fixture', stopLocations: [a, b] },
  { _id: 'c', name: 'Wrong boundary fixture', stopLocations: [a, { ...b, areaId: 'dagupan' }, b] },
];
TransitRoute.find = filter => {
  assert.equal(filter.status, 'ACTIVE'); assert.deepEqual(filter.verifiedAt, { $ne: null }); assert.equal(filter.sourceUrl.$regex, '^https?://');
  return { limit: () => ({ lean: async () => records }) };
};
const nativeFetch = global.fetch;
global.fetch = async () => { throw Error('Transit search must not call Python or any external service'); };
const app = express(); app.use(express.json()); app.use('/api/ai', require('../dist/routes/ai').default);
app.use((error, _req, res, _next) => res.status(error.status || 400).json({ error: error.message }));
const server = app.listen(0, '127.0.0.1', async () => {
  try {
    const call = (body, authenticated = true) => nativeFetch(`http://127.0.0.1:${server.address().port}/api/ai/transit/search`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { 'x-test-user': 'yes' } : {}) }, body: JSON.stringify(body) });
    const journey = { from: 'dagupan', to: 'alaminos' };
    assert.equal((await call(journey, false)).status, 401);
    assert.equal((await call({ ...journey, to: 'dagupan' })).status, 400);
    assert.equal((await call({ ...journey, from: { $ne: null } })).status, 400);
    const response = await call(journey); assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).routes.map(r => r.id), ['a', 'b']);
    assert.deepEqual((await (await call({ from: 'alaminos', to: 'dagupan' })).json()).routes, []);
    records = []; assert.deepEqual((await (await call(journey)).json()).routes, []);
    console.log('Transit search checks passed: authentication, input validation, source filters, boundaries, direction, stable ordering and no AI dependency.');
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { global.fetch = nativeFetch; server.close(); }
});
