import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions, objectId } from './_helpers'
const savedPlaceSchema = new Schema({
  userId: { ...objectId(), ref: 'User', index: true }, name: { type: String, required: true }, category: { type: String, required: true },
  description: { type: String, default: '' }, icon: { type: String, default: 'landmark' },
  rating: { type: Number, default: 0, min: 0, max: 5 }, reviewCount: { type: Number, default: 0 },
  userNote: { type: String, default: '' }, photos: [{ type: String }],
  isPublic: { type: Boolean, default: true }, addedToTrip: { type: Boolean, default: false },
}, { ...apiSchemaOptions, timestamps: { createdAt: true, updatedAt: false } })
export const SavedPlace = models.SavedPlace || model('SavedPlace', savedPlaceSchema)
