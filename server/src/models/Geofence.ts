import { hardenSchema } from './_hardening'
import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
import { moderationFields } from './_moderation'
import { validateFence } from '../lib/geofence'
const geofenceSchema = new Schema({
  ...moderationFields,
  municipality: { type: String, trim: true, index: true },
  coordinates: { lat: { type: Number, min: -90, max: 90 }, lng: { type: Number, min: -180, max: 180 } }, radiusMeters: { type: Number, min: 10, max: 10000 }, advisory: String,
  dwellSeconds: { type: Number, min: 30, max: 86400, default: 120, validate: { validator: Number.isInteger, message: 'Dwell time must be a whole number of seconds.' } },
  location: { type: String, required: true }, zone: { type: String, required: true }, radius: { type: String, required: true }, coord: String,
  x: { type: Number, default: 50 }, y: { type: Number, default: 50 }, active: { type: Boolean, default: true }, alerts: { type: Number, default: 0 },
}, apiSchemaOptions)
hardenSchema(geofenceSchema, 'Geofence')
geofenceSchema.pre('validate', function(this: any) {
  if (this.isNew || ['coordinates', 'radiusMeters', 'radius', 'coord'].some(k => this.isModified(k))) {
    try { validateFence(this) } catch (error: any) { this.invalidate('coordinates', error.message) }
  }
})
geofenceSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], async function() {
  const update: any = this.getUpdate(), values = update?.$set || update
  if (!values || !['coordinates', 'radiusMeters', 'radius', 'coord'].some(k => k in values) && !update?.$unset?.coordinates && !update?.$unset?.radiusMeters) return
  if ((this as any).op === 'updateMany') throw new Error('Edit geofence boundaries individually.')
  const current = await this.model.findOne(this.getFilter()).lean()
  if (!current) return
  const merged = { ...current, ...values }
  for (const key of Object.keys(update.$unset || {})) delete merged[key]
  validateFence(merged)
})
export const Geofence = models.Geofence || model('Geofence', geofenceSchema)
