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
  if (!area) fail('Choose a city or municipality in Pangasinan')
  const list = (key: string, choices: string[]) => {
    const label = key === 'tripTypes' ? 'trip types' : key === 'activities' ? 'activities' : key === 'transportModes' ? 'ways to travel' : 'preferences';
    const value = body[key]
    if (!Array.isArray(value) || value.some(v => typeof v !== 'string' || !choices.includes(v))) fail(`Choose valid ${label} from the options shown.`)
    const maximum = ['tripTypes', 'activities'].includes(key) ? 3 : choices.length
    if (value.length > maximum) fail(`Choose up to ${maximum} ${label}.`)
    if (key !== 'preferences' && !value.length) fail(`Choose at least one of the ${label}.`)
    return [...new Set(value as string[])].sort()
  }
  const fieldLabels: Record<string, string> = { travelers: 'Number of travelers', budget: 'Trip budget', days: 'Trip length', mealBudget: 'Daily meal allowance', hotelRooms: 'Number of rooms' }
  const number = (key: string, min: number, max: number, integer = false) => {
    const raw = body[key]
    if (!['number', 'string'].includes(typeof raw) || String(raw).trim() === '') fail(`Enter ${fieldLabels[key].toLowerCase()}.`)
    const value = Number(raw)
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(`${fieldLabels[key]} must be ${integer ? 'a whole number' : 'a number'} from ${min} to ${max}.`)
    return value
  }
  if (!['solo','couple','family','barkada','group'].includes(body.travelerType)) fail('Choose who you are traveling with.')
  if (!['relaxed','balanced','adventurous'].includes(body.travelStyle)) fail('Choose your travel style.')
  if (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !Number.isFinite(Date.parse(body.date)) || new Date(body.date).toISOString().slice(0,10) !== body.date) fail('Choose a valid travel date.')
  if (body.date < new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)) fail('Choose today or a future travel date.')
  if (body.lodgingId === undefined || body.lodgingId === '') fail('Choose a hotel or select no lodging.')
  const selectedTripTypes = list('tripTypes', tripTypes), selectedActivities = list('activities', activities), selectedModes = list('transportModes', transportModes)
  const travelers = number('travelers', 1, 30, true), days = number('days', 1, 7, true)
  if (body.travelerType === 'solo' && travelers !== 1) fail('Solo travel is for 1 person. Update your group type or traveler count.')
  if (body.travelerType === 'couple' && travelers !== 2) fail('Couple travel is for 2 people. Update your group type or traveler count.')
  if (['family', 'barkada', 'group'].includes(body.travelerType) && travelers < 2) fail('Enter at least 2 travelers for this group type.')
  if (body.lodgingId && days === 1) fail('A day trip has no overnight stay. Select no lodging or choose at least 2 days.')
  if (typeof body.returnToOrigin !== 'boolean') fail('Choose whether you want to return to your starting point.')
  if (typeof body.startTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.startTime)) fail('Choose a valid start time, such as 07:00.')
  if (body.lodgingId != null && !area!.lodging.some(l => l.id === body.lodgingId)) fail('Choose an accommodation from this area')
  if (area!.lodging.find(l => l.id === body.lodgingId)?.lodgingDetails?.overnight_supported === false) fail('This property lists day-use/event rooms only; choose an overnight accommodation')
  if (!Array.isArray(body.fareInputs) || body.fareInputs.length > 5) fail('Enter one travel estimate for each selected way to travel.')
  const fareInputs: FareInput[] = body.fareInputs.map((f: any) => {
    if (!f || typeof f !== 'object' || !transportModes.includes(f.mode) || !body.transportModes?.includes(f.mode)) fail('Choose a way to travel from the options shown.')
    if (!Number.isInteger(f.rides) || f.rides < 1 || f.rides > 100) fail('Enter 1–100 total rides')
    if (f.allowance != null && (!Number.isFinite(f.allowance) || f.allowance < 0 || f.allowance > 10000)) fail('Travel allowance must be a number from 0 to 10000 pesos per person per ride.')
    if (f.km != null && (!Number.isFinite(f.km) || f.km <= 0 || f.km > 1000)) fail('Choose a valid billed distance from the fare table.')
    if (f.tableId && !fareTables.some(t => t.id === f.tableId && t.mode === f.mode)) fail('Choose a fare table for this way to travel.')
    if (f.referenceAccepted != null && typeof f.referenceAccepted !== 'boolean') fail('Tick the fare estimate confirmation or enter your own allowance.')
    if (f.allowance != null && (f.mode === 'Bus' || f.mode === 'Jeepney' || (f.mode === 'Tricycle' && areaId === 'dagupan'))) fail('Use the supplied fare matrix and select a billed distance for this mode.')
    if (f.allowance == null) {
      const table = fareTables.find(t => t.id === f.tableId && t.mode === f.mode)
      if (!table?.rows.some(row => row.km === f.km)) fail(`Choose a listed distance or enter your own ${f.mode} allowance.`)
      if (f.mode === 'Tricycle' && areaId !== 'dagupan') fail('Enter a local tricycle allowance. This fare table applies only to Dagupan.')
    }
    return { mode: f.mode, rides: f.rides, allowance: f.allowance ?? undefined, km: f.km ?? undefined, tableId: f.tableId || undefined, referenceAccepted: f.referenceAccepted === true }
  })
  if (selectedModes.some(mode => !fareInputs.some(f => f.mode === mode))) fail('Enter a fare or travel allowance for each selected way to travel.')
  if (new Set(fareInputs.map(f => f.mode)).size !== fareInputs.length) fail('Duplicate fare mode')
  return { areaId, tripTypes: selectedTripTypes, activities: selectedActivities,
    travelerType: body.travelerType as string, travelStyle: body.travelStyle as string, date: body.date as string,
    travelers, budget: number('budget', 1, 1000000), days,
    lodgingId: (body.lodgingId || null) as string | null, transportModes: selectedModes, preferences: list('preferences', preferences),
    returnToOrigin: body.returnToOrigin as boolean, startTime: body.startTime as string, mealBudget: number('mealBudget', 1, 10000), hotelRooms: number('hotelRooms', 1, 30, true), fareInputs }
}
export type ItineraryRequest = ReturnType<typeof validateItinerary>
export type Stop = { time: string; title: string; subtitle: string; tag: string; price: number | null; iconKey: string; day: number; entryId?: string }
export const wantsLocalFood = (request: ItineraryRequest) => [...request.tripTypes, ...request.activities].some(p => /^(Food Trip|Local Food)$/.test(p))

