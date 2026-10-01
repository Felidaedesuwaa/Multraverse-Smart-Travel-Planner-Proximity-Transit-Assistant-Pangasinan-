import { buildGroundedItinerary } from './groundedItinerary'
// Keep the established Trip / PlannerDraft envelope and its consumers compatible.
export function guidedSnapshot(guided: ReturnType<typeof buildGroundedItinerary>) {
  const r = guided.request
  const leg = { from: r.areaId, to: r.areaId, status: 'unknown', steps: [], note: 'Route and fare unconfirmed; origin not supplied.' }
  const categories = { food: 0, lodging: 0, entry: 0, transport: 0 }
  return {
    version: 1, generatedAt: new Date(guided.generatedAt), mode: guided.mode === 'model-assisted' ? 'hybrid' : 'database', narrativeStatus: guided.mode,
    request: { origin: { areaId: r.areaId }, destinations: [{ areaId: r.areaId, placeIds: [] }], dates: { start: r.date }, startTime: r.startTime,
      days: r.days, budget: r.budget, travelers: r.travelers, preferences: r.preferences, transportModes: r.transportModes.map(m => m === 'Own Vehicle' ? 'own-vehicle' : m.toLowerCase()),
      pace: r.travelStyle === 'adventurous' ? 'packed' : r.travelStyle, lodging: { preference: r.lodgingId ? 'standard' : 'none', nightlyBudget: 0, rooms: r.hotelRooms },
      foodPerPersonPerDay: r.mealBudget, useSavedPlaces: false, returnToOrigin: r.returnToOrigin, excludedPlaceIds: [] },
    days: Array.from({ length: r.days }, (_, i) => ({ day: i+1, date: new Date(Date.parse(r.date) + i*86400000).toISOString().slice(0,10),
      stops: guided.stops.filter(s => s.day === i+1 && s.tag === 'Attraction').map(s => ({ placeId: s.entryId, areaId: r.areaId, place: s.title,
        address: r.areaId, time: /\d{2}:\d{2}/.exec(s.time)?.[0] || r.startTime, endTime: /\d{2}:\d{2}/.exec(s.time)?.[0] || r.startTime,
        visitMinutes: 60, activity: s.subtitle, entryCost: null, estimatedCost: 0, transit: leg, notes: ['Suggested slot only; opening hours and route duration unconfirmed.'] })) })),
    localFoods: [], fareGuide: [], allocation: { ...categories, food: guided.costEstimate.meals, transport: guided.costEstimate.transportTotal, lodging: guided.costEstimate.lodging?.max || 0, buffer: 0 },
    costs: { currency: 'PHP', basis: 'group', categories, knownTotal: guided.estimated, perPerson: guided.estimated/r.travelers,
      budget: r.budget, remainingKnown: r.budget-guided.estimated, unknownCosts: guided.stops.filter(s => s.price == null).length,
      complete: false, status: 'incomplete' }, warnings: guided.warnings, omitted: [], guided,
  }
}
