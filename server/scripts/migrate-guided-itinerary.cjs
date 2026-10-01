// Add only the optional guided snapshot to existing plan validators. No data changes.
const path = require('node:path')
const { MongoClient } = require('mongodb')
const { jsonSchema } = require('./database-rules.cjs')
const { guidedPlanSchema } = require('../dist/models/_guidedPlan')
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true })
async function main() {
  const apply = process.argv.includes('--apply')
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  try {
    await client.connect()
    const db = client.db()
    if (apply && !process.argv.includes(`--database=${db.databaseName}`)) throw new Error('Apply requires --database=EXACT_NAME')
    for (const name of ['plannerdrafts', 'trips']) {
      const [info] = await db.listCollections({ name }).toArray()
      const validator = structuredClone(info?.options?.validator)
      if (!validator?.$jsonSchema?.properties?.plan?.properties) throw new Error(`${name}: expected existing plan validator`)
      validator.$jsonSchema.properties.plan.properties.guided = { ...jsonSchema(guidedPlanSchema), bsonType: ['object', 'null'] }
      const invalid = await db.collection(name).countDocuments({ $nor: [validator] })
      if (invalid) throw new Error(`${name}: existing records violate proposed validator`)
      console.log(`${name}: optional guided snapshot validated; existing documents unchanged`)
      if (apply) await db.command({ collMod: name, validator, validationLevel: info.options.validationLevel || 'strict', validationAction: info.options.validationAction || 'error' })
    }
    console.log(apply ? 'Guided itinerary validators applied.' : 'Dry run complete; use --apply --database=EXACT_NAME to apply.')
  } finally { await client.close() }
}
main().catch(error => { console.error(`Migration failed: ${error.codeName || error.name}: ${error.message.replace(/mongodb[^ ]+/g, '[redacted]')}`); process.exitCode = 1 })
