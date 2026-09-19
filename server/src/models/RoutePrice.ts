import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
const routePriceSchema = new Schema({
  from: { type: String, required: true }, to: { type: String, required: true }, vehicle: { type: String, required: true },
  price: { type: Number, required: true }, duration: { type: String, required: true }, notes: String,
}, { ...apiSchemaOptions, timestamps: { createdAt: true, updatedAt: false } })
export const RoutePrice = models.RoutePrice || model('RoutePrice', routePriceSchema)
