// Add readable columns to the original collection and remove our obsolete view.
const path = require('node:path')
const { MongoClient } = require('mongodb')
const { jsonSchema } = require('./database-rules.cjs')
const { PlannerDraft } = require('../dist/models/PlannerDraft')
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true })
const fields = ['destination', 'tripDate', 'days', 'travelers', 'budgetPHP', 'estimatedMinPHP', 'estimatedMaxPHP']
function summary(plan) {
  const guided = plan.guided
  return {
    destination: guided?.request?.areaId || plan.request.destinations.map(d => d.areaId).join(' / '),
    tripDate: guided?.request?.date || plan.request.dates.start,
    days: plan.request.days, travelers: plan.request.travelers, budgetPHP: plan.request.budget,
    estimatedMinPHP: guided?.costEstimate?.min ?? plan.costs.knownTotal,
    estimatedMaxPHP: guided?.costEstimate?.max ?? plan.costs.knownTotal,
  }
}
async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  try {
    await client.connect()
    const db = client.db()
    const apply = process.argv.includes('--apply')
    if (apply && !process.argv.includes(`--database=${db.databaseName}`)) throw new Error('Exact database name required')
    const [info] = await db.listCollections({ name: 'plannerdrafts' }).toArray()
    const [view] = await db.listCollections({ name: 'plannerDraftTable' }).toArray()
    if (view && (view.type !== 'view' || view.options?.viewOn !== 'plannerdrafts')) throw new Error('Refusing to remove an unrelated database object')
    const validator = structuredClone(info?.options?.validator)
    if (!validator?.$jsonSchema?.properties) throw new Error('Expected existing collection validator')
    const target = jsonSchema(PlannerDraft.schema)
    for (const field of fields) validator.$jsonSchema.properties[field] = target.properties[field]
    const collection = db.collection('plannerdrafts')
    if (await collection.countDocuments({ $nor: [validator] })) throw new Error('Existing records violate proposed validator')
    const drafts = await collection.find({}).toArray()
    const updates = []
    for (const draft of drafts) {
      const values = summary(draft.plan)
      const candidate = PlannerDraft.hydrate(draft)
      await candidate.validate()
      if (fields.some(field => candidate.get(field) !== values[field])) throw new Error('Backend summary differs from migration')
      updates.push({ id: draft._id, plan: draft.plan, values })
    }
    console.log(`Validated ${updates.length} existing drafts.`)
    if (!apply) return
    await db.command({ collMod: 'plannerdrafts', validator, validationLevel: info.options.validationLevel || 'strict', validationAction: info.options.validationAction || 'error' })
    for (const update of updates) {
      // Skip a document that changed after preflight; a rerun will pick it up.
      const result = await collection.updateOne({ _id: update.id, plan: update.plan }, { $set: update.values })
      if (!result.matchedCount) throw new Error('Draft changed during migration; rerun to finish')
      const actual = await collection.findOne({ _id: update.id })
      if (actual && fields.some(field => actual[field] !== update.values[field])) throw new Error('Summary verification failed')
    }
    if (view) await db.collection('plannerDraftTable').drop()
    console.log('Original plannerdrafts updated; obsolete view removed. Itinerary snapshots preserved.')
  } finally { await client.close() }
}
main().catch(error => { console.error(`Planner draft migration failed (${error.codeName || error.name}); invalid paths: ${Object.keys(error.errors || {}).join(', ') || 'none'}.`); process.exitCode = 1 })
