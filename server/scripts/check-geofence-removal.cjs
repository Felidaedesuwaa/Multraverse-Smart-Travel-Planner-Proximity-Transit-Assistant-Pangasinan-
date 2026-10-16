const assert = require('node:assert/strict');
const { removeGeofences } = require('./remove-geofences.cjs');
async function main() {
  const collections = new Map([['users', 12], ['places', 200], ['geofences', 7], ['geofencemonitors', 3], ['auditlogs', 10]]);
  const dropped = [];
  const db = {
    databaseName: 'isolated_check',
    listCollections: () => ({ toArray: async () => [...collections.keys()].map(name => ({ name })) }),
    collection: name => ({ countDocuments: async () => collections.get(name) }),
    dropCollection: async name => { dropped.push(name); collections.delete(name); },
  };
  assert.deepEqual((await removeGeofences(db)).collections, { geofences: 7, geofencemonitors: 3 });
  assert.equal(dropped.length, 0, 'Dry run makes no changes');
  await assert.rejects(removeGeofences(db, { apply: true, databaseName: 'wrong_database' }));
  assert.equal(dropped.length, 0, 'Wrong database cannot drop collections');
  await removeGeofences(db, { apply: true, databaseName: db.databaseName });
  assert.deepEqual(dropped, ['geofences', 'geofencemonitors']);
  assert.deepEqual([...collections.entries()], [['users', 12], ['places', 200], ['auditlogs', 10]]);
  assert.deepEqual((await removeGeofences(db, { apply: true, databaseName: db.databaseName })).dropped, [], 'Repeated removal is safe');
  console.log('PASS: removal dry run, exact database guard, both retired collections, unrelated data preservation, and idempotence.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
