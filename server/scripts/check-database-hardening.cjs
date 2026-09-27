const assert = require('node:assert/strict')
const express = require('express')
const { models, jsonSchema } = require('./database-rules.cjs')
const { sanitizeRequest, validateRouter, pagination } = require('../dist/middleware/input')
const { User, Trip, Place, BudgetEntry } = require('../dist/models')
const { PendingRegistration } = require('../dist/models/PendingRegistration')
const id = '0123456789abcdef01234567'

async function main() {
  for (const model of models()) {
    assert.equal(model.schema.options.strict, 'throw', model.modelName)
    assert.equal(model.schema.options.strictQuery, true, model.modelName)
    assert.equal(model.schema.options.autoIndex, false)
    assert.equal(jsonSchema(model.schema).additionalProperties, false)
  }
  assert.equal(User.schema.path('passwordHash').options.select, false)
  assert.equal(PendingRegistration.schema.path('codeHash').options.select, false)
  assert.equal(new User({ name: 'Test', email: 'test@example.org', passwordHash: 'x'.repeat(60) }).toJSON().passwordHash, undefined)
  assert.throws(() => new Trip({ unexpected: true }), /strict mode/)
  const valid = { userId: id, title: 'Trip', location: 'Dagupan', date: '2027-01-01' }
  for (const patch of [{ budget: '12' }, { budget: -1 }, { title: {} }, { status: 'OTHER' }, { budget: Infinity }]) assert.ok(new Trip({ ...valid, ...patch }).validateSync())
  assert.ok(new BudgetEntry({ userId: id, label: 'fare', amount: 20, category: 'invalid' }).validateSync())
  // Exercise async reference validation without a database/network dependency.
  const exists = User.exists
  try {
    User.exists = () => ({ session: async () => null })
    await assert.rejects(new Trip(valid).validate(), /references a missing User/)
    User.exists = () => ({ session: async () => ({ _id: id }) })
    await new Trip(valid).validate()
    const refValidator = Trip.schema.path('userId').validators.find(v => v.message.includes('references a missing'))
    User.exists = () => ({ session: async () => null })
    assert.equal(await refValidator.validator.call(Trip.findOneAndUpdate({ _id: id }, { userId: id }), id), false)
  } finally { User.exists = exists }
  const place = new Place({ name: 'Test', description: 'Description', location: 'Dagupan', municipality: 'Dagupan', category: 'Park', coordinates: { lat: 16, lng: 120 } })
  await place.validate()
  assert.deepEqual(place.geoPoint.coordinates.toObject(), [120, 16])
  assert.ok(new Place({ ...place.toObject(), coordinates: { lat: 100, lng: 120 } }).validateSync())
  assert.throws(() => pagination({ query: { limit: '201' } }))
  assert.deepEqual(pagination({ query: { page: '2', limit: '20' } }), { skip: 20, limit: 20 })

  const app = express()
  app.use(express.json(), sanitizeRequest)
  let accepted = 0
  for (const scope of ['auth', 'trips', 'places', 'budget', 'knowledge', 'ai', 'lgu', 'approvals']) {
    app.use('/' + scope, validateRouter(scope), (_req, res) => { accepted++; res.json({ ok: true }) })
  }
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message }))
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const call = (path, body, method = 'POST') => fetch(base + path, { method, headers: { 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
  try {
    for (const [path, body, method] of [
      ['/auth/login', { email: { $gt: '' }, password: 'abc' }],
      ['/auth/login', { email: {}, password: 'abc' }],
      ['/auth/login', { email: ['x'], password: 'abc' }],
      ['/trips', { title: 'Trip', location: 'Dagupan', date: '2027-01-01', budget: '10' }],
      ['/places/' + id, { userId: id }, 'PUT'],
      ['/places/' + id, { $set: { name: 'Changed' } }, 'PUT'],
      ['/knowledge/places', { name: 'Test', coordinates: { 'lat.value': 0 } }],
      ['/lgu/route-prices', { transitRouteId: {} }],
      ['/approvals/places/' + id + '/approve', { revision: '1' }],
      ['/budget?limit=0', undefined, 'GET'],
      ['/budget?status=x&status=y', undefined, 'GET'],
      ['/budget?%24where=1', undefined, 'GET'],
    ]) assert.equal((await call(path, body, method)).status, 400, path)
    assert.equal(accepted, 0, 'Invalid input must never reach handlers')
    assert.equal((await call('/trips', { title: 'Trip', location: 'Dagupan', date: '2027-01-01', budget: 10 })).status, 200)
    assert.equal((await call('/places/' + id, { userNote: 'Hello', isPublic: false }, 'PUT')).status, 200)
    assert.equal((await call('/places', { name: 'Beach', category: 'Beach', rating: 4, userNote: 'Visit again', isPublic: true })).status, 200)
  } finally { await new Promise(resolve => server.close(resolve)) }
  console.log('PASS schema constraints, strict types, reference checks, secret selection, GeoJSON ordering, Express 5 sanitization, injection rejection, editable fields and pagination')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
