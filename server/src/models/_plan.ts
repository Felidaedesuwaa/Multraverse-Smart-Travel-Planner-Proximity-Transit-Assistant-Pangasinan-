import { Schema } from 'mongoose'
import { hardenSchema } from './_hardening'
import areas from '../data/plannerAreas.json'
import { guidedPlanSchema } from './_guidedPlan'

// Plans are bounded, immutable-in-meaning snapshots of the catalog at planning time.
// IDs in snapshots are provenance strings, not live foreign keys: catalog deletion
// must not erase a traveler's saved history.
const text = (max = 2000, required = false) => ({ type: String, maxlength: max, required })
const num = (min = 0, max = 1000000000, required = false) => ({ type: Number, min, max, required })
const integer = (min: number, max: number, required = false) => ({ ...num(min, max, required), integer: true, validate: Number.isInteger })
const choice = (values: readonly (string | number)[], required = false) => ({ type: typeof values[0] === 'number' ? Number : String, enum: values, required })
const id = () => ({ type: String, match: /^[a-f\d]{24}$/i, maxlength: 24, required: true })
const area = () => choice(areas.map(a => a.id), true)
const date = () => ({ type: String, match: /^\d{4}-\d{2}-\d{2}$/, maxlength: 10, required: true })
const time = () => ({ type: String, match: /^\d{2}:\d{2}$/, maxlength: 5, required: true })
const list = (type: any, maxItems: number, required = true) => ({ type: [type], maxItems, required, default: undefined })
const document = (definition: Record<string, any>) => {
  const schema = new Schema(definition, { _id: false })
  hardenSchema(schema, 'EmbeddedPlan')
  return schema
}
const origin = document({ areaId: area(), placeId: { ...id(), required: false } })
const destination = document({ areaId: area(), placeIds: list(id(), 30) })
const request = document({
  origin: { type: origin, required: true }, destinations: list(destination, 48),
  dates: { type: document({ start: date() }), required: true }, startTime: time(),
  days: integer(1, 7, true), budget: num(1, 1000000, true), travelers: integer(1, 30, true),
  preferences: list(choice(['Budget-friendly', 'Island hopping', 'Cultural sites', 'Food stops', 'Photography spots', 'Accessible routes']), 6),
  transportModes: list(choice(['bus', 'jeepney', 'tricycle', 'van', 'own-vehicle']), 5),
  pace: choice(['relaxed', 'balanced', 'packed'], true),
  lodging: { type: document({ preference: choice(['none', 'budget', 'standard'], true), nightlyBudget: num(0, 100000, true), rooms: integer(1, 30, true) }), required: true },
  foodPerPersonPerDay: num(0, 10000, true), useSavedPlaces: { type: Boolean, required: true }, returnToOrigin: { type: Boolean, required: true }, excludedPlaceIds: list(id(), 100),
})
const legStep = document({ from: area(), to: area(), vehicle: text(30, true), cost: num(0, 1000000000, true), minutes: num(0, 1440, true), sourceId: id(), verifiedAt: { type: Date, required: true } })
const leg = document({ from: area(), to: area(), status: choice(['recorded', 'unknown'], true), cost: num(), minutes: num(), steps: list(legStep, 48), note: text(2000, true) })
const coordinates = document({ lat: num(-90, 90, true), lng: num(-180, 180, true) })
const stop = document({
  placeId: id(), areaId: area(), place: text(2000, true), address: text(2000, true),
  coordinates: { type: coordinates, default: undefined }, time: time(), endTime: time(), visitMinutes: integer(1, 480, true), bestTime: text(),
  activity: text(10000, true), narrative: text(10000), entryCost: num(), listedEntryEstimate: num(), estimatedCost: num(0, 1000000000, true),
  transit: { type: leg, required: true }, notes: list(text(2000), 100), verifiedAt: Date,
})
const day = document({ day: integer(1, 7, true), date: date(), stops: list(stop, 4), narrative: text(10000), narrativeSource: choice(['database']) })
const food = document({ name: text(2000, true), description: text(10000, true), where: text(2000, true), listedAveragePrice: num(), note: text() })
const fare = document({ sourceId: id(), from: text(2000, true), to: text(2000, true), vehicle: text(30, true), price: num(0, 1000000000, true), basis: choice(['person', 'vehicle', 'unspecified'], true), duration: text(2000, true), notes: text(10000), verifiedAt: Date })
const categories = document({ food: num(0, 1000000000, true), lodging: num(0, 1000000000, true), entry: num(0, 1000000000, true), transport: num(0, 1000000000, true) })
const allocation = document({ food: num(0, 1000000000, true), lodging: num(0, 1000000000, true), entry: num(0, 1000000000, true), transport: num(0, 1000000000, true), buffer: num(0, 1000000000, true) })
const costs = document({
  currency: choice(['PHP'], true), basis: choice(['group'], true), categories: { type: categories, required: true },
  knownTotal: num(0, 1000000000, true), perPerson: num(0, 1000000000, true), budget: num(0, 1000000000, true), remainingKnown: num(-1000000000, 1000000000, true),
  unknownCosts: integer(0, 1000, true), complete: { type: Boolean, required: true }, status: choice(['over-budget', 'empty', 'incomplete', 'within-budget'], true),
})
export const planSchema = document({
  guided: { type: guidedPlanSchema, default: undefined },
  version: choice([1], true), generatedAt: { type: Date, required: true }, mode: choice(['database', 'hybrid'], true), narrativeStatus: text(120, true),
  request: { type: request, required: true }, days: list(day, 7), returnLeg: { type: leg, default: undefined }, localFoods: list(food, 6), fareGuide: list(fare, 12),
  allocation: { type: allocation, required: true }, costs: { type: costs, required: true }, warnings: list(text(2000), 100),
  omitted: list(document({ placeId: { ...id(), required: false }, areaId: { ...area(), required: false }, reason: text(2000, true) }), 1500),
})
