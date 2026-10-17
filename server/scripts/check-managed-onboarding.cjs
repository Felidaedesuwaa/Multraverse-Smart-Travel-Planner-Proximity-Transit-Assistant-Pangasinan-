// Real HTTP handlers and crypto with in-memory persistence; no external accounts touched.
const assert = require('node:assert/strict')
const { randomBytes } = require('node:crypto')
const mongoose = require('mongoose')
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
process.env.JWT_SECRET = randomBytes(32).toString('hex')
const { User, AuditLog } = require('../dist/models')
const { PasswordReset } = require('../dist/models/PasswordReset')
const { AuthLimit } = require('../dist/models/AuthLimit')
const { RevokedSession } = require('../dist/models/AccountSecurity')
const { managedAccountInput, createManagedAccount } = require('../dist/lib/managedAccounts')
const { sessionCredential } = require('../dist/lib/sessionCredential')
const users = new Map(), audits = []
const query = value => ({ select: () => ({ then: resolve => resolve(value), populate: async () => value }) })
User.findById = id => query(users.get(String(id)))
User.findOne = filter => query([...users.values()].find(user => user.email === filter.email))
User.create = async ([input]) => {
  const row = { ...input, _id: randomBytes(12).toString('hex') }
  row.toJSON = () => ({ id: row._id, name: row.name, email: row.email, role: row.role })
  users.set(row._id, row)
  return [row]
}
User.updateOne = async (filter, update) => {
  const row = users.get(String(filter._id))
  if (!row || row.passwordHash !== filter.passwordHash) return { modifiedCount: 0 }
  Object.assign(row, update.$set)
  return { modifiedCount: 1 }
}
AuditLog.create = async rows => audits.push(...rows)
PasswordReset.deleteMany = async () => ({ deletedCount: 0 })
AuthLimit.findOneAndUpdate = async () => ({ count: 1 })
RevokedSession.exists = async () => false
mongoose.startSession = async () => ({ withTransaction: async fn => fn(), endSession: async () => {} })
mongoose.connection.transaction = async fn => fn({})
const app = express()
app.use(express.json())
app.use('/auth', require('../dist/routes/auth').default)
app.get('/private', require('../dist/middleware/auth').authenticate, (_, res) => res.json({ ok: true }))
let server
;(async () => {
  server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)) })
  const call = async (path, body, token) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, body: await response.json() }
  }
  for (const role of ['LGU', 'ADMIN']) {
    const input = { name: 'Juan Reyes', email: role === 'ADMIN' ? 'admin.juan.reyes@multraverse.ph' : 'lgu@multraverse.ph', ...(role === 'LGU' ? { municipality: 'Alaminos' } : {}) }
    for (const invalid of [{ ...input, name: '' }, { ...input, name: 'Juan123' }, { ...input, password: 'Creator123!' }, { ...input, mustChangePassword: false }]) assert.throws(() => managedAccountInput(invalid, role))
    const created = await createManagedAccount(managedAccountInput(input, role), role, randomBytes(12).toString('hex'))
    const user = users.get(created.id)
    assert.equal(user.name, input.name)
    assert.equal(user.mustChangePassword, true)
    assert.ok(await bcrypt.compare(created.temporaryPassword, user.passwordHash))
    const login = await call('/auth/login', { email: input.email, password: created.temporaryPassword })
    assert.equal(login.body.passwordChangeRequired, true)
    assert.equal(login.body.token, undefined)
    const challengeToken = login.body.challengeToken
    assert.equal((await call('/private', null, challengeToken)).status, 401)
    const forgedSession = jwt.sign({ userId: user._id, role, mfa: true, credential: sessionCredential(user.passwordHash) }, process.env.JWT_SECRET)
    assert.equal((await call('/private', null, forgedSession)).status, 401)
    const payload = { challengeToken, currentPassword: created.temporaryPassword, newPassword: 'PersonalPass2026_' }
    for (const invalid of [{ ...payload, newPassword: 'weak' }, { ...payload, newPassword: created.temporaryPassword }, { ...payload, currentPassword: 'Wrong123!' }]) assert.equal((await call('/auth/password/first-sign-in', invalid)).status, 400)
    assert.equal(user.mustChangePassword, true)
    const changed = await call('/auth/password/first-sign-in', payload)
    assert.equal(changed.status, 200, JSON.stringify(changed.body))
    assert.equal(changed.body.mfaRequired, true)
    assert.equal(changed.body.token, undefined)
    assert.equal(user.mustChangePassword, false)
    assert.equal((await call('/auth/password/first-sign-in', payload)).status, 401)
    assert.equal((await call('/auth/login', { email: input.email, password: created.temporaryPassword })).status, 401)
    assert.equal((await call('/auth/login', { email: input.email, password: payload.newPassword })).body.mfaRequired, true)
    assert.equal((await call('/private', null, changed.body.challengeToken)).status, 401)
    assert.ok(!JSON.stringify(audits).includes(created.temporaryPassword))
  }
  console.log('PASS LGU/Admin generated passwords, names, validation, restricted first sign-in, password replacement, replay rejection and MFA continuation')
})().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => server?.close())
