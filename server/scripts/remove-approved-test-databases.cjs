// Exact scope approved by the user after the database audit. No wildcard targets.
const { MongoClient } = require('mongodb')
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env'), quiet: true })
const targets = Object.freeze([
  'multraverse_lgu_test_57137a02d811d50b',
  'multraverse_lgu_test_a1d171e8ca73f3fd',
  'multraverse_lgu_test_f7276454a00f16e6',
])
const args = process.argv.slice(2)
if (args.length > 1 || args.some(a => !['--apply', '--dry-run'].includes(a))) throw new Error('Use --dry-run (default) or --apply')
const apply = args.includes('--apply')
async function assertEmpty(db) {
  const collections = await db.listCollections().toArray()
  for (const collection of collections) {
    if (collection.type !== 'collection') throw new Error(`Refusing unexpected collection type in ${db.databaseName}`)
    if (await db.collection(collection.name).findOne({}, { projection: { _id: 1 } })) throw new Error(`Refusing nonempty database: ${db.databaseName}`)
  }
  return collections.length
}
async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    // Check every target before the first drop, then recheck immediately before each drop.
    for (const name of targets) console.log(JSON.stringify({ database: name, collections: await assertEmpty(client.db(name)), empty: true, mode: apply ? 'apply' : 'dry-run' }))
    if (!apply) return
    for (const name of targets) {
      await assertEmpty(client.db(name))
      await client.db(name).dropDatabase()
      console.log(JSON.stringify({ database: name, dropped: true }))
    }
    const remaining = (await client.db('admin').admin().listDatabases({ nameOnly: true, authorizedDatabases: true })).databases.map(d => d.name)
    if (targets.some(name => remaining.includes(name))) throw new Error('A target database is still present after cleanup')
    console.log(JSON.stringify({ verifiedAbsent: targets, productionDatabasePresent: remaining.includes('multraverse') }))
  } finally { await client.close() }
}
main().catch(error => { console.error(`Approved cleanup stopped (${error.name}, code ${error.code || 'unavailable'}): ${error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[redacted]')}`); process.exitCode = 1 })
