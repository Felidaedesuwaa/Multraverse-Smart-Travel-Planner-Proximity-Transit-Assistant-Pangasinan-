import areas from '../data/plannerAreas.json'

export const modes = ['bus', 'jeepney', 'tricycle', 'van', 'own-vehicle']
export const preferences = ['Budget-friendly', 'Island hopping', 'Cultural sites', 'Food stops', 'Photography spots', 'Accessible routes']
type Point = { lat: number; lng: number }
export type PlannerRequest = {
  origin: { areaId: string; placeId?: string }; destinations: { areaId: string; placeIds: string[] }[];
  dates: { start: string }; startTime: string; days: number; budget: number; travelers: number;
  preferences: string[]; transportModes: string[]; pace: 'relaxed' | 'balanced' | 'packed';
  lodging: { preference: 'none' | 'budget' | 'standard'; nightlyBudget: number; rooms: number };
  foodPerPersonPerDay: number; useSavedPlaces: boolean; returnToOrigin: boolean; excludedPlaceIds: string[];
}
export class PlanningError extends Error { status = 400 }
const fail = (message: string): never => { throw new PlanningError(message) }
const id = (value: unknown) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
const number = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
export function validateRequest(input: any): PlannerRequest {
  const known = (value: unknown) => areas.some(area => area.id === value)
  if (!input || !known(input.origin?.areaId) || (input.origin.placeId && !id(input.origin.placeId))) fail('Choose an origin in Pangasinan.')
  if (!Array.isArray(input.destinations) || input.destinations.length < 1 || input.destinations.length > 48 ||
      input.destinations.some((d: any) => !known(d?.areaId) || !Array.isArray(d.placeIds) || d.placeIds.length > 30 || d.placeIds.some((p: unknown) => !id(p))) ||
      new Set(input.destinations.map((d: any) => d.areaId)).size !== input.destinations.length) fail('Choose unique destination areas and valid attraction IDs.')
  if (!number(input.days, 1, 7) || !Number.isInteger(input.days) || !number(input.travelers, 1, 30) || !Number.isInteger(input.travelers)) fail('Use 1–7 days and 1–30 travelers.')
  if (!number(input.budget, 1, 1_000_000)) fail('Enter a positive total group budget, up to PHP 1,000,000.')
  const date = input.dates?.start
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) fail('Use a valid start date: YYYY-MM-DD.')
  if (typeof input.startTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.startTime) || input.startTime > '16:00') fail('Start time must be 00:00–16:00 (24-hour format).')
  if (!['relaxed', 'balanced', 'packed'].includes(input.pace)) fail('Select a travel pace.')
  if (!Array.isArray(input.preferences) || input.preferences.some((p: unknown) => !preferences.includes(p as string)) || input.preferences.length > preferences.length) fail('Invalid preferences.')
  if (!Array.isArray(input.transportModes) || !input.transportModes.length || input.transportModes.length > modes.length || input.transportModes.some((m: unknown) => !modes.includes(m as string))) fail('Select valid transport modes.')
  if (!input.lodging || !['none', 'budget', 'standard'].includes(input.lodging.preference) || !number(input.lodging.nightlyBudget, 0, 100_000) || !number(input.lodging.rooms, 1, 30) || !Number.isInteger(input.lodging.rooms)) fail('Enter a valid lodging allowance and room count.')
  if (!number(input.foodPerPersonPerDay, 0, 10_000)) fail('Enter a valid daily food allowance.')
  if (typeof input.useSavedPlaces !== 'boolean' || typeof input.returnToOrigin !== 'boolean') fail('Invalid planner switches.')
  if (!Array.isArray(input.excludedPlaceIds) || input.excludedPlaceIds.length > 100 || input.excludedPlaceIds.some((p: unknown) => !id(p))) fail('Invalid excluded stops.')
  return input
}
export const areaIdFor = (place: any) => place.areaId || areas.find(a => a.name.toLowerCase() === String(place.municipality || '').replace(/\bcity\b/ig, '').trim().toLowerCase())?.id
export function savedPlaceIds(places: any[], saved: any[]) {
  const ids = new Set<string>()
  for (const record of saved) {
    if (record.placeId) { ids.add(String(record.placeId)); continue }
    const matches = places.filter(place => String(place.name).trim().toLowerCase() === String(record.name).trim().toLowerCase())
    if (matches.length === 1) ids.add(String(matches[0]._id))
  }
  return ids
}
export const hasPoint = (p: any): p is Point => !!p && number(p.lat, -90, 90) && number(p.lng, -180, 180)
export function distance(a: Point, b: Point) {
  const rad = Math.PI / 180, lat = (b.lat - a.lat) * rad, lng = (b.lng - a.lng) * rad
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(Math.sin(lat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(lng / 2) ** 2)))
}
const money = (n: number) => Math.round(n * 100) / 100
const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
const nameOf = (areaId: string) => areas.find(a => a.id === areaId)?.name || areaId
type Data = { places: any[]; fares: any[]; routes: any[]; foods: any[]; saved: any[]; geofences: any[] }

