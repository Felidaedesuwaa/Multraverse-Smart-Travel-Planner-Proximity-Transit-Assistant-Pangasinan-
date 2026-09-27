// Run from server/: node scripts/remove-retired-tourism.cjs [--apply]
// Seed selected guides first to retain IDs for overlapping catalog entries.
require('dotenv/config')
const { MongoClient, ObjectId } = require('mongodb')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { resolve } = require('node:path')
const retired = require('./retired-tourism-ids.json')
const guides = require('../src/data/cityGuides.json')
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })

async function main() {
  assert.deepEqual(guides.map(g => g.area_id).sort(), ['alaminos', 'bolinao', 'dagupan', 'lingayen', 'manaoag', 'san-carlos', 'urdaneta'])
  await client.connect()
  const db = client.db()
  assert.equal(db.databaseName, 'multraverse', 'Refusing an unexpected database')
  const legacy = /See Pangasinan PDF snapshot/
  const ids = Object.fromEntries(Object.entries(retired).map(([k, values]) => [k, values.map(id => new ObjectId(id))]))
  const collections = await db.listCollections({}, { nameOnly: true }).toArray()
  const protectedNames = collections.map(c => c.name).filter(n => !['tourismknowledge', 'places', 'localfoods'].includes(n))
  const before = Object.fromEntries(await Promise.all(protectedNames.map(async n => [n, await db.collection(n).countDocuments()])) )
  console.log(JSON.stringify({ database: db.databaseName,
    tourismknowledge: collections.some(c => c.name === 'tourismknowledge') ? await db.collection('tourismknowledge').countDocuments() : 0,
    retiredPlaces: await db.collection('places').countDocuments({ _id: { $in: ids.places }, description: legacy }),
    retiredFoods: await db.collection('localfoods').countDocuments({ _id: { $in: ids.localfoods }, description: legacy }),
    apply: process.argv.includes('--apply') }, null, 2))
  if (!process.argv.includes('--apply')) return
  const seed = spawnSync(process.execPath, ['-r', 'ts-node/register', 'seeds/seedCityGuides.ts'], { cwd: resolve(__dirname, '..'), stdio: 'inherit' })
  assert.equal(seed.status, 0, 'Guide seeding failed; collection drop refused')
  // Exact importer IDs plus source text prevent deletion of independent records.
  const places = await db.collection('places').deleteMany({ _id: { $in: ids.places }, description: legacy })
  const foods = await db.collection('localfoods').deleteMany({ _id: { $in: ids.localfoods }, description: legacy })
  assert.equal(await db.collection('places').countDocuments({ description: legacy }), 0, 'Unexpected legacy places need review')
  assert.equal(await db.collection('localfoods').countDocuments({ description: legacy }), 0, 'Unexpected legacy foods need review')
  if (collections.some(c => c.name === 'tourismknowledge')) await db.dropCollection('tourismknowledge')
  assert.equal((await db.listCollections({ name: 'tourismknowledge' }).toArray()).length, 0)
  for (const [name, count] of Object.entries(before)) assert.equal(await db.collection(name).countDocuments(), count, `${name} count changed`)
  for (const guide of guides) assert.ok(await db.collection('places').countDocuments({ areaId: guide.area_id }), `Missing catalog: ${guide.area_id}`)
  console.log(JSON.stringify({ collectionAbsent: 'tourismknowledge', removedPlaces: places.deletedCount,
    removedFoods: foods.deletedCount, retainedGuides: guides.map(g => g.name), otherCollectionsUnchanged: protectedNames }, null, 2))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => client.close())
