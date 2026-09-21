import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
const routePriceSchema = new Schema({
  from: { type: String, required: true }, to: { type: String, required: true }, vehicle: { type: String, required: true },
  price: { type: Number, required: true }, duration: { type: String, required: true }, notes: String,
  fromAreaId: String, toAreaId: String, transitRouteId: { type: Schema.Types.ObjectId, ref: 'TransitRoute' },
  durationMinutes: { type: Number, min: 1 }, fareBasis: { type: String, enum: ['person', 'vehicle'] },
  capacity: { type: Number, min: 1 }, verifiedAt: Date, sourceUrl: String,
}, { ...apiSchemaOptions, timestamps: { createdAt: true, updatedAt: false } })
export const RoutePrice = models.RoutePrice || model('RoutePrice', routePriceSchema)