// Directed minimum-fare path over explicitly linked, reviewed records only.
export function transit(from: string, to: string, request: PlannerRequest, data: Data): any {
  if (from === to) return { from, to, status: 'unknown', cost: null, minutes: null, steps: [], note: 'Local transfer fare and road travel time are not documented.' }
  const edges = data.fares.filter(f => f.fromAreaId && f.toAreaId && f.verifiedAt && number(f.price, 0, 100_000) && number(f.durationMinutes, 1, 1440) &&
    ['person', 'vehicle'].includes(f.fareBasis) && (f.fareBasis !== 'vehicle' || number(f.capacity, 1, 100)) &&
    request.transportModes.includes(String(f.vehicle).toLowerCase()) && data.routes.some(r => String(r._id) === String(f.transitRouteId) && r.status === 'ACTIVE' && r.areaIds?.includes(f.fromAreaId) && r.areaIds?.includes(f.toAreaId)))
  const queue: any[] = [{ area: from, cost: 0, minutes: 0, steps: [], visited: [from] }]
  const best = new Map<string, number>()
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost || a.minutes - b.minutes)
    const current = queue.shift()!
    if (current.area === to) return { from, to, status: 'recorded', cost: money(current.cost), minutes: current.minutes, steps: current.steps, note: 'Recorded fares; confirm current operations. Waiting and last-mile travel are not included.' }
    if ((best.get(current.area) ?? Infinity) <= current.cost) continue
    best.set(current.area, current.cost)
    for (const fare of edges.filter(e => e.fromAreaId === current.area && !current.visited.includes(e.toAreaId))) {
      const cost = money(fare.price * (fare.fareBasis === 'person' ? request.travelers : Math.ceil(request.travelers / fare.capacity)))
      queue.push({ area: fare.toAreaId, cost: current.cost + cost, minutes: current.minutes + fare.durationMinutes,
        visited: [...current.visited, fare.toAreaId], steps: [...current.steps, { from: fare.fromAreaId, to: fare.toAreaId, vehicle: fare.vehicle, cost, minutes: fare.durationMinutes, sourceId: String(fare._id), verifiedAt: fare.verifiedAt }] })
    }
  }
  return { from, to, status: 'unknown', cost: null, minutes: null, steps: [], note: 'No reviewed route for the selected modes. Confirm transport and fare locally.' }
}

