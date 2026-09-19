import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
const placeSchema = new Schema({
  name: { type: String, required: true }, description: { type: String, required: true }, location: { type: String, required: true },
  municipality: { type: String, required: true }, category: { type: String, required: true }, entryFee: { type: Number, default: 0 },
  openHours: String, tips: String, highlights: String,
}, { ...apiSchemaOptions, timestamps: { createdAt: true, updatedAt: false } })
export const Place = models.Place || model('Place', placeSchema)
