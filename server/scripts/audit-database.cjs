// Read-only: never imports application models or creates indexes/collections.
const fs = require('node:fs')
const path = require('node:path')
const dotenv = require('dotenv')
const { MongoClient } = require('mongodb')
const root = path.resolve(__dirname, '../..')
const config = {}
for (const relative of ['.env', '.env.example', 'src/.env', 'server/.env', 'server/.env.example']) {
  const file = path.join(root, relative)
  if (!fs.existsSync(file)) continue
  const values = dotenv.parse(fs.readFileSync(file))
  if (relative === 'server/.env') Object.assign(config, values)
  for (const [key, value] of Object.entries(values)) {
    if (!key.includes('MONGODB_URI')) continue
    // Report only database names, never hosts, credentials or query parameters.
    const database = value.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/)?.[1]
    console.log(JSON.stringify({ file: relative, variable: key, database: database || '(default)' }))
  }
}
async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || config.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    let names = [client.db().databaseName]
    try {
      names = (await client.db('admin').admin().listDatabases({ nameOnly: true, authorizedDatabases: true })).databases.map(d => d.name)
    } catch { console.log('Database enumeration unavailable; auditing configured database only.') }
    for (const name of names.filter(n => n === 'multraverse' || n === client.db().databaseName || n.startsWith('multraverse_lgu_test_'))) {
      const db = client.db(name)
      for (const collection of await db.listCollections({}, { nameOnly: false }).toArray()) {
        if (collection.type !== 'collection') continue
        const count = await db.collection(collection.name).countDocuments({})
        const indexes = await db.collection(collection.name).listIndexes().toArray()
        console.log(JSON.stringify({ database: name, collection: collection.name, count, validator: collection.options?.validator || null, indexes: indexes.map(({ key, unique, expireAfterSeconds }) => ({ key, unique, expireAfterSeconds })) }))
      }
    }
  } finally { await client.close() }
}
main().catch(error => { console.error(`Read-only audit failed (${error.name}, code ${error.code || 'unavailable'}).`); process.exitCode = 1 })
