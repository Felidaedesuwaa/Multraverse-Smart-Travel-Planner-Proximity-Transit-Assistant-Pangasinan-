// Add moderation state only to saved posts which predate admin approval.
require('../dist/lib/environment');
const mongoose = require('mongoose');
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    const posts = mongoose.connection.db.collection('savedplaces');
    const filter = { approvalStatus: { $exists: false } };
    const count = await posts.countDocuments(filter);
    if (!process.argv.includes('--apply')) { console.log(JSON.stringify({ mode: 'dry-run', postsToQueue: count })); return; }
    // Retain the existing collection rules and add only moderation properties.
    const [info] = await mongoose.connection.db.listCollections({ name: 'savedplaces' }).toArray();
    const validator = info?.options?.validator;
    if (validator?.$jsonSchema) {
      const { SavedPlace } = require('../dist/models/SavedPlace');
      const { moderationFields } = require('../dist/models/_moderation');
      const properties = SavedPlace.schema.toJSONSchema({ useBsonType: true }).properties;
      validator.$jsonSchema.properties ||= {};
      for (const key of Object.keys(moderationFields)) validator.$jsonSchema.properties[key] = properties[key];
      await mongoose.connection.db.command({ collMod: 'savedplaces', validator });
    }
    const result = await posts.updateMany(filter, { $set: { approvalStatus: 'pending', reviewRevision: 0, submittedAt: new Date() } });
    console.log(JSON.stringify({ queuedForAdminReview: result.modifiedCount }));
  } catch (error) { console.error('Saved post migration failed:', error.name, error.code || ''); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
})();
