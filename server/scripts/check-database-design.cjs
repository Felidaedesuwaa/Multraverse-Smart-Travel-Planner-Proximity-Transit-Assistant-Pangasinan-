// In-memory fixtures only. This test never connects to Atlas or inserts records.
const assert = require('node:assert/strict')
const express = require('express')
const { models, jsonSchema } = require('./database-rules.cjs')
const { User, Trip } = require('../dist/models')
const { PlannerDraft } = require('../dist/models/PlannerDraft')
const { buildPlan } = require('../dist/lib/planner')
const { sanitizeRequest, validateRouter } = require('../dist/middleware/input')
const { Types } = require('mongoose')
const owner = new Types.ObjectId()
const placeId = new Types.ObjectId().toString()
const request = {
  origin: { areaId: 'dagupan' }, destinations: [{ areaId: 'alaminos', placeIds: [placeId] }],
  dates: { start: '2027-01-04' }, startTime: '08:00', days: 1, budget: 1000, travelers: 1,
  preferences: [], transportModes: ['bus'], pace: 'balanced', lodging: { preference: 'none', nightlyBudget: 0, rooms: 1 },
  foodPerPersonPerDay: 100, useSavedPlaces: false, returnToOrigin: false, excludedPlaceIds: [],
}
const plan = buildPlan(request, { places: [{ _id: placeId, name: 'Test fixture', municipality: 'Alaminos', location: 'Alaminos', description: 'An in-memory test fixture only.' }], fares: [], routes: [], foods: [], saved: [], geofences: [] })
const basicTrip = { userId: owner, title: 'Test', location: 'Alaminos', date: '2027-01-04' }
async function main() {
  assert.equal(models().length, 16)
  assert.ok(!models().some(m => ['tripstops', 'budgetsettings'].includes(m.collection.collectionName)))
  assert.equal(User.schema.path('budgetSettings').schema.options._id, false)
  assert.equal(Trip.schema.path('plan').schema.options._id, false)
  assert.equal(Trip.schema.path('spent'), undefined)
  const user = new User({ name: 'Test', email: 'test@example.org', passwordHash: 'x'.repeat(60) })
  assert.equal(user.budgetSettings, undefined)
  assert.equal(user.location, undefined)
  const previousExists = User.exists
  try {
    User.exists = () => ({ session: async () => ({ _id: owner }) })
    const trip = new Trip({ ...basicTrip, plan })
    await trip.validate()
    assert.equal(trip.toJSON().tripStops.length, 1)
    assert.equal(trip.toJSON().stops, 1)
    assert.equal(trip.toJSON().estimatedCost, plan.costs.knownTotal)
    assert.equal(trip.toObject().tripStops, undefined, 'Stops are derived, never duplicated in storage')
    const draft = new PlannerDraft({ userId: owner, plan, expiresAt: new Date(Date.now() + 60000) })
    await draft.validate()
    const corrupt = structuredClone(plan)
    corrupt.days[0].stops[0].transit.cost = '12'
    await assert.rejects(new Trip({ ...basicTrip, plan: corrupt }).validate())
    const tooMany = structuredClone(plan)
    tooMany.days = Array.from({ length: 8 }, () => plan.days[0])
    await assert.rejects(new Trip({ ...basicTrip, plan: tooMany }).validate())
    await assert.rejects(new User({ ...user.toObject(), budgetSettings: { monthlyBudget: '8000', savingsTarget: 20 } }).validate())
    await assert.rejects(new User({ ...user.toObject(), budgetSettings: { monthlyBudget: 500 } }).validate())
  } finally { User.exists = previousExists }
  const rule = jsonSchema(Trip.schema)
  assert.equal(rule.properties.plan.properties.days.bsonType, 'array')
  assert.equal(rule.properties.plan.properties.days.maxItems, 7)
  assert.equal(rule.properties.plan.properties.days.items.additionalProperties, false)
  assert.equal(rule.properties.plan.properties.days.items.properties.stops.maxItems, 4)
  assert.ok(rule.properties.plan.properties.days.items.properties.stops.items.properties.coordinates.bsonType.includes('null'))

  // Exercise the real budget router with only persistence/authentication stubbed.
  const auth = require('../dist/middleware/auth')
  const previousAuth = auth.authenticate
  const previousRead = User.findById, previousWrite = User.findByIdAndUpdate
  let preferences, writes = 0
  auth.authenticate = (req, _res, next) => { req.userId = owner.toString(); next() }
  User.findById = () => ({ select: async () => ({ budgetSettings: preferences }) })
  User.findByIdAndUpdate = (_id, update) => {
    writes++; preferences = update.$set.budgetSettings
    return { select: async () => ({ budgetSettings: preferences }) }
  }
  const app = express(); app.use(express.json(), sanitizeRequest)
  app.use('/budget', require('../dist/routes/budget').default)
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  try {
    const url = `http://127.0.0.1:${server.address().port}/budget/settings`
    assert.deepEqual(await (await fetch(url)).json(), { monthlyBudget: null, savingsTarget: null })
    assert.equal(writes, 0, 'GET must not create assumed preferences')
    const put = body => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    assert.equal((await put({ monthlyBudget: 500 })).status, 400)
    assert.equal(writes, 0)
    const desired = { monthlyBudget: 500, savingsTarget: 10 }
    assert.equal((await put(desired)).status, 200)
    assert.equal(writes, 1)
    assert.deepEqual(await (await fetch(url)).json(), desired)
  } finally {
    await new Promise(resolve => server.close(resolve))
    auth.authenticate = previousAuth; User.findById = previousRead; User.findByIdAndUpdate = previousWrite
  }
  console.log('PASS: 16 explicit collections; embedded preferences; typed, bounded itinerary; derived stops/cost; no assumed location/budget; read-only settings GET; validated atomic settings PUT')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
