const assert = require('node:assert/strict');
const { locationSuggestions, searchLocations } = require('../dist/lib/locations');
const express = require('express');
const jwt = require('jsonwebtoken');
const route = require('../dist/routes/locations').default;
const realFetch = global.fetch;
const payload = { features: [
  { properties: { name: 'Dagupan', city: 'Dagupan', county: 'Pangasinan', country: 'Philippines', osm_id: 1, osm_type: 'R' } },
  { properties: { name: 'Dagupan', county: 'Pangasinan', country: 'Philippines' } },
  { properties: { name: 'x'.repeat(121) } },
  {}, null,
] };
assert.deepEqual(locationSuggestions(payload).map(p => p.label), ['Dagupan, Pangasinan, Philippines']);
assert.throws(() => locationSuggestions({}));
let calls = 0;
global.fetch = async url => {
  calls++;
  assert.equal(url.searchParams.get('limit'), '6');
  if (url.searchParams.get('q') === 'unavailable') throw new Error('offline');
  return { ok: true, json: async () => payload };
};
const app = express(); app.use('/api/locations', route);
const server = app.listen(0, '127.0.0.1');
const originalSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'isolated-location-test-secret';
(async () => {
  try {
    await Promise.all([searchLocations('Dagupan'), searchLocations('Dagupan')]);
    await searchLocations('dagupan'); assert.equal(calls, 1, 'Cache and concurrent requests reuse one provider request');
    if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/locations/search`;
    const headers = { Authorization: `Bearer ${jwt.sign({ userId: 'isolated-test', role: 'EXPLORER' }, process.env.JWT_SECRET)}` };
    assert.equal((await realFetch(`${base}?q=Dagupan`)).status, 401);
    for (const query of ['', 'ab', 'x'.repeat(121)]) assert.equal((await realFetch(`${base}?q=${query}`, { headers })).status, 400);
    const found = await realFetch(`${base}?q=Dagupan`, { headers });
    assert.equal(found.status, 200); assert.equal((await found.json()).results.length, 1);
    assert.equal((await realFetch(`${base}?q=unavailable`, { headers })).status, 503);
    console.log('PASS: location authentication, query validation, readable labels, deduplication, shared cache, and provider failure handling.');
  } finally {
    global.fetch = realFetch;
    if (originalSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalSecret;
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
