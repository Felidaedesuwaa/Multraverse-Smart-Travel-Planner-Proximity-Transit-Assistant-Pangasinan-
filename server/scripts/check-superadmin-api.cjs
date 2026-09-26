const assert = require('node:assert/strict')
const { randomBytes } = require('node:crypto')
const mongoose = require('mongoose')
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
if (!process.argv.includes('--isolated-database')) throw new Error('Use --isolated-database')
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env'), quiet: true })
process.env.JWT_SECRET = randomBytes(32).toString('hex')
const uri = process.env.SUPERADMIN_TEST_MONGODB_URI || process.env.MONGODB_URI
if (!uri) throw new Error('Configure SUPERADMIN_TEST_MONGODB_URI or MONGODB_URI')
const dbName = `multraverse_sa_test_${randomBytes(8).toString('hex')}`
const { User, AuditLog } = require('../dist/models')
const { bootstrapSuperAdmin } = require('../dist/lib/bootstrapSuperAdmin')
const { lguResources } = require('../dist/lib/lguResources')
const app = express()
app.use(express.json())
for (const [url, file] of [['users', 'users'], ['audit-logs', 'auditLogs'], ['admin/approvals', 'approvals'], ['lgu', 'lgu'], ['auth', 'auth']]) app.use(`/api/${url}`, require(`../dist/routes/${file}`).default)
app.use((error, req, res, next) => res.status(500).json({ error: 'Operation failed' }))
let server
;(async () => {
  try {
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 })
    assert.equal(mongoose.connection.name, dbName)
    await Promise.all([User.init(), AuditLog.init()])
    const results = await Promise.all([bootstrapSuperAdmin('superadmin@multraverse.ph', 'Superadmin123!'), bootstrapSuperAdmin('superadmin@multraverse.ph', 'Superadmin123!')])
    assert.equal(results.filter(item => item.created).length, 1)
    assert.equal(await User.countDocuments({ role: 'SUPERADMIN' }), 1)
    const superadmin = await User.findOne({ role: 'SUPERADMIN' })
    assert.equal(superadmin.createdBy, null)
    const originalHash = superadmin.passwordHash
    await bootstrapSuperAdmin('different@multraverse.ph', 'Different123!')
    assert.equal((await User.findById(superadmin._id)).passwordHash, originalHash)
    const token = user => jwt.sign({ userId: String(user._id), role: 'SUPERADMIN' }, process.env.JWT_SECRET)
    const superToken = token(superadmin)
    const accounts = []
    for (const role of ['ADMIN', 'LGU', 'EXPLORER', 'PRO']) accounts.push(await User.create({ name: role, email: `${role.toLowerCase()}@multraverse.ph`, passwordHash: await bcrypt.hash('Example123!', 4), role, ...(role === 'LGU' ? { municipality: 'Dagupan' } : {}) }))
    const admin = accounts[0]
    server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)) })
    const call = async (url, auth, method = 'GET', body) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/${url}`, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
      return { status: response.status, body: await response.json() }
    }
    const lguInput = { email: 'newlgu@multraverse.ph', password: 'NewLgu123!', municipality: 'Alaminos' }
    const adminInput = { email: 'newadmin@multraverse.ph', password: 'NewAdmin123!' }
    for (const auth of [undefined, ...accounts.map(token)]) {
      const expected = auth ? 403 : 401
      for (const route of ['users/lgu-accounts', 'users/admin-accounts', 'audit-logs']) assert.equal((await call(route, auth)).status, expected)
      assert.equal((await call('users/lgu-accounts', auth, 'POST', lguInput)).status, expected)
      assert.equal((await call('users/admin-accounts', auth, 'POST', adminInput)).status, expected)
    }
    assert.equal((await call('admin/approvals/places', superToken)).status, 403)
    assert.equal((await call('lgu/places', superToken)).status, 403)
    const login = await call('auth/login', undefined, 'POST', { email: superadmin.email, password: 'Superadmin123!' })
    assert.equal(login.status, 200); assert.equal(login.body.user.role, 'SUPERADMIN')
    assert.equal((await call('users/me', superToken)).body.role, 'SUPERADMIN')
    assert.equal((await call('users/me', token(admin), 'PUT', { role: 'SUPERADMIN' })).status, 400)
    for (const body of [{ ...lguInput, municipality: 'Alamnios' }, { ...lguInput, municipality: { $ne: '' } }, { ...lguInput, password: 'weak' }, { ...lguInput, role: 'SUPERADMIN' }, { ...lguInput, createdBy: String(admin._id) }, { ...lguInput, email: 'bad' }]) assert.equal((await call('users/lgu-accounts', superToken, 'POST', body)).status, 400)
    assert.equal((await call('users/admin-accounts', superToken, 'POST', { ...adminInput, municipality: 'Alaminos' })).status, 400)
    const created = await call('users/lgu-accounts', superToken, 'POST', lguInput)
    assert.equal(created.status, 201, JSON.stringify(created.body))
    assert.equal(created.body.role, 'LGU'); assert.equal(created.body.createdBy.email, superadmin.email)
    assert.equal(created.body.passwordHash, undefined); assert.equal(created.body.password, undefined)
    const saved = await User.findById(created.body.id)
    assert.ok(await bcrypt.compare(lguInput.password, saved.passwordHash))
    const accountAudit = await AuditLog.findOne({ action: 'create_lgu_account', targetUser: saved._id })
    assert.equal(String(accountAudit.actor), String(superadmin._id)); assert.equal(accountAudit.metadata.municipality, 'Alaminos')
    const newAdmin = await call('users/admin-accounts', superToken, 'POST', adminInput)
    assert.equal(newAdmin.status, 201); assert.equal(newAdmin.body.role, 'ADMIN'); assert.equal(newAdmin.body.municipality, undefined)
    assert.equal((await call('users/lgu-accounts', superToken, 'POST', { ...lguInput, email: ' NEWLGU@MULTRAVERSE.PH ' })).status, 409)
    const concurrent = await Promise.all([1, 2].map(() => call('users/admin-accounts', superToken, 'POST', { ...adminInput, email: 'race@multraverse.ph' })))
    assert.deepEqual(concurrent.map(result => result.status).sort(), [201, 409])
    // Simulate a write failure to prove account + audit atomicity.
    const nativeCreate = AuditLog.create
    AuditLog.create = async () => { throw new Error('Simulated audit outage') }
    try {
      assert.equal((await call('users/admin-accounts', superToken, 'POST', { ...adminInput, email: 'rollback@multraverse.ph' })).status, 500)
      assert.equal(await User.countDocuments({ email: 'rollback@multraverse.ph' }), 0)
    } finally { AuditLog.create = nativeCreate }
    for (const kind of ['lgu', 'admin']) {
      const list = await call(`users/${kind}-accounts`, superToken)
      assert.equal(list.status, 200)
      assert.ok(list.body.every(user => user.role === kind.toUpperCase() && user.passwordHash === undefined))
    }
    console.log('PASS bootstrap concurrency/idempotence, authorization, login, validation, creator attribution, duplicates, public fields and audit rollback')
    const fixtures = {
      places: { name: 'Beach', description: 'Description', location: 'Alaminos', category: 'Beach' },
      geofences: { location: 'Alaminos', zone: 'Park', radius: '100 m' },
      foods: { name: 'Food', description: 'Local food', avgPrice: 100, where: 'Market', category: 'Snack' },
      'route-prices': { from: 'Alaminos', to: 'Bolinao', vehicle: 'BUS', price: 100, duration: '1h' },
      'transit-routes': { name: 'Route', type: 'BUS', frequency: '30 min' },
    }
    const types = { places: 'place', geofences: 'geofence', foods: 'local_food', 'route-prices': 'route_price', 'transit-routes': 'transit_route' }
    for (const [resource, fixture] of Object.entries(fixtures)) {
      for (const decision of ['approve', 'reject']) {
        const item = await lguResources[resource].model.create({ ...fixture, municipality: 'Alaminos', approvalStatus: 'pending' })
        const review = await call(`admin/approvals/${resource}/${item._id}/${decision}`, token(admin), 'POST', { revision: 0, reason: 'Verify details' })
        assert.equal(review.status, 200)
        const event = await AuditLog.findOne({ action: `${decision}_${types[resource]}`, 'metadata.itemId': String(item._id) })
        assert.ok(event); assert.equal(String(event.actor), String(admin._id)); assert.equal(event.metadata.municipality, 'Alaminos')
        assert.equal((await call(`admin/approvals/${resource}/${item._id}/${decision}`, token(admin), 'POST', { revision: 0, reason: 'Again' })).status, 409)
        assert.equal(await AuditLog.countDocuments({ 'metadata.itemId': String(item._id) }), 1)
      }
    }
    const deletion = await lguResources.places.model.create({ ...fixtures.places, municipality: 'Alaminos', approvalStatus: 'pending', pendingDeletion: true })
    assert.equal((await call(`admin/approvals/places/${deletion._id}/approve`, token(admin), 'POST', { revision: 0 })).body.deleted, true)
    assert.equal((await AuditLog.findOne({ 'metadata.itemId': String(deletion._id) })).metadata.deletion, true)
    for (const query of ['page=0', 'limit=101', 'actor=invalid', 'action[$ne]=anything', 'page=2.5']) assert.equal((await call(`audit-logs?${query}`, superToken)).status, 400)
    const filtered = await call(`audit-logs?action=approve_place&actor=${admin._id}&limit=1`, superToken)
    assert.equal(filtered.status, 200); assert.equal(filtered.body.items.length, 1); assert.equal(filtered.body.total, 2)
    assert.equal(filtered.body.items[0].actor.email, admin.email)
    const next = await call(`audit-logs?action=approve_place&actor=${admin._id}&limit=1&page=2`, superToken)
    assert.notEqual(filtered.body.items[0].id, next.body.items[0].id)
    const accountLog = await call('audit-logs?action=create_lgu_account', superToken)
    assert.equal(accountLog.body.items[0].targetUser.email, lguInput.email)
    assert.equal(accountLog.body.items[0].actor.passwordHash, undefined)
    assert.equal(accountLog.body.items[0].actor.name, undefined)
    assert.ok(!JSON.stringify(accountLog.body).includes(lguInput.password))
    await User.updateOne({ _id: superadmin._id }, { $set: { role: 'EXPLORER' } })
    assert.equal((await call('audit-logs', superToken)).status, 403)
    console.log('PASS ten approval/rejection actions, deletion audit, no failed-decision events, audit filtering/pagination/population and stale role revocation')
  } finally {
    if (server) await new Promise(resolve => server.close(resolve))
    try {
      if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName && /^multraverse_sa_test_[a-f0-9]{16}$/.test(dbName)) {
        for (const collection of await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()) await mongoose.connection.db.collection(collection.name).deleteMany({})
        console.log('Isolated test records removed')
      }
    } finally { await mongoose.disconnect() }
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
