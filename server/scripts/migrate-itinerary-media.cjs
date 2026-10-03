// Extend existing validators only; leave stored records and unrelated rules intact.
const path = require('node:path')
const { MongoClient } = require('mongodb')
const { jsonSchema } = require('./database-rules.cjs')
const { Place, LocalFood } = require('../dist/models')
const { guidedPlanSchema } = require('../dist/models/_guidedPlan')
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true })
async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  try {
    await client.connect()
    const db = client.db(), apply = process.argv.includes('--apply')
    if (apply && !process.argv.includes(`--database=${db.databaseName}`)) throw new Error('Apply requires --database=EXACT_NAME')
    for (const [name, model] of [[Place.collection.name, Place], [LocalFood.collection.name, LocalFood], ['trips'], ['plannerdrafts']]) {
      const [info] = await db.listCollections({ name }).toArray()
      const validator = structuredClone(info?.options?.validator)
      if (!validator?.$jsonSchema?.properties) throw new Error(`${name}: expected existing validator`)
      if (model) validator.$jsonSchema.properties.photo = jsonSchema(model.schema).properties.photo
      else {
        if (!validator.$jsonSchema.properties.plan?.properties) throw new Error(`${name}: expected plan validator`)
        validator.$jsonSchema.properties.plan.properties.guided = { ...jsonSchema(guidedPlanSchema), bsonType: ['object', 'null'] }
      }
      if (await db.collection(name).countDocuments({ $nor: [validator] })) throw new Error(`${name}: existing documents violate proposed validator`)
      if (apply) await db.command({ collMod: name, validator, validationLevel: info.options.validationLevel || 'strict', validationAction: info.options.validationAction || 'error' })
      console.log(`${name}: ${apply ? 'applied' : 'validated (dry run)'}`)
    }
  } finally { await client.close() }
}
main().catch(error => { console.error(`Migration failed: ${error.message.replace(/mongodb[^ ]+/g, '[redacted]')}`); process.exitCode = 1 })
