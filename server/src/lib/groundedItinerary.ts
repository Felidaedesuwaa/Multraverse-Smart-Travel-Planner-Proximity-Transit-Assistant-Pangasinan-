import { itineraryCatalog, canonicalArea, tripTypes, activities, preferences, transportModes, Entry } from '../data/itineraryCatalog'
import { estimateCosts, FareInput, fareTables } from './itineraryCosts'

export class ItineraryInputError extends Error {}
export function validateItinerary(body: any) {
  const fail = (message: string): never => { throw new ItineraryInputError(message) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Expected trip preferences')
  body = { startTime: '07:00', mealBudget: 300, hotelRooms: 1, fareInputs: [], ...body }
  const allowed = ['areaId','tripTypes','activities','travelerType','travelStyle','date','travelers','budget','days','lodgingId','transportModes','preferences','returnToOrigin','startTime','mealBudget','hotelRooms','fareInputs']
  if (Object.keys(body).some(k => !allowed.includes(k))) fail('Unknown planner input; identity comes from your signed-in account')
  const areaId = typeof body.areaId === 'string' ? canonicalArea(body.areaId) : ''
  const area = itineraryCatalog.find(a => a.id === areaId)
  if (!area) fail('Choose one of the seven supported areas')
  const list = (key: string, choices: string[]) => {
    const value = body[key]
    if (!Array.isArray(value) || value.length > choices.length || value.some(v => typeof v !== 'string' || !choices.includes(v))) fail(`Invalid ${key}`)
    return [...new Set(value as string[])].sort()
  }
  const number = (key: string, min: number, max: number, integer = false) => {
    const raw = body[key]
    if (!['number', 'string'].includes(typeof raw) || String(raw).trim() === '') fail(`Invalid ${key}`)
    const value = Number(raw)
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(`Invalid ${key}`)
    return value
  }
  if (!['solo','couple','family','barkada','group'].includes(body.travelerType)) fail('Invalid traveler type')
  if (!['relaxed','balanced','adventurous'].includes(body.travelStyle)) fail('Invalid travel style')
  if (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !Number.isFinite(Date.parse(body.date)) || new Date(body.date).toISOString().slice(0,10) !== body.date) fail('Invalid travel date')
  if (typeof body.returnToOrigin !== 'boolean') fail('Invalid return preference')
  if (typeof body.startTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.startTime)) fail('Invalid start time')
  if (body.lodgingId != null && !area!.lodging.some(l => l.id === body.lodgingId)) fail('Choose an accommodation from this area')
  if (area!.lodging.find(l => l.id === body.lodgingId)?.lodgingDetails?.overnight_supported === false) fail('This property lists day-use/event rooms only; choose an overnight accommodation')
  if (!Array.isArray(body.fareInputs) || body.fareInputs.length > 5) fail('Invalid fare inputs')
  const fareInputs: FareInput[] = body.fareInputs.map((f: any) => {
    if (!f || typeof f !== 'object' || !transportModes.includes(f.mode) || !body.transportModes?.includes(f.mode)) fail('Invalid transport mode')
    if (!Number.isInteger(f.rides) || f.rides < 1 || f.rides > 100) fail('Enter 1–100 total rides')
    if (f.allowance != null && (!Number.isFinite(f.allowance) || f.allowance < 0 || f.allowance > 10000)) fail('Invalid fare allowance')
    if (f.km != null && (!Number.isFinite(f.km) || f.km <= 0 || f.km > 1000)) fail('Invalid billed distance')
    if (f.tableId && !fareTables.some(t => t.id === f.tableId && t.mode === f.mode)) fail('Invalid fare table')
    if (f.referenceAccepted != null && typeof f.referenceAccepted !== 'boolean') fail('Invalid reference confirmation')
    return { mode: f.mode, rides: f.rides, allowance: f.allowance ?? undefined, km: f.km ?? undefined, tableId: f.tableId || undefined, referenceAccepted: f.referenceAccepted === true }
  })
  if (new Set(fareInputs.map(f => f.mode)).size !== fareInputs.length) fail('Duplicate fare mode')
  return { areaId, tripTypes: list('tripTypes', tripTypes), activities: list('activities', activities),
    travelerType: body.travelerType as string, travelStyle: body.travelStyle as string, date: body.date as string,
    travelers: number('travelers', 1, 30, true), budget: number('budget', 1, 1000000), days: number('days', 1, 7, true),
    lodgingId: (body.lodgingId || null) as string | null, transportModes: list('transportModes', transportModes), preferences: list('preferences', preferences),
    returnToOrigin: body.returnToOrigin as boolean, startTime: body.startTime as string, mealBudget: number('mealBudget', 0, 10000), hotelRooms: number('hotelRooms', 1, 30, true), fareInputs }
}
export type ItineraryRequest = ReturnType<typeof validateItinerary>
export type Stop = { time: string; title: string; subtitle: string; tag: string; price: number | null; iconKey: string; day: number; entryId?: string }

