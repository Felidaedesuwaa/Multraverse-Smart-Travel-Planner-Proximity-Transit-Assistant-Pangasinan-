// Retires the one-to-one collection without overwriting existing user preferences.
const { MongoClient } = require('mongodb')
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env'), quiet: true })
const args = process.argv.slice(2)
const apply = args.includes('--apply')
const drop = args.includes('--drop-legacy')
if (args.some(a => !['--apply', '--dry-run', '--drop-legacy'].includes(a)) || (apply && args.includes('--dry-run')) || (drop && !apply)) throw new Error('Use --dry-run or --apply [--drop-legacy]')
const same = (a, b) => a?.monthlyBudget === b.monthlyBudget && a?.savingsTarget === b.savingsTarget
async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    const db = client.db()
    if (db.databaseName !== 'multraverse') throw new Error('This reviewed migration targets multraverse only')
    const source = db.collection('budgetsettings'), users = db.collection('users')
    if (!(await db.listCollections({ name: 'budgetsettings' }).hasNext())) { console.log('Legacy collection already absent'); return }
    const entries = await source.find({}).toArray()
    const seen = new Map()
    for (const entry of entries) {
      const { monthlyBudget, savingsTarget } = entry
      if (typeof monthlyBudget !== 'number' || !Number.isFinite(monthlyBudget) || monthlyBudget < 0 || monthlyBudget > 1e9 || typeof savingsTarget !== 'number' || !Number.isFinite(savingsTarget) || savingsTarget < 0 || savingsTarget > 100) throw new Error('Legacy preferences are invalid; no changes made')
      const user = await users.findOne({ _id: entry.userId }, { projection: { budgetSettings: 1 } })
      if (!user) throw new Error('Legacy preferences have no matching owner; no changes made')
      const previous = seen.get(String(entry.userId)) || user.budgetSettings
      if (previous && !same(previous, entry)) throw new Error('Conflicting preferences require review; no changes made')
      seen.set(String(entry.userId), entry)
    }
    console.log(JSON.stringify({ database: db.databaseName, legacyRecords: entries.length, owners: seen.size, mode: apply ? 'apply' : 'dry-run' }))
    if (!apply) return
    for (const entry of entries) {
      await users.updateOne({ _id: entry.userId, $or: [{ budgetSettings: { $exists: false } }, { budgetSettings: null }] }, { $set: { budgetSettings: { monthlyBudget: entry.monthlyBudget, savingsTarget: entry.savingsTarget } } })
      const user = await users.findOne({ _id: entry.userId }, { projection: { budgetSettings: 1 } })
      if (!same(user?.budgetSettings, entry)) throw new Error('Copy verification failed; legacy collection retained')
    }
    if (drop) {
      const current = await source.find({}).toArray()
      if (current.length !== entries.length || current.some(e => !entries.some(old => String(old._id) === String(e._id) && String(old.userId) === String(e.userId) && same(old, e)))) throw new Error('Legacy collection changed during migration; refusing drop')
      await source.drop()
      if (await db.listCollections({ name: 'budgetsettings' }).hasNext()) throw new Error('Legacy collection is still present')
    }
    console.log(JSON.stringify({ preferencesVerified: entries.length, legacyDropped: drop }))
  } finally { await client.close() }
}
main().catch(error => { console.error(`Preference migration stopped (${error.name}, code ${error.code || 'unavailable'}): ${error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[redacted]')}`); process.exitCode = 1 })
