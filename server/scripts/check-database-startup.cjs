// In-memory startup checks: no MongoDB connection or account changes.
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { collectionNames } = require('../dist/models/_collections');
const { verifyDatabaseLayout, DatabaseLayoutError, databaseStartupMessage } = require('../dist/lib/db');
const collections = Object.values(collectionNames).map(name => ({ name, options: { validator: { $jsonSchema: {} } } }));
const originalDatabase = mongoose.connection.db;
mongoose.connection.db = { listCollections: () => ({ toArray: async () => collections }) };
(async () => {
  try {
    await verifyDatabaseLayout();
    const missing = collections.pop();
    await assert.rejects(verifyDatabaseLayout(), error => error instanceof DatabaseLayoutError && error.message.includes(missing.name));
    collections.push(missing);
    await verifyDatabaseLayout();
    assert(databaseStartupMessage(new DatabaseLayoutError([missing.name])).includes('--create-missing-only'));
    assert(databaseStartupMessage({ code: 13 }).includes('permission'));
    for (const failure of [Object.assign(new Error('mongodb+srv://private:credential@private-host'), { name: 'MongoServerError', code: 85 }), null, { name: 'private credential' }]) {
      const message = databaseStartupMessage(failure);
      assert(!message.includes('mongodb') && !message.includes('credential') && !message.includes('private-host'), 'Startup logs never expose private connection details');
    }
    console.log('PASS: current collection layout, missing collection detection, recovery instructions, and safe startup diagnostics.');
  } finally { mongoose.connection.db = originalDatabase; }
})().catch(error => { console.error(error); process.exitCode = 1; });