// Match only catalog names/categories, never infer amenities, prices or access guarantees.
const themes: [RegExp, RegExp][] = [
  [/Beach|Swimming|Sea|Relaxation|Island/i, /beach|island|sea|resort/i],
  [/Boating|Kayaking/i, /river|cruise|island|wharf/i],
  [/Nature|Outdoor|Adventure|Scenic|Photography/i, /nature|landscape|park|hill|river|island|beach|lighthouse|cave/i],
  [/Waterfalls/i, /falls/i], [/Pilgrimage|Church/i, /church|basilica|cathedral|pilgrimage|sacred/i],
  [/History|Culture|Cultural/i, /museum|heritage|historic|capitol|cultural|arch|ruins/i],
  [/Farm|Craft/i, /farm|agri|bamboo|craft|produce|rice field/i],
  [/Shopping|Pasalubong/i, /market|pasalubong|food court/i], [/Food|Local Food/i, /food/i],
  [/Resort|Staycation/i, /resort|accommodation/i], [/Relaxing/i, /park|beach|baywalk/i],
]
export const matchingPicks = (entry: Entry, request: ItineraryRequest) => [...request.tripTypes, ...request.activities, ...request.preferences]
  .filter(pick => themes.some(([p, e]) => p.test(pick) && e.test(`${entry.name} ${entry.category}`)))
