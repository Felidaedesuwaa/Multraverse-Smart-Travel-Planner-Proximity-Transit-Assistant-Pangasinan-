import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions, objectId } from './_helpers'

const tripStopSchema = new Schema({
  tripId: { ...objectId(), ref: 'Trip', index: true }, name: { type: String, required: true },
  address: String, order: { type: Number, required: true },
  placeId: { type: Schema.Types.ObjectId, ref: 'Place' }, day: Number, date: String, time: String,
  estimatedCost: Number, details: Schema.Types.Mixed,
}, { ...apiSchemaOptions, timestamps: { createdAt: true, updatedAt: false } })
export const TripStop = models.TripStop || model('TripStop', tripStopSchema)
