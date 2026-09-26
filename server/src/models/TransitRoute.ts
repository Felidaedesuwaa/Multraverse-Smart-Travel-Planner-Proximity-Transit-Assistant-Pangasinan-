import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
import { moderationFields } from './_moderation'
const transitRouteSchema = new Schema({
  ...moderationFields,
  municipality: { type: String, trim: true, index: true },
  name: { type: String, required: true }, type: { type: String, enum: ['BUS', 'JEEPNEY', 'TRICYCLE', 'VAN'], required: true },
  stops: { type: Number, default: 0 }, frequency: { type: String, required: true }, passengers: { type: Number, default: 0 },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  areaIds: [String], stopNames: [String], firstDeparture: String, lastDeparture: String,
  verifiedAt: Date, sourceUrl: String,
}, apiSchemaOptions)
export const TransitRoute = models.TransitRoute || model('TransitRoute', transitRouteSchema)
