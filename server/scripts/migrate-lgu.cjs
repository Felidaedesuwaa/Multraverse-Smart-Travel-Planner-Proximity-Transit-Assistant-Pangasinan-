// Idempotent backfill. Run after building; ambiguous municipality ownership stays unassigned.
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env'), quiet: true })
const { connectDatabase, disconnectDatabase } = require('../dist/lib/db')
const { lguResources } = require('../dist/lib/lguResources')
async function main() {
  await connectDatabase()
  for (const [name, { model }] of Object.entries(lguResources)) {
    const result = await model.updateMany({ approvalStatus: { $exists: false } }, { $set: { approvalStatus: 'approved' } })
    await model.updateMany({ reviewRevision: { $exists: false } }, { $set: { reviewRevision: 0 } })
    await model.collection.createIndex({ municipality: 1, approvalStatus: 1 })
    console.log(`${name}: ${result.modifiedCount} legacy entries marked approved`)
  }
  console.log('Assign exact municipality values to legacy geofences, food, fares and transit routes before LGU management. Existing Place municipality values are preserved.')
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(disconnectDatabase)
