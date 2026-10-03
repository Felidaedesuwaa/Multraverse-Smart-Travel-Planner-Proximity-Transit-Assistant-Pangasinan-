import reference from '../data/pangasinanFares.json'

import { calculateTransport, calculateBudgetTotals } from './fareCalculation'
import type { FareInput } from './fareCalculation'
export type { FareInput } from './fareCalculation'
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

export function estimateTransport(request: Parameters<typeof calculateTransport>[0]) {
  return calculateTransport(request, fareTables)
}

export function estimateCosts(request: { areaId: string; date: string; travelers: number; transportModes: string[]; fareInputs: FareInput[]; mealBudget: number; days: number; budget: number; hotelRooms: number }, hotel?: { reference_rate: { min: number; max: number; period: string; basis: string } }, entryFees = 0) {
  const transport = estimateTransport(request)
  const meals = request.mealBudget * request.travelers * request.days
  const nights = Math.max(0, request.days - 1)
  const nightly = hotel?.reference_rate
  const roomEstimate = nightly && !/flat rate|group basis|per.head|per.person/i.test(nightly.basis)
  const lodging = nights && nightly?.period === 'night' && roomEstimate ? { min: nightly.min * nights * request.hotelRooms, max: nightly.max * nights * request.hotelRooms, nights, rooms: request.hotelRooms, note: 'Assumes rates per room; confirm capacity, fees and price basis.' } : null
  const transportTotal = transport.reduce((sum, item) => sum + (item.total ?? 0), 0)
  const totals = calculateBudgetTotals(request.budget, request.travelers, { meals, transportTotal, entryFees, lodging })
  return { meals, entryFees, transport, transportTotal, lodging, ...totals,
    note: 'Transport prices use the supplied fare matrix. Unpriced transport, entry fees and extra charges are excluded from the total.' }
}
