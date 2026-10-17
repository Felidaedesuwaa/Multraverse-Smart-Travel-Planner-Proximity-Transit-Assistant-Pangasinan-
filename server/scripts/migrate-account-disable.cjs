// Add only the optional disabled field to the existing validator; preserve all other rules.
require('../dist/lib/environment');
const mongoose = require('mongoose');
const { databaseStartupMessage } = require('../dist/lib/db');
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    const db = mongoose.connection.db;
    const [info] = await db.listCollections({ name: 'users' }).toArray();
    if (!info) throw new Error('Users collection is missing');
    const validator = info.options?.validator;
    if (!validator?.$jsonSchema?.properties) throw new Error('Existing user JSON schema validator is required');
    validator.$jsonSchema.properties.disabled = { bsonType: ['bool', 'null'] };
    await db.command({ collMod: 'users', validator });
    console.log('User validator supports temporary disabling. No account records were changed.');
  } catch (error) { console.error(databaseStartupMessage(error)); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
})();
