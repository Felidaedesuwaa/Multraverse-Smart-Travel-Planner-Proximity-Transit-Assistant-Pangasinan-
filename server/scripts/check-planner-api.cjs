// HTTP contract checks with isolated in-memory repositories; no production writes.
const assert = require('node:assert/strict');
const express = require('express');
const models = require('../dist/models');
const { PlannerDraft } = require('../dist/models/PlannerDraft');
const { AISettings } = require('../dist/models/AISettings');
const { buildPlan } = require('../dist/lib/planner');
const id = n => String(n).padStart(24, '0');
const request = { origin: { areaId: 'dagupan' }, destinations: [{ areaId: 'alaminos', placeIds: [] }], dates: { start: '2027-01-04' }, startTime: '08:00', days: 1, budget: 1000, travelers: 1, preferences: [], transportModes: ['bus'], pace: 'balanced', lodging: { preference: 'none', nightlyBudget: 0, rooms: 1 }, foodPerPersonPerDay: 100, useSavedPlaces: false, returnToOrigin: false, excludedPlaceIds: [] };
const place = { _id: id(1), name: 'Fixture Garden', municipality: 'Alaminos', description: 'Explore the garden and enjoy its shade.', location: 'Alaminos' };
const plan = buildPlan(request, { places: [place], fares: [], routes: [], saved: [], foods: [], geofences: [] });
const query = value => ({ lean: async () => value, select() { return this; }, sort() { return this; }, limit() { return this; }, populate: async () => value, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
models.User.findById = () => query({ location: 'Dagupan' });
for (const key of ['Place', 'RoutePrice', 'TransitRoute', 'LocalFood', 'SavedPlace', 'Geofence']) models[key].find = () => query(key === 'Place' ? [place] : []);
let controls = { itineraryNarrative: false, translation: true };
AISettings.findById = () => query(controls);
AISettings.findByIdAndUpdate = async (_id, update) => (controls = { ...controls, ...update.$set });
const drafts = new Map();
PlannerDraft.create = async ({ userId, plan, expiresAt }) => { const draft = { _id: id(50), userId, plan, expiresAt, markModified() {}, async save() {} }; drafts.set(id(50), draft); return draft; };
PlannerDraft.findOne = async filter => { const draft = drafts.get(filter._id); return draft?.userId === filter.userId && draft.expiresAt > filter.expiresAt.$gt ? draft : null; };
models.Trip.findOne = () => query(null);
const nativeFetch = global.fetch;
let modelCalls = 0, failModel = false;
global.fetch = async (url, options) => {
  if (String(url).endsWith('/narrative')) {
    modelCalls++;
    if (failModel) throw new Error('Simulated service outage');
    return { ok: true, json: async () => ({ days: [{ day: 1, stops: [{ placeId: id(1), text: 'A fake fare is 100 pesos.' }, { placeId: id(999), text: 'Unexpected stop' }] }] }) };
  }
  return nativeFetch(url, options);
};
const app = express(); app.use(express.json());
app.use((req, _res, next) => { req.userId = req.headers['x-test-user'] || id(100); req.userRole = req.headers['x-test-role'] || 'USER'; next(); });
app.use('/api/ai', require('../dist/routes/planner').default);
app.use((error, _req, res, _next) => res.status(500).json({ error: error.message }));
const server = app.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}/api/ai`;
  const call = (path, body, headers = {}, method = 'POST') => nativeFetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, ...(method !== 'GET' ? { body: JSON.stringify(body) } : {}) });
  try {
    assert.equal((await call('/settings', { itineraryNarrative: false })).status, 404);
    assert.equal((await call('/settings', { itineraryNarrative: false }, {}, 'PUT')).status, 403);
    assert.equal((await call('/itinerary', { ...request, budget: -1 })).status, 400);
    const response = await call('/itinerary', request); assert.equal(response.status, 200);
    const generated = await response.json(); assert.equal(generated.days[0].stops[0].placeId, id(1));
    assert.equal((await call(`/planner/${id(50)}/narrative`, {}, { 'x-test-user': id(101) })).status, 404);
    const disabled = await (await call(`/planner/${id(50)}/narrative`, {})).json();
    assert.equal(disabled.narrativeStatus, 'disabled-by-admin'); assert.equal(modelCalls, 0);
    assert.equal((await call(`/planner/${id(50)}/save`, {})).status, 400, 'Incomplete costs need acknowledgement');
    await call('/settings', { itineraryNarrative: true }, { 'x-test-role': 'ADMIN' }, 'PUT');
    const enriched = await (await call(`/planner/${id(50)}/narrative`, {})).json();
    assert.equal(enriched.mode, 'database'); assert.equal(enriched.days[0].stops[0].narrative, null);
    assert.deepEqual(enriched.costs, generated.costs, 'Model output cannot alter arithmetic');
    failModel = true;
    const fallback = await (await call(`/planner/${id(50)}/narrative`, {})).json();
    assert.equal(fallback.narrativeStatus, 'offline-or-timeout'); assert.equal(fallback.days.length, 1);
    const count = modelCalls;
    assert.equal((await (await call(`/planner/${id(50)}/narrative`, {})).json()).narrativeStatus, 'service-cooling-down');
    assert.equal(modelCalls, count);
    console.log('PASS: HTTP validation, owner isolation, admin enforcement, incomplete-save acknowledgement, hallucinated-text rejection, outage fallback and circuit cooldown.');
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { global.fetch = nativeFetch; server.close(); }
});
