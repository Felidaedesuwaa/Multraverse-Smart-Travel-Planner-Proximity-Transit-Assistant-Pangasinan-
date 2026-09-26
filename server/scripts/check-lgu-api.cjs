const assert = require('node:assert/strict')
const { randomBytes } = require('node:crypto')
const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const path = require('node:path')
if (!process.argv.includes('--isolated-database')) throw new Error('Use --isolated-database')
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true })
const uri = process.env.LGU_TEST_MONGODB_URI || process.env.MONGODB_URI
if (!uri) throw new Error('Configure LGU_TEST_MONGODB_URI or MONGODB_URI')
process.env.JWT_SECRET = randomBytes(32).toString('hex')
const dbName = `multraverse_lgu_test_${randomBytes(8).toString('hex')}`
const { User } = require('../dist/models')
const { lguResources } = require('../dist/lib/lguResources')
const app = express()
app.use(express.json())
for (const [url, file] of [['lgu', 'lgu'], ['admin/approvals', 'approvals'], ['knowledge', 'knowledge'], ['geofences', 'geofences'], ['transit-routes', 'transitRoutes'], ['users', 'users'], ['auth', 'auth']]) app.use(`/api/${url}`, require(`../dist/routes/${file}`).default)
app.use((error, req, res, next) => res.status(500).json({ error: error.message }))
let server
const fixtures = {
  places: { name: 'Municipal beach', description: 'A coastal destination', location: 'Barangay One', category: 'Beach' },
  geofences: { location: 'Town center', zone: 'Tourism zone', radius: '200 m' },
  foods: { name: 'Bangus', description: 'Local milkfish', avgPrice: 150, where: 'Market', category: 'Seafood' },
  'route-prices': { from: 'Dagupan', to: 'Lingayen', vehicle: 'BUS', price: 50, duration: '30 min' },
  'transit-routes': { name: 'Town loop', type: 'BUS', frequency: '30 min' },
}
;(async () => {
  try {
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 })
    assert.equal(mongoose.connection.name, dbName)
    server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)) })
    const call = async (url, token, method = 'GET', body) => {
      const result = await fetch(`http://127.0.0.1:${server.address().port}/api/${url}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
      return { status: result.status, body: await result.json() }
    }
    const account = async (role, municipality) => {
      const user = await User.create({ name: role, email: `${randomBytes(5).toString('hex')}@test.invalid`, passwordHash: await bcrypt.hash('Lgu123!', 4), emailVerifiedAt: new Date(), role, municipality })
      return { user, token: jwt.sign({ userId: String(user._id), role: 'ADMIN', municipality: 'Bolinao' }, process.env.JWT_SECRET) }
    }
    const lgu = await account('lgu', 'Dagupan'), other = await account('LGU', 'Bolinao'), admin = await account('ADMIN'), explorer = await account('EXPLORER'), pro = await account('PRO')
    assert.equal(lgu.user.role, 'LGU')
    await assert.rejects(() => account('LGU'), /municipality/)
    const login = await call('auth/login', null, 'POST', { email: lgu.user.email, password: 'Lgu123!' })
    assert.equal(login.status, 200); assert.equal(login.body.user.municipality, 'Dagupan'); assert.equal(login.body.user.role, 'LGU')
    assert.equal((await call('users/me', lgu.token)).body.municipality, 'Dagupan')
    assert.equal((await call('users/me', lgu.token, 'PUT', { municipality: 'Bolinao', role: 'ADMIN' })).status, 400)
    assert.equal((await call('lgu/places')).status, 401)
    for (const token of [admin.token, explorer.token, pro.token]) assert.equal((await call('lgu/places', token)).status, 403)
    assert.equal((await call('lgu/unknown', lgu.token)).status, 404)
    assert.equal((await call('lgu/places/not-an-id', lgu.token)).status, 400)
    assert.equal((await call('lgu/places', lgu.token, 'POST', {})).status, 400)
    for (const [resource, fixture] of Object.entries(fixtures)) {
      const endpoint = `lgu/${resource}`
      const publicEndpoint = ['geofences', 'transit-routes'].includes(resource) ? resource : `knowledge/${resource}`
      const model = lguResources[resource].model
      // Raw legacy record without moderation fields stays readable.
      const legacy = await model.collection.insertOne({ ...fixture, municipality: 'Legacy' })
      assert.ok((await call(publicEndpoint, explorer.token)).body.some(row => row.id === String(legacy.insertedId)))
      const created = await call(endpoint, lgu.token, 'POST', fixture)
      assert.equal(created.status, 201, JSON.stringify(created.body))
      const id = created.body.id
      assert.equal(created.body.approvalStatus, 'pending'); assert.equal(created.body.municipality, 'Dagupan')
      assert.equal((await call(`${endpoint}?status=pending`, lgu.token)).body.length, 1)
      assert.equal((await call(endpoint, other.token)).body.length, 0)
      for (const method of ['GET', 'PUT', 'DELETE']) assert.equal((await call(`${endpoint}/${id}`, other.token, method, method === 'PUT' ? fixture : undefined)).status, 404)
      for (const injection of [{ municipality: 'Bolinao' }, { approvalStatus: 'approved' }, { submittedBy: String(admin.user._id) }, { $set: { municipality: 'Bolinao' } }]) assert.equal((await call(`${endpoint}/${id}`, lgu.token, 'PUT', injection)).status, 400)
      assert.ok(!(await call(publicEndpoint, explorer.token)).body.some(row => row.id === id))
      assert.equal((await call(`admin/approvals/${resource}/${id}/approve`, lgu.token, 'POST', { revision: 0 })).status, 403)
      const review = (decision, revision, reason) => call(`admin/approvals/${resource}/${id}/${decision}`, admin.token, 'POST', { revision, reason })
      assert.equal((await review('approve', 0)).status, 200)
      assert.ok((await call(publicEndpoint, explorer.token)).body.some(row => row.id === id))
      assert.equal((await review('approve', 0)).status, 409)
      const edited = await call(`${endpoint}/${id}`, lgu.token, 'PUT', fixture)
      assert.equal(edited.body.approvalStatus, 'pending')
      assert.ok(!(await call(publicEndpoint, explorer.token)).body.some(row => row.id === id))
      assert.equal((await review('approve', 0)).status, 409, 'Stale reviewer must not approve a changed submission')
      assert.equal((await review('reject', edited.body.reviewRevision)).status, 400)
      const rejected = await review('reject', edited.body.reviewRevision, 'Please verify the details')
      assert.equal(rejected.body.approvalStatus, 'rejected')
      assert.ok(!(await call(publicEndpoint, explorer.token)).body.some(row => row.id === id))
      const resubmitted = await call(`${endpoint}/${id}`, lgu.token, 'PUT', fixture)
      assert.equal(resubmitted.body.rejectionReason, undefined)
      assert.equal((await review('approve', resubmitted.body.reviewRevision)).status, 200)
      const deletion = await call(`${endpoint}/${id}`, lgu.token, 'DELETE')
      assert.equal(deletion.body.approvalStatus, 'pending'); assert.equal(deletion.body.pendingDeletion, true)
      assert.ok(!(await call(publicEndpoint, explorer.token)).body.some(row => row.id === id))
      assert.equal((await review('approve', deletion.body.reviewRevision)).body.deleted, true)
      assert.equal(await model.findById(id), null)
      console.log(`PASS ${resource}: scope, injection protection, approval, rejection, stale review, resubmission, deletion, visibility`)
    }
    const foreignRoute = await lguResources['transit-routes'].model.create({ ...fixtures['transit-routes'], municipality: 'Bolinao' })
    assert.equal((await call('lgu/route-prices', lgu.token, 'POST', { ...fixtures['route-prices'], transitRouteId: String(foreignRoute._id) })).status, 400)
    // The same five route handlers must isolate each of the six sample scopes.
    const { lguSeedAccounts } = require('../dist/data/lguSeedAccounts')
    for (const sample of lguSeedAccounts) {
      const municipal = await account('lgu', sample.municipality)
      const profile = await call('users/me', municipal.token)
      assert.equal(profile.body.municipality, sample.municipality)
      for (const [resource, fixture] of Object.entries(fixtures)) {
        const created = await call(`lgu/${resource}`, municipal.token, 'POST', fixture)
        assert.equal(created.status, 201)
        assert.equal(created.body.municipality, sample.municipality)
        const list = await call(`lgu/${resource}`, municipal.token)
        assert.equal(list.status, 200)
        assert.ok(list.body.length && list.body.every(row => row.municipality === sample.municipality))
        assert.equal((await call(`lgu/${resource}?municipality=Other`, municipal.token)).status, 400)
        assert.equal((await call(`lgu/${resource}`, municipal.token, 'POST', { ...fixture, municipality: 'Other' })).status, 400)
        const foreignToken = sample.municipality === 'Dagupan' ? other.token : lgu.token
        for (const method of ['GET', 'PUT', 'DELETE']) assert.equal((await call(`lgu/${resource}/${created.body.id}`, foreignToken, method, method === 'PUT' ? fixture : undefined)).status, 404)
      }
      console.log(`PASS shared municipal scope: ${sample.municipality}`)
    }
    await assert.rejects(() => account('LGU', 'Manila'), /municipality/)
    // Reject malformed legacy accounts too, even if they bypassed model validation.
    await User.collection.updateOne({ _id: lgu.user._id }, { $set: { municipality: 'Unknown' } })
    assert.equal((await call('lgu/places', lgu.token)).status, 403)
    // Every request re-reads the account instead of trusting stale token claims.
    await User.updateOne({ _id: lgu.user._id }, { $set: { municipality: 'Lingayen' } })
    const moved = await call('lgu/foods', lgu.token, 'POST', fixtures.foods)
    assert.equal(moved.body.municipality, 'Lingayen')
    await User.updateOne({ _id: lgu.user._id }, { $unset: { municipality: 1 } })
    assert.equal((await call('lgu/foods', lgu.token)).status, 403)
    await User.updateOne({ _id: lgu.user._id }, { $set: { role: 'EXPLORER' } })
    assert.equal((await call('lgu/foods', lgu.token)).status, 403)
    console.log('PASS login/profile scope, existing roles, live role/municipality changes and cross-municipality references')
  } finally {
    if (server) await new Promise(resolve => server.close(resolve))
    try {
      if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName && /^multraverse_lgu_test_[a-f0-9]{16}$/.test(dbName)) {
        // Atlas app users may delete documents but lack dropDatabase privileges.
        for (const collection of await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()) await mongoose.connection.db.collection(collection.name).deleteMany({})
        console.log('Isolated test records removed')
      }
    } finally { await mongoose.disconnect() }
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