// Match only catalog names/categories, never infer amenities, prices or access guarantees.
const themes: [RegExp, RegExp][] = [
  [/Beach|Swimming|Sea|Relaxation|Island/i, /beach|island|sea|resort/i],
  [/Boating|Kayaking/i, /river|cruise|island|wharf/i],
  [/Nature|Outdoor|Adventure|Scenic|Photography/i, /nature|landscape|park|hill|river|island|beach|lighthouse|cave|mountain|garden|countryside/i],
  [/Waterfalls/i, /falls/i], [/Pilgrimage|Church/i, /church|basilica|cathedral|pilgrimage|sacred/i],
  [/History|Culture|Cultural/i, /museum|heritage|historic|capitol|cultural|arch|ruins|monument/i],
  [/Farm|Craft/i, /farm|agri|bamboo|craft|produce|rice field/i],
  [/Shopping|Pasalubong/i, /market|pasalubong|food court/i],
  [/Resort|Staycation/i, /resort|accommodation/i], [/Relaxing/i, /park|beach|baywalk/i],
  [/Festivals|Events/i, /festival|event/i],
]
export const matchingPicks = (entry: Entry, request: ItineraryRequest) => [...request.tripTypes, ...request.activities, ...request.preferences]
  .filter(pick => /^(Food Trip|Local Food)$/.test(pick) ? entry.tag === 'Food' : themes.some(([p, e]) => p.test(pick) && e.test(`${entry.name} ${entry.category}`)))
