const mongoose = require('mongoose')
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env'), quiet: true })
const dbName = process.argv[2]
if (!/^multraverse_lgu_test_[a-f0-9]{16}$/.test(dbName || '')) throw new Error('Only randomly named LGU test databases can be cleaned')
;(async () => {
  try {
    await mongoose.connect(process.env.LGU_TEST_MONGODB_URI || process.env.MONGODB_URI, { dbName, serverSelectionTimeoutMS: 10000 })
    if (mongoose.connection.name !== dbName) throw new Error('Unexpected database')
    for (const collection of await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()) await mongoose.connection.db.collection(collection.name).deleteMany({})
    console.log('Removed records from isolated LGU test database')
  } finally { await mongoose.disconnect() }
})().catch(error => { console.error(error.message); process.exitCode = 1 })
