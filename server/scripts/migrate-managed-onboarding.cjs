// Add only the optional first-sign-in flag, preserving the existing validator.
require('../dist/lib/environment')
const mongoose = require('mongoose')
const { databaseStartupMessage } = require('../dist/lib/db')

async function migrateManagedOnboarding(db) {
  const [info] = await db.listCollections({ name: 'users' }).toArray()
  const validator = info?.options?.validator
  if (!validator?.$jsonSchema?.properties) throw new Error('Existing user JSON schema validator is required')
  if (validator.$jsonSchema.properties.mustChangePassword) return false
  validator.$jsonSchema.properties.mustChangePassword = { bsonType: ['bool', 'null'] }
  await db.command({ collMod: 'users', validator })
  return true
}

module.exports = { migrateManagedOnboarding }
if (require.main === module) (async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
    const changed = await migrateManagedOnboarding(mongoose.connection.db)
    console.log(changed ? 'User validator now supports first-sign-in password changes. No account records were changed.' : 'User validator already supports first-sign-in password changes.')
  } catch (error) { console.error(databaseStartupMessage(error)); process.exitCode = 1 }
  finally { await mongoose.disconnect() }
})()
