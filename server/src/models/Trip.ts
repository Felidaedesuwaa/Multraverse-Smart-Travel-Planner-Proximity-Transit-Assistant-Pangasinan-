import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions, objectId } from './_helpers'

const tripSchema = new Schema({
  plannerId: { type: String, unique: true, sparse: true },
  estimatedCost: { type: Number, min: 0 }, plan: Schema.Types.Mixed,
  userId: { ...objectId(), ref: 'User', index: true },
  title: { type: String, required: true }, location: { type: String, required: true }, date: { type: String, required: true },
  status: { type: String, enum: ['UPCOMING', 'COMPLETED'], default: 'UPCOMING' },
  budget: { type: Number, default: 0 }, spent: { type: Number, default: 0 }, stops: { type: Number, default: 0 }, icon: { type: String, default: 'landmark' },
}, apiSchemaOptions)
tripSchema.virtual('tripStops', { ref: 'TripStop', localField: '_id', foreignField: 'tripId' })
export const Trip = models.Trip || model('Trip', tripSchema)
