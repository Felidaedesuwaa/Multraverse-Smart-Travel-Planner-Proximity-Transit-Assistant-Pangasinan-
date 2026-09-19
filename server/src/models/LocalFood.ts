import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
const localFoodSchema = new Schema({
  name: { type: String, required: true }, description: { type: String, required: true }, avgPrice: { type: Number, required: true },
  where: { type: String, required: true }, category: { type: String, required: true },
}, { ...apiSchemaOptions, timestamps: { createdAt: true, updatedAt: false } })
export const LocalFood = models.LocalFood || model('LocalFood', localFoodSchema)
