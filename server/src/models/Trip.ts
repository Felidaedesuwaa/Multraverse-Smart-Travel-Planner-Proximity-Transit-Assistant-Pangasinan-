import { hardenSchema } from './_hardening'
import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions, objectId } from './_helpers'
import { planSchema } from './_plan'

const tripSchema = new Schema({
  plannerId: { type: String, unique: true, sparse: true },
  plan: { type: planSchema, default: undefined },
  userId: { ...objectId(), ref: 'User', index: true },
  title: { type: String, required: true }, location: { type: String, required: true }, date: { type: String, required: true },
  status: { type: String, enum: ['UPCOMING', 'COMPLETED'], default: 'UPCOMING' },
  budget: { type: Number, min: 0, default: 0 }, icon: { type: String, default: 'landmark' },
}, apiSchemaOptions)
tripSchema.virtual('tripStops').get(function(this: any) {
  if (this.plan?.guided) return this.plan.guided.stops.map((stop: any, order: number) => ({
    placeId: stop.entryId, name: stop.title, order, day: stop.day, time: stop.time, estimatedCost: stop.price,
  }))
  return (this.plan?.days || []).flatMap((day: any) => day.stops.map((stop: any, order: number) => ({
    placeId: stop.placeId, name: stop.place, address: stop.address, order, day: day.day, date: day.date, time: stop.time, estimatedCost: stop.estimatedCost,
  })))
})
tripSchema.virtual('stops').get(function(this: any) { return this.tripStops.length })
tripSchema.virtual('estimatedCost').get(function(this: any) { return this.plan?.costs?.knownTotal })
tripSchema.set('minimize', false)
hardenSchema(tripSchema, 'Trip')
export const Trip = models.Trip || model('Trip', tripSchema)
