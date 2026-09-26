import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
import { moderationFields } from './_moderation'
const geofenceSchema = new Schema({
  ...moderationFields,
  municipality: { type: String, trim: true, index: true },
  coordinates: { lat: Number, lng: Number }, radiusMeters: Number, advisory: String,
  location: { type: String, required: true }, zone: { type: String, required: true }, radius: { type: String, required: true }, coord: String,
  x: { type: Number, default: 50 }, y: { type: Number, default: 50 }, active: { type: Boolean, default: true }, alerts: { type: Number, default: 0 },
}, apiSchemaOptions)
export const Geofence = models.Geofence || model('Geofence', geofenceSchema)
