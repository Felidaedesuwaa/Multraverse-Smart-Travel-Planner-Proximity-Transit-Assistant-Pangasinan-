// Isolated geometry and HTTP checks. No live database or device location is used.
const assert = require('node:assert/strict');
const express = require('express');
const { validateFence, transition, meters } = require('../dist/lib/geofence');
const { Geofence } = require('../dist/models');
const { GeofenceMonitor } = require('../dist/models/GeofenceMonitor');
const auth = require('../dist/middleware/auth');
const point = { lat: 16.043, lng: 120.333 };
const input = { location: 'Geometry test zone', zone: 'Transit stop', coordinates: point, radiusMeters: 100, radius: '100 m', coord: '16.043, 120.333', dwellSeconds: 30 };
assert.equal(validateFence(input), 'Dagupan');
for (const coordinates of [{ lat: 14.5995, lng: 120.9842 }, { lat: 16.42, lng: 120.59 }, { lat: 16.25, lng: 120.3 }, { lat: NaN, lng: 120 }]) assert.throws(() => validateFence({ ...input, coordinates }));
for (const radiusMeters of [0, 9, 10001, NaN]) assert.throws(() => validateFence({ ...input, radiusMeters }));
assert.throws(() => validateFence({ ...input, radiusMeters: 10000 }), /entire geofence/);
assert.equal(meters(point, point), 0);
let result = transition(undefined, 20, 5, 100, 30, 1000);
assert.equal(result.event, 'entry');
result = transition(result.state, 98, 10, 100, 30, 15000);
assert.equal(result.event, undefined, 'Ambiguous edge fix must not trigger exit');
result = transition(result.state, 20, 5, 100, 30, 31000);
assert.equal(result.event, undefined, 'An ambiguous fix must restart the dwell observation');
result = transition(result.state, 20, 5, 100, 30, 46000);
assert.equal(result.event, 'dwell');
result = transition(result.state, 20, 5, 100, 30, 47000);
assert.equal(result.event, undefined, 'Only one dwell per visit');
result = transition(result.state, 120, 5, 100, 30, 48000);
assert.equal(result.event, 'exit');
assert.equal(transition(result.state, 120, 5, 100, 30, 49000).event, undefined);

let now = Date.now();
const originalNow = Date.now;
Date.now = () => now;
const documents = new Map(), monitors = new Map();
function query(value) { return { sort() { return this; }, skip() { return this; }, limit() { return this; }, lean: async () => value.map ? value.map(v => v.toObject()) : value?.toObject(), then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } }; }
auth.authenticate = (req, _res, next) => { req.userId = req.headers['x-user'] || 'device-one'; req.userRole = req.headers['x-role'] || 'ADMIN'; next(); };
Geofence.find = filter => query([...documents.values()].filter(d => !filter.active || d.active && d.approvalStatus === 'approved' && !d.pendingDeletion));
Geofence.findById = id => Promise.resolve(documents.get(id));
Geofence.create = async body => { const doc = new Geofence({ ...body, createdAt: new Date(now), updatedAt: new Date(now) }); await doc.validate(); documents.set(String(doc._id), doc); return doc; };
Geofence.findByIdAndUpdate = async (id, body) => { const d = documents.get(id); d.set({ ...body, updatedAt: new Date(now) }); await d.validate(); return d; };
Geofence.findByIdAndDelete = async id => { const d = documents.get(id); documents.delete(id); return d; };
GeofenceMonitor.findOne = async f => monitors.get(f.userId);
GeofenceMonitor.create = async body => { const d = new GeofenceMonitor(body); d.save = async () => { monitors.set(d.userId, d); return d; }; monitors.set(d.userId, d); return d; };
GeofenceMonitor.aggregate = async pipeline => {
  if (pipeline[0].$unwind) return [...monitors.values()].flatMap(m => m.events.map(e => e.toObject())).sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
  const counts = new Map(); for (const m of monitors.values()) for (const [id, n] of m.counts) counts.set(id, (counts.get(id) || 0) + n);
  return [...counts].map(([_id, total]) => ({ _id, total }));
};
const app = express(); app.use(express.json()); app.use('/api/geofences', require('../dist/routes/geofences').default);
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));
const server = app.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}/api/geofences`;
  async function call(path, method = 'GET', body, role = 'ADMIN', user = 'device-one') {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', 'x-role': role, 'x-user': user }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: res.status, data: await res.json() };
  }
  async function fix(point = input.coordinates, advance = 5000, accuracy = 5) { now += advance; return call('/track', 'POST', { ...point, accuracy, timestamp: now }, 'EXPLORER'); }
  try {
    assert.equal((await call('', 'POST', input, 'EXPLORER')).status, 403);
    assert.equal((await call('', 'POST', { ...input, alerts: 500 })).status, 400);
    assert.equal((await call('', 'POST', { ...input, coordinates: { lat: 14.6, lng: 121 } })).status, 400);
    const created = await call('', 'POST', input); assert.equal(created.status, 201, JSON.stringify(created.data));
    const id = created.data.id;
    assert.equal((await call('/track', 'POST', { ...point, accuracy: 5, timestamp: now - 31000 }, 'EXPLORER')).status, 400);
    assert.equal((await call('/' + id, 'PUT', { $set: { active: true } })).status, 400);
    assert.equal((await call('/' + id, 'PUT', { radiusMeters: 10000 })).status, 400);
    assert.equal((await fix()).data.events[0].type, 'entry');
    assert.equal((await call('/track', 'POST', { ...point, accuracy: 5, timestamp: now }, 'EXPLORER')).status, 409);
    assert.equal((await fix(point, 5000, 200)).status, 400);
    for (let i = 0; i < 4; i++) assert.equal((await fix()).data.events.length, 0);
    assert.equal((await fix()).data.events[0].type, 'dwell');
    assert.equal((await fix()).data.events.length, 0);
    assert.equal((await fix({ lat: 16.043, lng: 120.336 })).data.events[0].type, 'exit');
    assert.equal((await fix({ lat: 14.6, lng: 121 })).data.insideProvince, false);
    assert.equal((await fix()).data.events[0].type, 'entry');
    assert.equal((await fix(point, 40000)).data.events[0].type, 'entry', 'Tracking gaps must reset dwell');
    assert.equal((await call('/events', 'GET', undefined, 'EXPLORER')).status, 403);
    assert.equal((await call('/' + id, 'PUT', { active: false })).status, 200);
    assert.equal((await fix()).data.events.length, 0);
    assert.equal((await call('/' + id, 'PUT', { active: true })).status, 200);
    const other = await call('/track', 'POST', { ...point, accuracy: 5, timestamp: now }, 'EXPLORER', 'device-two');
    assert.equal(other.data.events[0].type, 'entry', 'Devices must have independent state');
    const rows = (await call('')).data; assert.equal(rows.length, 1); assert.equal(rows[0].alerts, 6);
    assert.equal((await call('/events')).data.length, 6);
    documents.get(id).approvalStatus = 'pending';
    assert.equal((await fix()).data.events.length, 0, 'Unpublished zones cannot monitor');
    assert.equal((await call('/' + id, 'DELETE')).status, 200);
    assert.equal((await call('')).data.length, 0);
    assert.equal((await call('/events')).data.length, 6, 'Deleting a zone must preserve event history');
    console.log('PASS: Pangasinan boundaries, circle containment, entry/exit/dwell, GPS uncertainty, role guards, duplicate fixes, gaps, independent devices, persisted counts, CRUD and event history.');
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { Date.now = originalNow; server.close(); }
});
