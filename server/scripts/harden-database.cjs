// No drops, deletes, syncIndexes, or model initialization. Default execution is read-only.
const path = require('node:path')
const fs = require('node:fs')
const { isDeepStrictEqual } = require('node:util')
const mongoose = require('mongoose')
const { MongoClient } = require('mongodb')
const { jsonSchema, models } = require('./database-rules.cjs')
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true })
const args = process.argv.slice(2)
const apply = args.includes('--apply')
const value = flag => args.find(a => a.startsWith(`${flag}=`))?.slice(flag.length + 1)
const database = value('--database')
if (args.some(a => !['--apply', '--dry-run', '--backfill-geo', '--rebuild', '--create-missing-only'].includes(a) && !a.startsWith('--database=') && !a.startsWith('--out='))) throw new Error('Unknown argument')
if (apply && (args.includes('--dry-run') || !database)) throw new Error('Apply requires --database=EXACT_NAME and cannot include --dry-run')

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    const db = client.db(database)
    const registered = models()
    const report = { layoutVersion: 2, database: db.databaseName, mode: apply ? 'apply' : 'dry-run', collections: [], blockers: [], geoBackfill: [] }
    const collections = new Map((await db.listCollections().toArray()).map(c => [c.name, c]))
    if (args.includes('--rebuild')) for (const name of collections.keys()) {
      if (!registered.some(m => m.collection.collectionName === name)) report.blockers.push(`${name}: outside the redesigned layout; review before rebuild, no automatic deletion`)
    }
    for (const model of registered) {
      const name = model.collection.collectionName
      const schema = jsonSchema(model.schema)
      const exists = collections.has(name)
      const collection = db.collection(name)
      const invalid = exists ? await collection.countDocuments({ $nor: [{ $jsonSchema: schema }] }) : 0
      const invalidIds = invalid ? await collection.find({ $nor: [{ $jsonSchema: schema }] }).project({ _id: 1 }).limit(10).toArray() : []
      const invalidFields = []
      if (invalid) for (const [field, rule] of Object.entries(schema.properties)) {
        const count = await collection.countDocuments({ $nor: [{ $jsonSchema: { bsonType: 'object', properties: { [field]: rule }, ...(schema.required?.includes(field) ? { required: [field] } : {}) } }] })
        if (count) invalidFields.push({ field, count })
      }
      if (invalid) report.blockers.push(`${name}: ${invalid} documents violate the proposed validator`)
      const existingIndexes = exists ? await collection.listIndexes().toArray() : []
      const indexes = model.schema.indexes().map(([key, options]) => ({ key, options: Object.fromEntries(Object.entries(options).filter(([k]) => !['background', '_autoIndex'].includes(k))) }))
      const missingIndexes = indexes.filter(index => !existingIndexes.some(old => JSON.stringify(old.key) === JSON.stringify(index.key) && !!old.unique === !!index.options.unique && old.expireAfterSeconds === index.options.expireAfterSeconds && JSON.stringify(old.partialFilterExpression) === JSON.stringify(index.options.partialFilterExpression)))
      for (const index of missingIndexes) {
        if (existingIndexes.some(old => JSON.stringify(old.key) === JSON.stringify(index.key))) report.blockers.push(`${name}: index options conflict for ${JSON.stringify(index.key)}; manual review required`)
        if (index.options.unique && exists) {
          const filter = index.options.partialFilterExpression || (index.options.sparse ? { [Object.keys(index.key)[0]]: { $exists: true } } : {})
          const duplicate = await collection.aggregate([{ $match: filter }, { $group: { _id: Object.fromEntries(Object.keys(index.key).map(k => [k, `$${k}`])), n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }, { $limit: 1 }]).hasNext()
          if (duplicate) report.blockers.push(`${name}: duplicate values prevent a unique index`)
        }
      }
      const references = []
      for (const [field, type] of Object.entries(model.schema.paths)) {
        if (!exists || !type.options.ref) continue
        const target = registered.find(m => m.modelName === type.options.ref)
        const result = await collection.aggregate([
          { $match: { [field]: { $type: 'objectId' } } },
          { $lookup: { from: target.collection.collectionName, localField: field, foreignField: '_id', as: '__reference' } },
          { $match: { __reference: { $size: 0 } } }, { $count: 'count' },
        ]).toArray()
        references.push({ field, target: target.collection.collectionName, dangling: result[0]?.count || 0 })
        if (field === 'userId' && result[0]?.count) report.blockers.push(`${name}: ${result[0].count} records have a missing owner; choose an explicit remediation before rollout`)
      }
      if (exists && ['places', 'geofences'].includes(name)) {
        const filter = { 'coordinates.lat': { $type: 'number', $gte: -90, $lte: 90 }, 'coordinates.lng': { $type: 'number', $gte: -180, $lte: 180 } }
        report.geoBackfill.push({ collection: name, count: await collection.countDocuments(filter), filter })
      }
      report.collections.push({ name, exists, count: exists ? await collection.countDocuments({}) : 0, invalid, invalidFields, invalidIds, references, previousValidator: collections.get(name)?.options || {}, validator: { $jsonSchema: schema }, validationLevel: 'strict', validationAction: 'error', missingIndexes, existingIndexes })
    }
    const output = value('--out')
    if (output) fs.writeFileSync(path.resolve(output), JSON.stringify(report, null, 2) + '\n')
    for (const item of report.collections) console.log(JSON.stringify({ collection: item.name, count: item.count, invalid: item.invalid, invalidFields: item.invalidFields, danglingReferences: item.references.filter(r => r.dangling), newIndexes: item.missingIndexes.length }))
    console.log(JSON.stringify({ database: report.database, mode: report.mode, blockers: report.blockers, geoBackfill: report.geoBackfill.map(({ collection, count }) => ({ collection, count })) }))
    if (!apply) return
    if (report.blockers.length) throw new Error('Preflight failed; no database changes made. Review the report.')
    for (const item of report.collections) {
      if (item.exists && args.includes('--create-missing-only')) {
        console.log(`${item.name}: existing collection unchanged (--create-missing-only)`)
        continue
      }
      if (item.exists) {
        const current = item.previousValidator
        if (!isDeepStrictEqual(current.validator, item.validator) || (current.validationLevel || 'strict') !== 'strict' || (current.validationAction || 'error') !== 'error') {
          await db.command({ collMod: item.name, validator: item.validator, validationLevel: 'strict', validationAction: 'error' })
        }
      }
      else await db.createCollection(item.name, { validator: item.validator, validationLevel: 'strict', validationAction: 'error' })
      for (const index of item.missingIndexes) await db.collection(item.name).createIndex(index.key, index.options)
    }
    if (args.includes('--backfill-geo')) for (const { collection, filter } of report.geoBackfill) {
      await db.collection(collection).updateMany(filter, [{ $set: { geoPoint: { type: 'Point', coordinates: ['$coordinates.lng', '$coordinates.lat'] } } }])
    }
    console.log(args.includes('--create-missing-only') ? 'Missing collections created with validators and indexes. Existing collections were not modified; full validator rollout is still required.' : 'Validators and indexes applied. No collections or documents deleted.')
  } finally { await client.close(); await mongoose.disconnect() }
}
main().catch(error => { console.error(`Migration stopped: ${error.name}; ${error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[redacted]')}`); process.exitCode = 1 })
