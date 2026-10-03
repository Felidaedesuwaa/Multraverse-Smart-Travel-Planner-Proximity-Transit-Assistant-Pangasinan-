import reference from '../data/pangasinanFares.json'

export type FareInput = { mode: string; tableId?: string; km?: number; rides: number; allowance?: number; referenceAccepted?: boolean }
export const fareTables = reference.sections.filter(s => ['jeepney', 'tricycle', 'bus-ordinary', 'bus-aircon', 'bus-deluxe', 'bus-super-deluxe'].includes(s.id)).map(s => {
  const rows: { km: number; regular: number; old?: number; discounted?: number }[] = [...s.rows]
  for (const line of (s.rows.length ? '' : s.text).split(s.id === 'tricycle' ? 'Superseded table' : '\u0000')[0].split('\n')) {
    if (!/^\s*\d/.test(line)) continue
    const values = line.replace(/,/g, '').match(/\d+(?:\.\d+)?/g)?.map(Number) || []
    if (s.id === 'tricycle' && values.length === 3 && line.includes('|')) rows.push({ km: values[0], regular: values[1] })
    if (s.id === 'jeepney' && values.length === 6) {
      rows.push({ km: values[0], regular: values[1] }, { km: values[3], regular: values[4] })
    }
    if (s.id.startsWith('bus-') && values.length === 10) {
      rows.push({ km: values[0], old: values[1], regular: values[3] }, { km: values[5], old: values[6], regular: values[8] })
    }
  }
  return { id: s.id, mode: s.id.startsWith('bus-') ? 'Bus' : s.id === 'jeepney' ? 'Jeepney' : 'Tricycle', scope: s.scope, source: `${reference.source_file}, page ${s.first_page}`, rows: rows.sort((a,b) => a.km-b.km) }
})

export function estimateTransport(request: { areaId: string; date: string; travelers: number; transportModes: string[]; fareInputs: FareInput[] }) {
  return request.transportModes.map(mode => {
    const input = request.fareInputs.find(f => f.mode === mode)
    const base = { mode, rides: input?.rides || 0, perRide: null as number | null, total: null as number | null, basis: 'unconfirmed', note: 'Add a fare estimate for this mode.', source: '' }
    if (!input) return base
    if (input.allowance != null) return { ...base, perRide: input.allowance, total: input.allowance * input.rides * request.travelers, basis: 'allowance', note: 'Your allowance per person per ride; not a quoted fare.' }
    const table = fareTables.find(t => t.id === input.tableId && t.mode === mode)
    const row = table?.rows.find(r => r.km === input.km)
    if (!table || !row) return { ...base, note: 'Select a listed billed distance.' }
    if (mode === 'Tricycle' && request.areaId !== 'dagupan') return { ...base, note: 'The supplied tricycle matrix applies only to Dagupan. Local fare not verified.' }
    if (mode === 'Jeepney' && request.date < '2023-10-08') return { ...base, note: 'The jeepney table is not effective on this date.' }
    if (mode === 'Tricycle' && request.date < '2025-01-01') return { ...base, note: 'The Dagupan reference does not establish fares before 2025.' }
    const fare = mode === 'Bus' && request.date < '2026-09-28' ? row.old : row.regular
    if (fare == null) return base
    return { ...base, perRide: fare, total: fare * input.rides * request.travelers, basis: 'reference', source: table.source,
      note: `${input.km} km per ride · Regular fare. ${table.scope}` }
  })
}

export function estimateCosts(request: { areaId: string; date: string; travelers: number; transportModes: string[]; fareInputs: FareInput[]; mealBudget: number; days: number; budget: number; hotelRooms: number }, hotel?: { reference_rate: { min: number; max: number; period: string; basis: string } }, entryFees = 0) {
  const transport = estimateTransport(request)
  const meals = request.mealBudget * request.travelers * request.days
  const nights = Math.max(0, request.days - 1)
  const nightly = hotel?.reference_rate
  const roomEstimate = nightly && !/flat rate|group basis|per.head|per.person/i.test(nightly.basis)
  const lodging = nights && nightly?.period === 'night' && roomEstimate ? { min: nightly.min * nights * request.hotelRooms, max: nightly.max * nights * request.hotelRooms, nights, rooms: request.hotelRooms, note: 'Assumes rates per room; confirm capacity, fees and price basis.' } : null
  const transportTotal = transport.reduce((sum, item) => sum + (item.total ?? 0), 0)
  const emergency = Math.round(request.budget * 0.1 * 100) / 100
  const min = entryFees + emergency + meals + transportTotal + (lodging?.min || 0)
  const max = entryFees + emergency + meals + transportTotal + (lodging?.max || 0)
  return { meals, emergency, entryFees, transport, transportTotal, lodging, min, max, perPersonMin: min / request.travelers, perPersonMax: max / request.travelers,
    remainingMin: request.budget - max, remainingMax: request.budget - min,
    status: min > request.budget ? 'over-budget' : max > request.budget ? 'may-exceed' : 'partial',
    note: 'Planning estimate only. Unpriced transport, entry fees and extra charges are excluded; remaining budget is provisional.' }
}
