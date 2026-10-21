import { itineraryCatalog, transportModes } from '../data/itineraryCatalog'
import { fareTables } from './itineraryCosts'
import { ItineraryInputError, matchingPicks, validateItinerary } from './groundedItinerary'

// Automatic and guided plans use the same validation, catalog and cost engine.
export function automaticItineraryInput(body: any, catalog = itineraryCatalog) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['areaId', 'travelers', 'transportMode'].includes(key)))
    throw new ItineraryInputError('Provide a destination, traveler count and transportation only.')
  const area = catalog.find(item => item.id === body.areaId)
  if (!area) throw new ItineraryInputError('Choose a city or municipality in Pangasinan.')
  if (!Number.isInteger(body.travelers) || body.travelers < 1 || body.travelers > 30)
    throw new ItineraryInputError('Enter a whole number of travelers from 1 to 30.')
  if (!transportModes.includes(body.transportMode)) throw new ItineraryInputError('Choose a valid transportation option.')
  const mode = body.transportMode
  const table = fareTables.find(item => item.mode === mode && (mode !== 'Tricycle' || area.id === 'dagupan'))
  const row = table?.rows[0]
  const request = validateItinerary({
    areaId: area.id, travelers: body.travelers, transportModes: [mode],
    travelerType: body.travelers === 1 ? 'solo' : body.travelers === 2 ? 'couple' : 'group',
    tripTypes: ['Scenic / Photography'], activities: ['Photography'], travelStyle: 'balanced',
    date: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10),
    days: 1, startTime: '07:00', budget: 2000 * body.travelers, mealBudget: 300,
    lodgingId: null, hotelRooms: 1, preferences: [], returnToOrigin: true,
    fareInputs: [row ? { mode, rides: 2, tableId: table!.id, km: row.km } : { mode, rides: 2, allowance: 150 }],
  })
  // Choose experiences supported by the selected area's published entries.
  const themes = ['Nature', 'History & Culture', 'Pilgrimage', 'Beach & Sea', 'Scenic / Photography']
  const ranked = themes.map(theme => ({ theme, count: area.entries.filter(entry => entry.tag === 'Attraction' && matchingPicks(entry, { ...request, tripTypes: [theme], activities: [] }).length).length }))
    .sort((a, b) => b.count - a.count)
  request.tripTypes = ranked.filter(item => item.count > 0).slice(0, 2).map(item => item.theme)
  if (!request.tripTypes.length) request.tripTypes = ['Scenic / Photography']
  request.tripTypes.sort()
  return request
}