export function candidatesFor(request: ItineraryRequest, used: Set<string>) {
  return itineraryCatalog.find(a => a.id === request.areaId)!.entries.filter(e => !used.has(e.id))
    .sort((a,b) => matchingPicks(b,request).length - matchingPicks(a,request).length || a.id.localeCompare(b.id))
}
export function validateModelOrder(result: any, candidates: Entry[]): string[] {
  if (!result || !Array.isArray(result.ids) || result.ids.length !== candidates.length || new Set(result.ids).size !== candidates.length || result.ids.some((id: unknown) => !candidates.some(e => e.id === id))) throw new Error('Model returned unsupported catalog IDs')
  return result.ids
}
export function buildGroundedItinerary(request: ItineraryRequest, used: Set<string>, modelOrder: string[] = []) {
  const area = itineraryCatalog.find(a => a.id === request.areaId)!
  const available = candidatesFor(request, used)
  const ranked = [...available].sort((a,b) => matchingPicks(b,request).length - matchingPicks(a,request).length ||
    (modelOrder.indexOf(a.id) - modelOrder.indexOf(b.id)))
  const density = request.travelStyle === 'relaxed' ? 1 : request.travelStyle === 'adventurous' ? 4 : 2
  const hasTheme = [...request.tripTypes, ...request.activities].some(p => themes.some(([pattern]) => pattern.test(p)))
  const places = ranked.filter(e => e.tag === 'Attraction' && (!hasTheme || matchingPicks(e,request).length > 0)).slice(0, density * request.days)
  const foods = ranked.filter(e => e.tag === 'Food').slice(0, request.days)
  const warnings = ['Visit times are suggested. Confirm opening hours, access and travel time. Budget totals are planning estimates, not confirmed charges.']
  if (places.length < density * request.days || foods.length < request.days) warnings.push('Verified options are limited for these preferences and recent plans. Previously used entries are excluded; some days may have fewer stops. No extra places or foods have been invented.')
  if (!area.lodging.length) warnings.push('No verified accommodation on file for this area yet.')
  const overnightOptions = ranked.filter(e => e.tag === 'Lodging' && e.lodgingDetails?.overnight_supported !== false)
  const stay = request.lodgingId ? overnightOptions.find(e => e.id === request.lodgingId) || overnightOptions[0] : undefined
  if (request.lodgingId && stay?.id !== request.lodgingId) warnings.push(stay ? 'Your selected accommodation was used recently; an unused source-listed alternative is suggested. Confirm its rate before booking.' : 'All source-listed accommodations were used recently. No unused accommodation is available for this combination.')
  if (request.days > 1 && !stay) warnings.push('Overnight accommodation is not arranged in this plan.')
  const picks = [...request.tripTypes, ...request.activities]
  const unsupported = picks.filter(p => !area.entries.some(e => matchingPicks(e, { ...request, tripTypes: [p], activities: [], preferences: [] }).length))
  if (unsupported.length) warnings.push(`No specific catalog match for: ${unsupported.join(', ')}. These experiences are not promised.`)
  const stops: Stop[] = []
  const transitNote = `${request.transportModes.join(' / ') || 'Choose transport'} · Route and journey time to confirm. See transport estimate for fare assumptions.`
  stops.push({ time: 'Before visits', day: 1, title: `Travel to ${area.name}`, subtitle: transitNote, tag: 'Transit', iconKey: 'Bus', price: null })
  const start = request.startTime.split(':').map(Number).reduce((h,m) => h * 60 + m)
  for (let day = 1; day <= request.days; day++) {
    // Spread a small catalog across requested days instead of filling day one only.
    const daily = places.filter((_, i) => i % request.days === day - 1)
    const entries = [...daily, ...(foods[day-1] ? [foods[day-1]] : [])]
    entries.forEach((entry, index) => {
      const mins = start + index * (request.travelStyle === 'relaxed' ? 180 : 90)
      const slot = mins < 1440 ? `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}` : 'Time to arrange'
      const matches = matchingPicks(entry, request)
      const why = matches.length ? `Fits your ${matches.join(' / ')} selections.` : `An unused ${entry.tag === 'Food' ? 'local food' : 'sight'} from this area's guide; no exact activity match is claimed.`
      stops.push({ day, time: `Day ${day} · ${slot}`, entryId: entry.id, title: entry.name,
        subtitle: `${why} Leave ${request.travelStyle === 'relaxed' ? 'extra time for breaks' : 'time to confirm access'} on your ${request.travelStyle} ${request.travelerType} trip. ${entry.tag === 'Food' ? 'Ask for the menu price before ordering.' : 'Confirm access and any fee before visiting.'} Source: ${entry.source}.`,
        tag: entry.tag, iconKey: entry.tag === 'Food' ? 'Utensils' : 'Compass', price: null })
    })
    if (!entries.length) warnings.push(`Day ${day}: no unused source-listed visits or foods remain; leave this day open.`)
    if (stay && day < request.days) {
      const hotel = stay.lodgingDetails
      const details = hotel ? ` ${hotel.address}. ${hotel.room_types}; ${hotel.capacity_note}. Amenities: ${hotel.amenities_description}. Check-in: ${hotel.check_in}; check-out: ${hotel.check_out}. Approximate reference: PHP ${hotel.reference_rate.min}–${hotel.reference_rate.max}/${hotel.reference_rate.period}; ${hotel.reference_rate.basis === 'unspecified' ? 'per-room/per-person basis unspecified' : hotel.reference_rate.basis}, excluded from known subtotal. ${hotel.rate_note ? `Rate details: ${hotel.rate_note}. ` : ''}Additional fees: ${hotel.additional_fees}. Transport: ${hotel.transport_access}. Contact: ${hotel.contact}. Booking: ${hotel.booking_url}. Guide states verified ${hotel.stated_verified_date}; not independently verified.` : ''
      stops.push({ day, time: `Day ${day} · Evening`, entryId: stay.id, title: stay.name, subtitle: `Your accommodation for this ${request.travelStyle} trip. Source: ${stay.source}.${details} Confirm room capacity for ${request.travelers} travelers, availability and nightly price.`, tag: 'Lodging', iconKey: 'Home', price: null })
    }
  }
  if (stay && request.days === 1) warnings.push('A one-day trip has no overnight stay; the selected accommodation is not charged or scheduled.')
  if (request.returnToOrigin) stops.push({ day: request.days, time: `Day ${request.days} · After visits`, title: 'Return to origin', subtitle: transitNote, tag: 'Transit', iconKey: 'Bus', price: null })
  const breakdown: Record<string, number> = {}
  stops.forEach(s => { if (s.price != null) breakdown[s.tag] = (breakdown[s.tag] || 0) + s.price })
  const costEstimate = estimateCosts(request, stay?.lodgingDetails)
  return { request, stops, breakdown, estimated: Object.values(breakdown).reduce((a,b) => a+b,0), warnings, costEstimate,
    budgetComplete: false, mealAllocation: request.mealBudget * request.travelers * request.days, mode: modelOrder.length ? 'model-assisted' : 'catalog',
    chosenIds: [...new Set(stops.flatMap(s => s.entryId ? [s.entryId] : []))], generatedAt: new Date().toISOString() }
}
