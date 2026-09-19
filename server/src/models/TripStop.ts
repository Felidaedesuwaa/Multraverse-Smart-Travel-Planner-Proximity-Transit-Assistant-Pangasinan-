import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions, objectId } from './_helpers'

const tripStopSchema = new Schema({
  tripId: { ...objectId(), ref: 'Trip', index: true }, name: { type: String, required: true },
  address: String, order: { type: Number, required: true },
}, { ...apiSchemaOptions, timestamps: { createdAt: true, updatedAt: false } })
export const TripStop = models.TripStop || model('TripStop', tripStopSchema)
