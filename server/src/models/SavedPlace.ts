import { hardenSchema } from './_hardening'
import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions, objectId } from './_helpers'
const savedPlaceSchema = new Schema({
  placeId: { type: Schema.Types.ObjectId, ref: 'Place' },
  userId: { ...objectId(), ref: 'User', index: true }, name: { type: String, required: true, catalogName: true }, category: { type: String, required: true },
  categories: { type: [String], default: undefined, maxItems: 3, validate: (values: string[]) => values == null || (values.length >= 1 && values.length <= 3 && new Set(values).size === values.length), enum: ['Nature Park', 'Beach', 'Religious', 'Restaurant', 'Landmark', 'Waterway'] },
  description: { type: String, default: '' }, icon: { type: String, default: 'landmark' },
  rating: { type: Number, default: 0, min: 0, max: 5 }, reviewCount: { type: Number, default: 0 },
  userNote: { type: String, default: '' }, photos: { type: [String], maxItems: 3, default: [], validate: (photos: string[]) => photos.every(photo => typeof photo === "string" && photo.length <= 250000) },
  isPublic: { type: Boolean, default: true }, addedToTrip: { type: Boolean, default: false },
}, { ...apiSchemaOptions, timestamps: { createdAt: true, updatedAt: false } })
hardenSchema(savedPlaceSchema, 'SavedPlace')
export const SavedPlace = models.SavedPlace || model('SavedPlace', savedPlaceSchema)
