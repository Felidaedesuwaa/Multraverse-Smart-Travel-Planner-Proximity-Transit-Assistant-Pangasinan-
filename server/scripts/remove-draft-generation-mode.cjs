// Remove only the redundant top-level column, preserving the itinerary snapshot.
const path = require('node:path')
const { MongoClient } = require('mongodb')
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true })
async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  try {
    await client.connect()
    const db = client.db()
    const apply = process.argv.includes('--apply')
    if (apply && !process.argv.includes(`--database=${db.databaseName}`)) throw new Error('Exact database name required')
    const [info] = await db.listCollections({ name: 'plannerdrafts' }).toArray()
    const validator = structuredClone(info?.options?.validator)
    if (!validator?.$jsonSchema?.properties) throw new Error('Expected existing collection validator')
    delete validator.$jsonSchema.properties.generationMode
    if (validator.$jsonSchema.required) validator.$jsonSchema.required = validator.$jsonSchema.required.filter(field => field !== 'generationMode')
    const collection = db.collection('plannerdrafts')
    const invalid = await collection.aggregate([{ $unset: 'generationMode' }, { $match: { $nor: [validator] } }, { $count: 'count' }]).toArray()
    if (invalid.length) throw new Error('Proposed documents violate the remaining validator')
    console.log(`Validated removal from ${await collection.countDocuments({ generationMode: { $exists: true } })} drafts.`)
    if (!apply) return
    const result = await collection.updateMany({ generationMode: { $exists: true } }, { $unset: { generationMode: '' } })
    await db.command({ collMod: 'plannerdrafts', validator, validationLevel: info.options.validationLevel || 'strict', validationAction: info.options.validationAction || 'error' })
    if (await collection.countDocuments({ generationMode: { $exists: true } })) throw new Error('An older backend is still writing the removed field')
    console.log(`Removed generationMode from ${result.modifiedCount} drafts and the database validator.`)
  } finally { await client.close() }
}
main().catch(error => { console.error(`Field removal failed (${error.codeName || error.name}).`); process.exitCode = 1 })
