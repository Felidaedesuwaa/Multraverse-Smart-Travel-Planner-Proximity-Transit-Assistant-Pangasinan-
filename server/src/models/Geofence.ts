import { hardenSchema } from './_hardening'
import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
import { moderationFields } from './_moderation'
const geofenceSchema = new Schema({
  ...moderationFields,
  municipality: { type: String, trim: true, index: true },
  coordinates: { lat: { type: Number, min: -90, max: 90 }, lng: { type: Number, min: -180, max: 180 } }, radiusMeters: Number, advisory: String,
  location: { type: String, required: true }, zone: { type: String, required: true }, radius: { type: String, required: true }, coord: String,
  x: { type: Number, default: 50 }, y: { type: Number, default: 50 }, active: { type: Boolean, default: true }, alerts: { type: Number, default: 0 },
}, apiSchemaOptions)
hardenSchema(geofenceSchema, 'Geofence')
export const Geofence = models.Geofence || model('Geofence', geofenceSchema)
