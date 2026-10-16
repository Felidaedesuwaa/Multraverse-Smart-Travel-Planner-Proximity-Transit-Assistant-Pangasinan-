// Dry run by default. Apply only to the explicitly named configured database.
const assert = require('node:assert/strict');
const path = require('node:path');
const { MongoClient } = require('mongodb');
const retiredCollections = ['geofences', 'geofencemonitors'];

async function removeGeofences(db, { apply = false, databaseName } = {}) {
  if (apply) assert.equal(databaseName, db.databaseName, 'Exact configured database name required for removal');
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const targets = collections.filter(collection => retiredCollections.includes(collection.name));
  const counts = Object.fromEntries(await Promise.all(targets.map(async ({ name }) => [name, await db.collection(name).countDocuments({})])));
  const report = { database: db.databaseName, apply, collections: counts, dropped: [] };
  if (!apply) return report;
  for (const { name } of targets) {
    try { await db.dropCollection(name); }
    catch (error) { if (error.code !== 26) throw error; }
    report.dropped.push(name);
  }
  const remaining = await db.listCollections({}, { nameOnly: true }).toArray();
  assert(!remaining.some(collection => retiredCollections.includes(collection.name)), 'Retired collections were recreated; stop the older backend before retrying');
  for (const { name } of collections.filter(collection => !retiredCollections.includes(collection.name))) {
    assert(remaining.some(collection => collection.name === name), `Unrelated collection missing: ${name}`);
  }
  return report;
}

async function main() {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    console.log(JSON.stringify(await removeGeofences(client.db(), {
      apply: process.argv.includes('--apply'),
      databaseName: process.argv.find(argument => argument.startsWith('--database='))?.slice('--database='.length),
    }), null, 2));
  } finally { await client.close(); }
}
if (require.main === module) main().catch(error => {
  // Raw connection errors may include credentials or private hosts.
  console.error(`Geofence removal failed (${error.codeName || error.name}).`);
  process.exitCode = 1;
});
module.exports = { removeGeofences };
