import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
const geofenceSchema = new Schema({
  location: { type: String, required: true }, zone: { type: String, required: true }, radius: { type: String, required: true }, coord: String,
  x: { type: Number, default: 50 }, y: { type: Number, default: 50 }, active: { type: Boolean, default: true }, alerts: { type: Number, default: 0 },
}, apiSchemaOptions)
export const Geofence = models.Geofence || model('Geofence', geofenceSchema)
