import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
const transitRouteSchema = new Schema({
  name: { type: String, required: true }, type: { type: String, enum: ['BUS', 'JEEPNEY', 'TRICYCLE', 'VAN'], required: true },
  stops: { type: Number, default: 0 }, frequency: { type: String, required: true }, passengers: { type: Number, default: 0 },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  areaIds: [String], stopNames: [String], firstDeparture: String, lastDeparture: String,
  verifiedAt: Date, sourceUrl: String,
}, apiSchemaOptions)
export const TransitRoute = models.TransitRoute || model('TransitRoute', transitRouteSchema)
