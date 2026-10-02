// Regression: the audit reference validator must see the user before deletion.
// Exercises the real DELETE handler and AuditLog validation without a database.
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { User, AuditLog, Trip, BudgetEntry, SavedPlace } = require('../dist/models')
const { PlannerDraft } = require('../dist/models/PlannerDraft')
const { PasswordReset } = require('../dist/models/PasswordReset')
const { PendingRegistration } = require('../dist/models/PendingRegistration')
const router = require('../dist/routes/users').default
const actor = new mongoose.Types.ObjectId()
const target = new mongoose.Types.ObjectId()
const originals = []
function replace(object, key, value) { originals.push(() => { object[key] = value }); object[key] = value }
;(async () => {
  try {
    for (const role of ['ADMIN', 'LGU']) {
      let exists = true
      let audited = false
      const user = { _id: target, email: 'managed@multraverse.ph', role, ...(role === 'LGU' ? { municipality: 'Dagupan' } : {}) }
      replace(mongoose.connection, 'transaction', async work => work(null))
      replace(User, 'findOne', () => ({ session: async () => exists ? user : null }))
      replace(User, 'exists', ({ _id }) => ({ session: async () => String(_id) === String(actor) || exists ? { _id } : null }))
      replace(AuditLog, 'create', async documents => {
        await new AuditLog(documents[0]).validate()
        assert.equal(documents[0].action, `delete_${role.toLowerCase()}_account`)
        audited = true
      })
      replace(User, 'findOneAndDelete', async () => { assert.ok(audited, 'Audit must validate before removal'); exists = false; return user })
      for (const model of [Trip, BudgetEntry, SavedPlace, PlannerDraft, PasswordReset, PendingRegistration]) replace(model, 'deleteMany', async () => ({}))
      const route = router.stack.find(layer => layer.route?.path === `/${role.toLowerCase()}-accounts/:id` && layer.route.methods.delete).route
      const handler = route.stack.at(-1).handle
      let response
      const res = { status(code) { this.statusCode = code; return this }, json(body) { response = body } }
      await handler({ params: { id: String(target) }, userId: String(actor), body: { confirmation: true } }, res, error => { throw error })
      assert.equal(res.statusCode, undefined)
      assert.equal(response.message, 'Account deleted.')
      assert.equal(exists, false)
      while (originals.length) originals.pop()()
    }
    console.log('PASS ADMIN and LGU deletion validates audit references before removing the account')
  } finally { while (originals.length) originals.pop()() }
})().catch(error => { console.error(error); process.exitCode = 1 })
