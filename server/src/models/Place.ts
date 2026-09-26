import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
import { moderationFields } from './_moderation'
const placeSchema = new Schema({
  ...moderationFields,
  name: { type: String, required: true }, description: { type: String, required: true }, location: { type: String, required: true },
  municipality: { type: String, required: true }, category: { type: String, required: true }, entryFee: { type: Number, min: 0, default: null },
  areaId: { type: String, index: true },
  coordinates: { lat: { type: Number, min: -90, max: 90 }, lng: { type: Number, min: -180, max: 180 } },
  visitMinutes: { type: Number, min: 15, max: 480 }, bestTime: String,
  feeBasis: { type: String, enum: ['person', 'group'], default: 'person' },
  accessibility: { type: String, enum: ['verified', 'unknown', 'not-accessible'], default: 'unknown' },
  tags: [String], sourceUrl: String, verifiedAt: Date,
  openingMinutes: { type: Number, min: 0, max: 1439 }, closingMinutes: { type: Number, min: 1, max: 1440 },
  closedWeekdays: [{ type: Number, min: 0, max: 6 }],
  openHours: String, tips: String, highlights: String,
}, { ...apiSchemaOptions, timestamps: { createdAt: true, updatedAt: false } })
export const Place = models.Place || model('Place', placeSchema)