export function buildPlan(request: PlannerRequest, data: Data) {
  const warnings = new Set<string>(['Times are provisional in Asia/Manila. No live traffic, departure, weather or crowd data is available.'])
  const omitted: { placeId?: string; areaId?: string; reason: string }[] = []
  const savedIds = savedPlaceIds(data.places, data.saved)
  const excluded = new Set(request.excludedPlaceIds)
  const selectedIds = new Set(request.destinations.flatMap(d => d.placeIds))
  const sourcePlaces = data.places.filter(p => !excluded.has(String(p._id)))
  if (request.origin.placeId && !data.places.some(p => String(p._id) === request.origin.placeId && areaIdFor(p) === request.origin.areaId)) fail('Origin attraction does not belong to the selected area.')
  for (const dest of request.destinations) for (const placeId of dest.placeIds) {
    if (!data.places.some(p => String(p._id) === placeId && areaIdFor(p) === dest.areaId)) fail('A selected attraction is no longer available in its area. Refresh the catalog.')
  }
  const perDay = { relaxed: 2, balanced: 3, packed: 4 }[request.pace]
  const food = money(request.foodPerPersonPerDay * request.travelers * request.days)
  const lodging = request.lodging.preference === 'none' ? 0 : money(request.lodging.nightlyBudget * request.lodging.rooms * (request.days - 1))
  let spent = money(food + lodging), entryTotal = 0, transportTotal = 0
  const days: any[] = Array.from({ length: request.days }, (_, i) => ({ day: i + 1, date: new Date(Date.parse(request.dates.start) + i * 86400000).toISOString().slice(0, 10), stops: [], narrative: '', narrativeSource: 'database' }))
  let dayIndex = 0, area = request.origin.areaId
  let previous = data.places.find(p => String(p._id) === request.origin.placeId)?.coordinates
  const start = Number(request.startTime.slice(0, 2)) * 60 + Number(request.startTime.slice(3))
  let cursor = start
  const terms: Record<string, string[]> = { 'Island hopping': ['island'], 'Cultural sites': ['religious', 'church', 'museum', 'heritage'], 'Food stops': ['food', 'market'], 'Photography spots': ['beach', 'nature', 'falls'] }
  const rank = (p: any) => (selectedIds.has(String(p._id)) ? 100 : 0) + (request.useSavedPlaces && savedIds.has(String(p._id)) ? 20 : 0) + request.preferences.reduce((n, pref) => n + (terms[pref]?.some(t => `${p.category} ${p.tags?.join(' ')}`.toLowerCase().includes(t)) ? 5 : 0), 0)
  for (const [destinationIndex, dest] of request.destinations.entries()) {
    const targetDay = Math.floor(destinationIndex * request.days / request.destinations.length)
    if (targetDay > dayIndex) { dayIndex = targetDay; cursor = start }
    let candidates = sourcePlaces.filter(p => areaIdFor(p) === dest.areaId && (!dest.placeIds.length || dest.placeIds.includes(String(p._id))))
    if (!candidates.length) omitted.push({ areaId: dest.areaId, reason: `No database attractions available for ${nameOf(dest.areaId)}.` })
    // Respect user area order; greedy nearest-neighbor within each area, after explicit preference ranking.
    let areaStops = 0
    while (candidates.length) {
      candidates.sort((a, b) => rank(b) - rank(a) ||
        (hasPoint(previous) && hasPoint(a.coordinates) && hasPoint(b.coordinates) ? distance(previous, a.coordinates) - distance(previous, b.coordinates) : 0) ||
        (request.preferences.includes('Budget-friendly') ? (a.entryFee ?? Infinity) - (b.entryFee ?? Infinity) : 0) || String(a._id).localeCompare(String(b._id)))
      const place = candidates.shift()!, placeId = String(place._id)
      if (!dest.placeIds.length && areaStops >= perDay * Math.ceil(request.days / request.destinations.length)) break
      if (request.preferences.includes('Accessible routes') && place.accessibility !== 'verified') { omitted.push({ placeId, reason: `${place.name}: accessibility is not verified.` }); continue }
      if (dayIndex >= days.length) { omitted.push({ placeId, reason: `${place.name}: no remaining day capacity.` }); continue }
      const transfer = transit(area, dest.areaId, request, data)
      const visitMinutes = number(place.visitMinutes, 15, 480) ? place.visitMinutes : 90
      const entry = number(place.entryFee, 0, 100_000) && place.verifiedAt ? money(place.entryFee * (place.feeBasis === 'group' ? 1 : request.travelers)) : null
      const increment = money((entry ?? 0) + (transfer.cost ?? 0))
      // Reserve any known return fare before accepting a stop.
      const reserve = request.returnToOrigin ? (transit(dest.areaId, request.origin.areaId, request, data).cost ?? 0) : 0
      if (spent + increment + reserve > request.budget) { omitted.push({ placeId, reason: `${place.name}: exceeds the known-cost budget.` }); continue }
      let arrival = Math.max(cursor + (transfer.minutes ?? 30), place.openingMinutes ?? 0)
      const close = Math.min(18 * 60, place.closingMinutes ?? 18 * 60)
      const closed = (d: number) => place.closedWeekdays?.includes(new Date(days[d].date).getUTCDay())
      let candidateDay = dayIndex
      while (candidateDay < days.length && (days[candidateDay].stops.length >= perDay || arrival + visitMinutes > close || closed(candidateDay))) {
        candidateDay++; arrival = Math.max(start + (transfer.minutes ?? 30), place.openingMinutes ?? 0)
      }
      if (candidateDay >= days.length) { omitted.push({ placeId, reason: `${place.name}: does not fit the available dates/opening window.` }); continue }
      dayIndex = candidateDay
      const notes: string[] = []
      if (entry === null) notes.push('Entry fee unverified; excluded from known subtotal.')
      if (!place.visitMinutes) notes.push('Visit duration uses a 90-minute planning allowance.')
      if (transfer.minutes === null) notes.push('Transfer uses a 30-minute placeholder; actual journey may be much longer.')
      if (!place.openingMinutes && !place.closingMinutes) notes.push('Opening hours not structured; confirm before departure.')
      for (const fence of data.geofences) if (fence.active && hasPoint(fence.coordinates) && hasPoint(place.coordinates) && number(fence.radiusMeters, 1, 100_000) && distance(fence.coordinates, place.coordinates) * 1000 <= fence.radiusMeters) notes.push(fence.advisory || `Near ${fence.location}: ${fence.zone}.`)
      days[dayIndex].stops.push({ placeId, areaId: dest.areaId, place: place.name, address: place.location, coordinates: hasPoint(place.coordinates) ? place.coordinates : null,
        time: clock(arrival), endTime: clock(arrival + visitMinutes), visitMinutes, bestTime: place.bestTime || null,
        activity: String(place.description || '').slice(0, 360), narrative: null, entryCost: entry,
        listedEntryEstimate: number(place.entryFee, 0, 100_000) ? money(place.entryFee * (place.feeBasis === 'group' ? 1 : request.travelers)) : null,
        estimatedCost: increment, transit: transfer, notes, verifiedAt: place.verifiedAt || null })
      area = dest.areaId; previous = place.coordinates; cursor = arrival + visitMinutes
      spent = money(spent + increment); entryTotal = money(entryTotal + (entry ?? 0)); transportTotal = money(transportTotal + (transfer.cost ?? 0)); areaStops++
    }
  }
  const stops = days.flatMap(d => d.stops)
  const returnLeg = request.returnToOrigin && stops.length ? transit(area, request.origin.areaId, request, data) : null
  if (returnLeg?.cost != null) { spent = money(spent + returnLeg.cost); transportTotal = money(transportTotal + returnLeg.cost) }
  const unknownCosts = stops.filter(s => s.entryCost === null || s.transit.cost === null).length + (returnLeg?.cost === null ? 1 : 0)
  if (unknownCosts) warnings.add('Cost estimate is incomplete. Unknown fares and fees are not zero and may put the trip over budget.')
  if (stops.some(s => s.transit.status === 'recorded')) warnings.add('Station transfers and waiting times are unpriced. Recorded routes are area-to-area, not door-to-door.')
  if (request.days > 1 && request.lodging.preference === 'none') warnings.add('No lodging allowance included; assumes accommodation is already arranged.')
  if (request.preferences.includes('Accessible routes')) warnings.add('Only attraction accessibility is checked. Transport accessibility is unverified; this plan does not guarantee an accessible route.')
  if (data.geofences.some(f => f.active && !hasPoint(f.coordinates))) warnings.add('Some geofences have no usable coordinates and could not be checked.')
  const covered = new Set(stops.map(s => s.areaId))
  for (const dest of request.destinations) if (!covered.has(dest.areaId)) warnings.add(`${nameOf(dest.areaId)} has no scheduled stop. Adjust selections, days, accessibility requirements or budget.`)
  const costComplete = unknownCosts === 0 && !stops.some(s => s.transit.status === 'recorded') && stops.length > 0
  const status = spent > request.budget ? 'over-budget' : !stops.length ? 'empty' : !costComplete || covered.size < request.destinations.length ? 'incomplete' : 'within-budget'
  const localMatch = (f: any) => request.destinations.some(d => String(f.where).toLowerCase().includes(nameOf(d.areaId).toLowerCase()))
  const localFoods = data.foods.filter(f => localMatch(f) || /throughout pangasinan/i.test(String(f.where)))
    .sort((a, b) => Number(localMatch(b)) - Number(localMatch(a))).slice(0, 6)
    .map(f => ({ name: f.name, description: f.description, where: f.where, listedAveragePrice: number(f.avgPrice, 0, 100_000) ? f.avgPrice : null, note: 'Guide price; confirm with the vendor. Meals come from your food allowance.' }))
  // Legacy guide fares remain useful, but an unspecified fare basis cannot be used in group arithmetic.
  const normalize = (value: string) => value.toLowerCase().replace(/\bcity\b/g, '').trim()
  const destinationNames = [...request.destinations.map(d => nameOf(d.areaId)), ...stops.map(s => s.place)].map(normalize)
  const starts = [normalize(nameOf(request.origin.areaId)), ...destinationNames]
  const matchName = (value: string, names: string[]) => names.some(name => normalize(value) === name || name.startsWith(normalize(value) + ' '))
  const relevant = data.fares.filter(f => number(f.price, 0, 100_000) && matchName(String(f.to), destinationNames) && (request.transportModes.includes(String(f.vehicle).toLowerCase()) || /boat/i.test(String(f.vehicle))))
  const gateways = relevant.filter(f => /boat/i.test(String(f.vehicle))).map(f => normalize(String(f.from)))
  const fareGuide = data.fares.filter(f => number(f.price, 0, 100_000) &&
    (request.transportModes.includes(String(f.vehicle).toLowerCase()) || /boat/i.test(String(f.vehicle))) &&
    ((matchName(String(f.from), [...starts, ...gateways]) && matchName(String(f.to), [...destinationNames, ...gateways])) ||
      (request.returnToOrigin && matchName(String(f.from), destinationNames) && normalize(String(f.to)) === normalize(nameOf(request.origin.areaId)))))
    .slice(0, 12).map(f => ({ sourceId: String(f._id), from: f.from, to: f.to, vehicle: f.vehicle, price: f.price, basis: f.fareBasis || 'unspecified', duration: f.duration, notes: f.notes || '', verifiedAt: f.verifiedAt || null }))
  const entryAllowance = money(stops.reduce((sum, stop) => sum + (stop.entryCost ?? stop.listedEntryEstimate ?? 0), 0))
  const transportAllowance = money(Math.max(transportTotal, Math.max(0, request.budget - food - lodging - entryAllowance) * 0.6))
  const allocation = { food, lodging, entry: entryAllowance, transport: transportAllowance, buffer: money(Math.max(0, request.budget - food - lodging - entryAllowance - transportAllowance)) }
  days.forEach(day => { day.narrative = day.stops.length ? `Visit ${[...new Set(day.stops.map((s: any) => nameOf(s.areaId)))].join(', ')} in the selected order. Confirm travel times before departure.` : 'No stop fits this day. Adjust your plan before traveling.' })
  return { version: 1, generatedAt: new Date().toISOString(), mode: 'database', narrativeStatus: 'not-requested', request, days, returnLeg, localFoods, fareGuide, allocation,
    costs: { currency: 'PHP', basis: 'group', categories: { food, lodging, entry: entryTotal, transport: transportTotal }, knownTotal: spent, perPerson: money(spent / request.travelers), budget: request.budget, remainingKnown: money(request.budget - spent), unknownCosts, complete: costComplete, status }, warnings: [...warnings], omitted }
}
