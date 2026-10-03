export type FareInput = { mode: string; tableId?: string; km?: number; rides: number; allowance?: number; referenceAccepted?: boolean }
export type FareTable = { id: string; mode: string; scope: string; source: string; rows: { km: number; regular: number; old?: number; discounted?: number }[] }

export function finiteNumber(value: unknown, fallback = 0): number {
  if (value == null || value === '') return fallback
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const currency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export function calculateBudgetTotals(budget: number, travelers: number, costs: { meals?: number; transportTotal?: number; entryFees?: number; lodging?: { min: number; max: number } | null }) {
  budget = finiteNumber(budget)
  travelers = finiteNumber(travelers)
  const emergency = Math.round(budget * 10) / 100
  const subtotal = finiteNumber(costs.meals) + finiteNumber(costs.transportTotal) + finiteNumber(costs.entryFees)
  const min = currency(subtotal + finiteNumber(costs.lodging?.min) + emergency)
  const max = currency(subtotal + finiteNumber(costs.lodging?.max) + emergency)
  return { emergency, min, max, perPersonMin: travelers > 0 ? currency(min / travelers) : null, perPersonMax: travelers > 0 ? currency(max / travelers) : null,
    remainingMin: currency(budget - max), remainingMax: currency(budget - min),
    status: min > budget ? 'over-budget' : max > budget ? 'may-exceed' : 'partial' }
}

export function calculateTransport(request: { areaId: string; date: string; travelers: number; transportModes: string[]; fareInputs: FareInput[] }, tables: FareTable[]) {
  return (request.transportModes || []).map(mode => {
    const input = request.fareInputs?.find(f => f.mode === mode)
    const base = { mode, rides: finiteNumber(input?.rides), perRide: null as number | null, total: null as number | null, basis: 'unconfirmed', note: 'Select kilometers from the fare matrix for this mode.', source: '' }
    if (!input) return base
    const rides = finiteNumber(input.rides), travelers = finiteNumber(request.travelers)
    if (!Number.isInteger(rides) || rides < 1 || !Number.isInteger(travelers) || travelers < 1) return base
    if (input.allowance != null) {
      const allowance = finiteNumber(input.allowance, -1)
      if (allowance < 0) return base
      return { ...base, rides, perRide: allowance, total: currency(allowance * rides * travelers), basis: 'allowance', note: 'Your allowance per person per ride; not a quoted fare.' }
    }
    const table = tables.find(t => t.id === input.tableId && t.mode === mode)
    const row = table?.rows.find(r => r.km === finiteNumber(input.km, -1))
    if (!table || !row) return { ...base, note: 'Select a listed billed distance.' }
    if (mode === 'Tricycle' && request.areaId !== 'dagupan') return { ...base, note: 'The supplied tricycle matrix applies only to Dagupan. Local fare not verified.' }
    if (mode === 'Jeepney' && request.date < '2023-10-08') return { ...base, note: 'The jeepney table is not effective on this date.' }
    if (mode === 'Tricycle' && request.date < '2025-01-01') return { ...base, note: 'The Dagupan reference does not establish fares before 2025.' }
    const fare = mode === 'Bus' && request.date < '2026-09-28' ? row.old : row.regular
    if (fare == null || !Number.isFinite(Number(fare))) return base
    return { ...base, rides, perRide: Number(fare), total: currency(Number(fare) * rides * travelers), basis: 'reference', source: table.source,
      note: `${input.km} km per ride · Regular fare. ${table.scope}` }
  })
}
