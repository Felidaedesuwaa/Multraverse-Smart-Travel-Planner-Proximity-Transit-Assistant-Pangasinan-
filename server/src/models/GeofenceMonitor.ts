import { Schema, model } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
import { Geofence } from './Geofence'

const schema = new Schema({
  userId: { type: String, required: true, unique: true },
  lastTimestamp: { type: Number, default: 0 },
  states: { type: Schema.Types.Mixed, default: {} },
  counts: { type: Map, of: Number, default: {} },
  events: { type: [new Schema({ zoneId: String, location: String, message: String, type: { type: String, enum: ['entry', 'exit', 'dwell'] }, timestamp: Date }, { _id: true })], default: [] },
}, { ...apiSchemaOptions, optimisticConcurrency: true, autoCreate: false, autoIndex: false, strict: 'throw' })
export const GeofenceMonitor = model('GeofenceMonitor', schema)

export async function prepareGeofenceStorage() {
  await GeofenceMonitor.createCollection({ validator: { $jsonSchema: schema.toJSONSchema({ useBsonType: true }) } })
  await GeofenceMonitor.createIndexes()
  // Preserve the installed validator and add only the new optional dwell field.
  const db = GeofenceMonitor.db.db!
  const existing = await db.listCollections({ name: 'geofences' }).next()
  // Geofences may not have been created yet because their schema disables
  // autoCreate. Provision only the absent collection; preserve existing data.
  if (!existing) {
    await Geofence.createCollection({ validator: { $jsonSchema: Geofence.schema.toJSONSchema({ useBsonType: true }) } })
    await Geofence.createIndexes()
    return
  }
  const validator = existing && 'options' in existing ? existing.options?.validator : undefined
  if (validator?.$jsonSchema?.properties && !validator.$jsonSchema.properties.dwellSeconds) {
    validator.$jsonSchema.properties.dwellSeconds = { bsonType: ['number', 'null'], minimum: 30, maximum: 86400 }
    await db.command({ collMod: 'geofences', validator })
  }
}
