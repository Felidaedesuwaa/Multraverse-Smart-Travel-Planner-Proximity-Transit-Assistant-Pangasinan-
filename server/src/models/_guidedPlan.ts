import { Schema } from 'mongoose'
import { hardenSchema } from './_hardening'

const nested = (fields: Record<string, any>) => { const s = new Schema(fields, { _id: false, minimize: false }); hardenSchema(s, 'GuidedSnapshot'); return s }
const strings = { type: [String], default: undefined, maxItems: 100 }
export const guidedPlanSchema = nested({
  request: { type: nested({ areaId: String, tripTypes: strings, activities: strings, travelerType: String, travelStyle: String,
    date: String, travelers: Number, budget: Number, days: Number, lodgingId: String, transportModes: strings, preferences: strings,
    returnToOrigin: Boolean, startTime: String, mealBudget: Number, hotelRooms: Number,
    fareInputs: { type: [nested({ mode: String, tableId: String, km: Number, rides: Number, allowance: Number, referenceAccepted: Boolean })], maxItems: 5 } }), required: true },
  stops: { type: [nested({ time: String, title: String, subtitle: String, tag: String, price: Number, iconKey: String, day: Number, entryId: String })], maxItems: 60 },
  breakdown: { type: nested({ Transit: Number, Attraction: Number, Food: Number, Shopping: Number, Lodging: Number }), required: true },
  estimated: Number, warnings: strings, budgetComplete: Boolean, mealAllocation: Number, mode: String, chosenIds: strings, generatedAt: String,
  costEstimate: { type: nested({ meals: Number, transportTotal: Number, min: Number, max: Number, perPersonMin: Number, perPersonMax: Number, remainingMin: { type: Number, min: -1000000000 }, remainingMax: { type: Number, min: -1000000000 }, status: String, note: String,
    lodging: { type: nested({ min: Number, max: Number, nights: Number, rooms: Number, note: String }), default: null },
    transport: { type: [nested({ mode: String, rides: Number, perRide: Number, total: Number, basis: String, note: String, source: String })], maxItems: 5 },
  }), default: undefined },
})
