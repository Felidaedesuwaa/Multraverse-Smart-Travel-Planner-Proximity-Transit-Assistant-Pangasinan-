import { buildGroundedItinerary } from './groundedItinerary'
// Keep the established Trip / PlannerDraft envelope and its consumers compatible.
export function guidedSnapshot(guided: ReturnType<typeof buildGroundedItinerary>) {
  const r = guided.request
  const c = guided.costEstimate
  const leg = { from: r.areaId, to: r.areaId, status: 'unknown', steps: [], note: 'Route and fare unconfirmed; origin not supplied.' }
  const categories = { food: c.meals, lodging: c.lodging?.max || 0, entry: c.entryFees, transport: c.transportTotal }
  return {
    version: 1, generatedAt: new Date(guided.generatedAt), mode: guided.mode === 'model-assisted' ? 'hybrid' : 'database', narrativeStatus: guided.mode,
    request: { origin: { areaId: r.areaId }, destinations: [{ areaId: r.areaId, placeIds: [] }], dates: { start: r.date }, startTime: r.startTime,
      days: r.days, budget: r.budget, travelers: r.travelers, preferences: r.preferences, transportModes: r.transportModes.map(m => m === 'Own Vehicle' ? 'own-vehicle' : m.toLowerCase()),
      pace: r.travelStyle === 'adventurous' ? 'packed' : r.travelStyle, lodging: { preference: r.lodgingId ? 'standard' : 'none', nightlyBudget: 0, rooms: r.hotelRooms },
      foodPerPersonPerDay: r.mealBudget, useSavedPlaces: false, returnToOrigin: r.returnToOrigin, excludedPlaceIds: [] },
    days: Array.from({ length: r.days }, (_, i) => ({ day: i+1, date: new Date(Date.parse(r.date) + i*86400000).toISOString().slice(0,10),
      stops: guided.stops.filter(s => s.day === i+1 && s.tag === 'Attraction').map(s => ({ placeId: s.entryId, areaId: r.areaId, place: s.title,
        address: r.areaId, time: /\d{2}:\d{2}/.exec(s.time)?.[0] || r.startTime, endTime: /\d{2}:\d{2}/.exec(s.time)?.[0] || r.startTime,
        visitMinutes: 60, activity: s.subtitle, entryCost: s.price, estimatedCost: s.price ?? 0, transit: leg, notes: ['Suggested slot only; opening hours and route duration unconfirmed.'] })) })),
    localFoods: guided.foodOptions.slice(0, 6).map(food => ({ name: food.name, description: food.description || 'Listed local food', where: food.where || r.areaId, listedAveragePrice: food.listedAveragePrice, note: 'Choose tastings within your daily meal allowance.' })), fareGuide: [], allocation: { ...categories, buffer: c.emergency },
    costs: { currency: 'PHP', basis: 'group', categories, knownTotal: c.max, perPerson: c.perPersonMax,
      budget: r.budget, remainingKnown: c.remainingMin, unknownCosts: guided.stops.filter(s => s.price == null).length,
      complete: false, status: 'incomplete' }, warnings: guided.warnings, omitted: [], guided,
  }
}
