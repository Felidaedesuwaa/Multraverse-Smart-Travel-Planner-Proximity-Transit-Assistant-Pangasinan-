import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
import { moderationFields } from './_moderation'
const localFoodSchema = new Schema({
  ...moderationFields,
  municipality: { type: String, trim: true, index: true },
  name: { type: String, required: true }, description: { type: String, required: true }, avgPrice: { type: Number, required: true, min: 0 },
  where: { type: String, required: true }, category: { type: String, required: true },
}, { ...apiSchemaOptions, timestamps: { createdAt: true, updatedAt: false } })
export const LocalFood = models.LocalFood || model('LocalFood', localFoodSchema)