export function candidatesFor(request: ItineraryRequest, used: Set<string>, catalog = itineraryCatalog) {
  const hasTheme = [...request.tripTypes, ...request.activities].some(p => /^(Food Trip|Local Food)$/.test(p) || themes.some(([pattern]) => pattern.test(p)))
  return catalog.find(a => a.id === request.areaId)!.entries.filter(e => e.tag === 'Lodging' ? e.id === request.lodgingId : e.tag === 'Food' ? true : !hasTheme || matchingPicks(e, request).length > 0)
    .sort((a,b) => Number(used.has(a.id)) - Number(used.has(b.id)) || matchingPicks(b,request).length - matchingPicks(a,request).length || a.id.localeCompare(b.id))
}
export function validateModelOrder(result: any, candidates: Entry[]): string[] {
  if (!result || !Array.isArray(result.ids) || result.ids.length !== candidates.length || new Set(result.ids).size !== candidates.length || result.ids.some((id: unknown) => !candidates.some(e => e.id === id))) throw new Error('Model returned unsupported catalog IDs')
  return result.ids
}
export function buildGroundedItinerary(request: ItineraryRequest, used: Set<string>, modelOrder: string[] = [], catalog = itineraryCatalog) {
  const area = catalog.find(a => a.id === request.areaId)!
  const available = candidatesFor(request, used, catalog)
  const stay = area.lodging.find(e => e.id === request.lodgingId)
  const baseline = estimateCosts(request, stay?.lodgingDetails)
  const visitAllowance = Math.max(0, baseline.remainingMin)
  const visitCost = (entry: Entry) => entry.entryFee == null ? null : entry.entryFee * (entry.feeBasis === 'group' ? 1 : request.travelers)
  const ranked = [...available].sort((a,b) => Number(used.has(a.id)) - Number(used.has(b.id)) || matchingPicks(b,request).length - matchingPicks(a,request).length ||
    ((visitCost(a) ?? 0) - (visitCost(b) ?? 0)) || (modelOrder.length ? modelOrder.indexOf(a.id) - modelOrder.indexOf(b.id) : a.id.localeCompare(b.id)))
  const density = request.travelStyle === 'relaxed' ? 1 : request.travelStyle === 'adventurous' ? 4 : 2
  let entryFees = 0
  const places = ranked.filter(e => e.tag === 'Attraction').reduce<Entry[]>((chosen, entry) => {
    if (chosen.length >= density * request.days) return chosen
    const cost = visitCost(entry) ?? 0
    if (entryFees + cost > visitAllowance) return chosen
    entryFees += cost
    return [...chosen, entry]
  }, [])
  const allFoods = area.entries.filter(e => e.tag === 'Food')
  const foodOptions = wantsLocalFood(request) ? allFoods.map(e => ({ id: e.id, name: e.name, description: e.description || '', where: e.location || '', listedAveragePrice: e.averagePrice ?? null, source: e.source })) : []
  const foods = ranked.filter(e => e.tag === 'Food').slice(0, wantsLocalFood(request) ? request.days * 3 : request.days)
  const warnings = ['Visit times are suggested. Confirm opening hours, access and travel time. Budget totals are planning estimates, not confirmed charges.']
  if (!area.entries.length) warnings.push('No verified attractions, food or accommodation are published for this destination yet. This plan contains travel and budget estimates only.')
  if (!places.length && !wantsLocalFood(request)) warnings.push('No attraction fits the selected categories and available visit allowance. Choose another category or increase the allowance for priced visits.')
  if (places.some(e => e.entryFee == null)) warnings.push('Some matching visits have unconfirmed entry fees; confirm these against the remaining allowance before booking.')
  if (places.some(e => used.has(e.id)) || foods.some(e => used.has(e.id))) warnings.push('Matching options from recent plans are reused where needed so regeneration does not remove your chosen experiences.')
  if (wantsLocalFood(request)) warnings.push('All listed local foods are suggested below. The meal schedule is a tasting shortlist; choose portions within your daily meal allowance rather than buying every suggestion.')
  if (baseline.remainingMin < 0) warnings.push('Meals, transport, selected hotel and emergency reserve may exceed your budget. Adjust these allowances before booking; suggestions are not a claim that the full trip is affordable.')
  if (!area.lodging.length) warnings.push('No verified accommodation on file for this area yet.')
  if (request.days > 1 && !stay) warnings.push('Overnight accommodation is not arranged in this plan.')
  const picks = [...request.tripTypes, ...request.activities]
  const unsupported = picks.filter(p => !area.entries.some(e => matchingPicks(e, { ...request, tripTypes: [p], activities: [], preferences: [] }).length))
  if (unsupported.length) warnings.push(`No specific catalog match for: ${unsupported.join(', ')}. These experiences are not promised.`)
  const stops: Stop[] = []
  const transitNote = `${request.transportModes.join(' / ') || 'Choose transport'} · Route and journey time to confirm. See transport fares for the selected kilometers and rides.`
  stops.push({ time: 'Before visits', day: 1, title: `Travel to ${area.name}`, subtitle: transitNote, tag: 'Transit', iconKey: 'Bus', price: null })
  const start = request.startTime.split(':').map(Number).reduce((h,m) => h * 60 + m)
  for (let day = 1; day <= request.days; day++) {
    // Spread a small catalog across requested days instead of filling day one only.
    const daily = places.filter((_, i) => i % request.days === day - 1)
    const entries = [...daily, ...foods.filter((_, i) => i % request.days === day - 1)]
    entries.forEach((entry, index) => {
      const mins = start + index * (request.travelStyle === 'relaxed' ? 180 : 90)
      const slot = mins < 1440 ? `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}` : 'Time to arrange'
      const matches = matchingPicks(entry, request)
      const why = matches.length ? `Fits your ${matches.join(' / ')} selections.` : `A ${entry.tag === 'Food' ? 'local meal option' : 'sight'} from this area's guide.`
      stops.push({ day, time: `Day ${day} · ${slot}`, entryId: entry.id, title: entry.name,
        subtitle: `${why} Leave ${request.travelStyle === 'relaxed' ? 'extra time for breaks' : 'time to confirm access'} on your ${request.travelStyle} ${request.travelerType} trip. ${entry.description || ''} ${entry.tag === 'Food' ? `Use your PHP ${request.mealBudget} per person daily meal allowance; confirm menu prices and choose portions.` : visitCost(entry) == null ? 'Confirm access and any fee before visiting.' : `Listed entry estimate: PHP ${visitCost(entry)} for your group, within the PHP ${visitAllowance} visit allowance.`} Source: ${entry.source}.`,
        tag: entry.tag, iconKey: entry.tag === 'Food' ? 'Utensils' : 'Compass', price: entry.tag === 'Attraction' ? visitCost(entry) : null })
    })
    if (!entries.length) warnings.push(`Day ${day}: no matching source-listed visits or foods are available; adjust your categories or keep this day flexible.`)
    if (stay && day < request.days) {
      const hotel = stay.lodgingDetails
      const details = hotel ? ` ${hotel.address}. ${hotel.room_types}; ${hotel.capacity_note}. Amenities: ${hotel.amenities_description}. Check-in: ${hotel.check_in}; check-out: ${hotel.check_out}. Approximate reference: PHP ${hotel.reference_rate.min}–${hotel.reference_rate.max}/${hotel.reference_rate.period}; ${hotel.reference_rate.basis === 'unspecified' ? 'per-room/per-person basis unspecified' : hotel.reference_rate.basis}, included in hotel allowance when the rate basis supports a room estimate. ${hotel.rate_note ? `Rate details: ${hotel.rate_note}. ` : ''}Additional fees: ${hotel.additional_fees}. Transport: ${hotel.transport_access}. Contact: ${hotel.contact}. Booking: ${hotel.booking_url}. Guide states verified ${hotel.stated_verified_date}; not independently verified.` : ''
      stops.push({ day, time: `Day ${day} · Evening`, entryId: stay.id, title: stay.name, subtitle: `Your accommodation for this ${request.travelStyle} trip. Source: ${stay.source}.${details} Confirm room capacity for ${request.travelers} travelers, availability and nightly price.`, tag: 'Lodging', iconKey: 'Home', price: null })
    }
  }
  if (stay && request.days === 1) warnings.push('A one-day trip has no overnight stay; the selected accommodation is not charged or scheduled.')
  if (request.returnToOrigin) stops.push({ day: request.days, time: `Day ${request.days} · After visits`, title: 'Return to origin', subtitle: transitNote, tag: 'Transit', iconKey: 'Bus', price: null })
  const breakdown: Record<string, number> = {}
  stops.forEach(s => { if (s.price != null) breakdown[s.tag] = (breakdown[s.tag] || 0) + s.price })
  const costEstimate = estimateCosts(request, stay?.lodgingDetails, entryFees)
  breakdown.Emergency = costEstimate.emergency
  breakdown.Transit = costEstimate.transportTotal
  breakdown.Food = costEstimate.meals
  breakdown.Lodging = costEstimate.lodging?.max ?? 0
  return { request, stops, breakdown, estimated: costEstimate.max, warnings, costEstimate,
    budgetComplete: false, mealAllocation: request.mealBudget * request.travelers * request.days, mode: modelOrder.length ? 'model-assisted' : 'catalog',
    foodOptions, chosenIds: [...new Set(stops.flatMap(s => s.entryId ? [s.entryId] : []))], generatedAt: new Date().toISOString() }
}
