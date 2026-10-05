// In-memory startup checks: no MongoDB connection or account changes.
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { Geofence } = require('../dist/models/Geofence');
const { GeofenceMonitor, prepareGeofenceStorage } = require('../dist/models/GeofenceMonitor');
const { collectionNames } = require('../dist/models/_collections');
const { verifyDatabaseLayout, DatabaseLayoutError, databaseStartupMessage } = require('../dist/lib/db');
const collections = new Map(Object.values(collectionNames).filter(name => name !== 'geofences').map(name => [name, { name, options: { validator: { $jsonSchema: {} } } }]));
const calls = [];
const originalDatabase = mongoose.connection.db;
const originalMethods = [Geofence, GeofenceMonitor].map(model => ({ model, createCollection: model.createCollection, createIndexes: model.createIndexes }));
let denyCreation = false;
mongoose.connection.db = {
  listCollections(filter) {
    const rows = [...collections.values()].filter(row => !filter?.name || row.name === filter.name);
    return { next: async () => rows[0] || null, toArray: async () => rows };
  },
  command: async command => { calls.push(['command', structuredClone(command)]); },
};
for (const { model } of originalMethods) {
  model.createCollection = async options => {
    calls.push(['create', model.collection.collectionName]);
    if (denyCreation && model === Geofence) throw Object.assign(new Error('mongodb+srv://private:credential@private-host'), { code: 13 });
    const name = model.collection.collectionName;
    if (!collections.has(name)) collections.set(name, { name, options: structuredClone(options) });
  };
  model.createIndexes = async () => { calls.push(['indexes', model.collection.collectionName]); };
}
(async () => {
  try {
    await assert.rejects(verifyDatabaseLayout(), error => error instanceof DatabaseLayoutError && error.message.includes('geofences'));
    const existing = structuredClone([...collections.values()]);
    await prepareGeofenceStorage();
    await verifyDatabaseLayout();
    assert(collections.has('geofences'), 'Startup repairs the absent required geofences collection');
    const validator = collections.get('geofences').options.validator.$jsonSchema;
    assert(validator.properties.dwellSeconds, 'New collections support the current dwell field');
    assert(validator.required.includes('location') && validator.required.includes('zone'));
    assert(calls.some(([action, name]) => action === 'indexes' && name === 'geofences'));
    for (const row of existing) assert.deepEqual(collections.get(row.name), row, 'Existing collections remain unchanged');
    calls.length = 0;
    await prepareGeofenceStorage(); await verifyDatabaseLayout();
    assert(!calls.some(([action, name]) => action === 'create' && name === 'geofences'), 'Repeated startup leaves existing geofences intact');
    assert(!calls.some(([action]) => action === 'command'), 'Current validators are not rewritten');
    const legacy = { $jsonSchema: { bsonType: 'object', additionalProperties: false, properties: { location: { bsonType: 'string' }, customField: { bsonType: 'number' } } } };
    collections.set('geofences', { name: 'geofences', options: { validator: structuredClone(legacy) } });
    calls.length = 0; await prepareGeofenceStorage();
    const migration = calls.find(([action]) => action === 'command')[1];
    assert.equal(migration.collMod, 'geofences');
    const expected = structuredClone(legacy);
    expected.$jsonSchema.properties.dwellSeconds = { bsonType: ['number', 'null'], minimum: 30, maximum: 86400 };
    assert.deepEqual(migration.validator, expected, 'Existing validator rules are preserved when adding dwell support');
    collections.delete('geofences'); denyCreation = true;
    await assert.rejects(prepareGeofenceStorage(), error => error.code === 13);
    assert(!collections.has('geofences'), 'Creation failures are not reported as healthy startup');
    const missing = new DatabaseLayoutError(['geofences']);
    assert(databaseStartupMessage(missing).includes('--create-missing-only'));
    assert(databaseStartupMessage({ code: 13 }).includes('permission'));
    for (const failure of [Object.assign(new Error('mongodb+srv://private:credential@private-host'), { name: 'MongoServerError', code: 85 }), null, { name: 'private credential' }]) {
      const message = databaseStartupMessage(failure);
      assert(!message.includes('mongodb') && !message.includes('credential') && !message.includes('private-host'), 'Startup logs never expose private connection details');
    }
    console.log('PASS: missing geofences startup recovery, validation/index setup, idempotence, preservation of existing collections, permission failures, and safe actionable diagnostics.');
  } finally {
    mongoose.connection.db = originalDatabase;
    for (const original of originalMethods) { original.model.createCollection = original.createCollection; original.model.createIndexes = original.createIndexes; }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
