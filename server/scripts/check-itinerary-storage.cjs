// Validate a freshly generated itinerary against the live validator without writes.
const assert = require('node:assert/strict')
const path = require('node:path')
const { MongoClient } = require('mongodb')
const { PlannerDraft } = require('../dist/models/PlannerDraft')
const { validateItinerary, buildGroundedItinerary } = require('../dist/lib/groundedItinerary')
const { guidedSnapshot } = require('../dist/lib/guidedSnapshot')
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true })
async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  try {
    await client.connect()
    const db = client.db()
    const collection = db.collection('plannerdrafts')
    const record = await collection.findOne({})
    assert(record, 'An existing draft is required for read-only verification')
    const request = validateItinerary({ areaId: 'dagupan', tripTypes: ['Nature'], activities: ['Photography'],
      travelerType: 'couple', travelStyle: 'balanced', date: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10),
      travelers: 2, budget: 4000, days: 1, lodgingId: null, transportModes: ['Own Vehicle'],
      fareInputs: [{ mode: 'Own Vehicle', rides: 2, allowance: 100 }], preferences: [], returnToOrigin: true,
      startTime: '07:00', mealBudget: 300, hotelRooms: 1 })
    for (const mode of ['catalog', 'model-assisted']) {
      const plan = buildGroundedItinerary(request, new Set())
      plan.mode = mode
      const draft = PlannerDraft.hydrate(record)
      draft.plan = guidedSnapshot(plan)
      await draft.validate()
      assert.equal(PlannerDraft.schema.path('generationMode'), undefined)
      assert.equal(draft.budgetPHP, request.budget)
      assert.equal(draft.estimatedMaxPHP, plan.costEstimate.max)
      assert.equal(draft.plan.guided.breakdown.Emergency, 400)
      const [info] = await db.listCollections({ name: 'plannerdrafts' }).toArray()
      const candidate = draft.toObject({ virtuals: false, transform: false })
      const valid = await collection.aggregate([{ $limit: 1 }, { $replaceWith: { $literal: candidate } },
        { $match: info.options.validator }, { $count: 'valid' }]).toArray()
      assert.equal(valid[0]?.valid, 1, `${mode} snapshot rejected by installed MongoDB validator`)
    }
    console.log('PASS: fresh catalog and model-assisted snapshots, emergency reserve and readable fields pass the live draft validator. No records written.')
  } finally { await client.close() }
}
main().catch(error => { console.error(`Itinerary storage check failed: ${error.name}`); process.exitCode = 1 })
