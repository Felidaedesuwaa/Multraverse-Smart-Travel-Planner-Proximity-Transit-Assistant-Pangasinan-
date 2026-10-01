import { Schema } from 'mongoose'

export function pointFor(value: any) {
  if (value == null || (value.lat == null && value.lng == null)) return undefined
  if (typeof value.lat !== 'number' || !Number.isFinite(value.lat) || Math.abs(value.lat) > 90 || typeof value.lng !== 'number' || !Number.isFinite(value.lng) || Math.abs(value.lng) > 180) throw new Error('Coordinates require valid latitude and longitude')
  return { type: 'Point', coordinates: [value.lng, value.lat] }
}

export function addGeo(schema: Schema) {
  schema.add({ geoPoint: { type: new Schema({
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true, validate: { validator: (v: number[]) => v.length === 2 && v.every(Number.isFinite) && Math.abs(v[0]) <= 180 && Math.abs(v[1]) <= 90, message: 'Invalid GeoJSON coordinates' } },
  }, { _id: false, strict: 'throw', strictQuery: true }), default: undefined } })
  schema.index({ geoPoint: '2dsphere' })
  schema.pre('validate', function() {
    if (this.isNew || this.isModified('coordinates')) this.set('geoPoint', pointFor(this.get('coordinates')))
  })
  schema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function() {
    const update: any = this.getUpdate()
    if (!update || Array.isArray(update)) return
    const set = update.$set || update
    if (Object.keys(set).some(k => k.startsWith('coordinates.'))) throw new Error('Update coordinates as a complete latitude/longitude pair')
    if (Object.prototype.hasOwnProperty.call(set, 'coordinates')) {
      const point = pointFor(set.coordinates)
      if (point) set.geoPoint = point
      else { delete set.geoPoint; update.$unset = { ...update.$unset, geoPoint: 1 } }
    }
    if (update.$unset?.coordinates) update.$unset.geoPoint = 1
  })
}
