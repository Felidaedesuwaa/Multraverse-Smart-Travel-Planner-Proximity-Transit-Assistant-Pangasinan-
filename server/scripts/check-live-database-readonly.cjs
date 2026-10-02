const { sessionCredential } = require('../dist/lib/sessionCredential');
// Existing-account GET smoke checks only. No login, seeding, inserts or deletes.
const assert = require('node:assert/strict')
const { MongoClient } = require('mongodb')
const jwt = require('jsonwebtoken')
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env'), quiet: true })
async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    const db = client.db()
    const account = await db.collection('users').findOne({ role: 'ADMIN' }, { projection: { _id: 1, role: 1, passwordHash: 1 } })
      || await db.collection('users').findOne({}, { projection: { _id: 1, role: 1, passwordHash: 1 } })
    assert.ok(account, 'An existing account is required for GET verification')
    const token = jwt.sign({ userId: String(account._id), role: account.role, credential: sessionCredential(account.passwordHash) }, process.env.JWT_SECRET, { expiresIn: '2m' })
    const paths = ['/api/trips', '/api/budget', '/api/budget/settings', '/api/places', '/api/ai/phrasebook', '/api/ai/planner/catalog']
    if (account.role === 'ADMIN') paths.push('/api/analytics', '/api/analytics/dashboard')
    for (const path of paths) {
      const response = await fetch(`http://127.0.0.1:${process.env.PORT || 3001}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) })
      assert.equal(response.status, 200, path)
      const body = await response.json()
      if (path === '/api/budget/settings') assert.deepEqual(Object.keys(body).sort(), ['monthlyBudget', 'savingsTarget'])
      console.log(`PASS GET ${path}`)
    }
    assert.equal(await db.listCollections({ name: 'budgetsettings' }).hasNext(), false, 'GET recreated obsolete settings collection')
    assert.equal(await db.listCollections({ name: 'tripstops' }).hasNext(), false, 'Obsolete stops collection was recreated')
    console.log('PASS: read endpoints work without recreating retired collections; no fixtures persisted')
  } finally { await client.close() }
}
main().catch(error => { console.error(`Read-only live check failed: ${error.name}: ${error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[redacted]')}`); process.exitCode = 1 })
