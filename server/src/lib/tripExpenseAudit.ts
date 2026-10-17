import { calculateBudgetTotals, finiteNumber } from './fareCalculation'

export const expenseCategories = ['Transport', 'Food', 'Accommodation', 'Entrance Fees', 'Activities', 'Shopping', 'Emergency', 'Others']
export function tripExpenseLines(trip: any) {
  const plan = trip.plan, guided = plan?.guided, stored = guided?.costEstimate || {}, request = guided?.request || {}
  const categories = plan?.costs?.categories || {}
  // Use the same saved values and fallbacks as the itinerary cost summary.
  const meals = guided ? finiteNumber(stored.meals, finiteNumber(request.mealBudget) * finiteNumber(request.days) * finiteNumber(request.travelers)) : categories.food ?? null
  const entryFees = guided ? finiteNumber(stored.entryFees, (guided.stops || []).filter((stop: any) => stop.tag === 'Attraction').reduce((sum: number, stop: any) => sum + finiteNumber(stop.price), 0)) : categories.entry ?? null
  const transportation = guided ? (request.transportModes || []).reduce((sum: number, mode: string) => sum + finiteNumber(stored.transport?.find((fare: any) => fare.mode === mode)?.total), 0) : categories.transport ?? null
  const hotel = guided ? finiteNumber(stored.lodging?.max) : categories.lodging ?? null
  const emergency = guided ? calculateBudgetTotals(request.budget, request.travelers, {}).emergency : categories.buffer ?? plan?.allocation?.buffer ?? null
  return [
    { key: 'meals', label: 'Meals', category: 'Food', estimate: meals },
    { key: 'emergency', label: 'Emergency', category: 'Emergency', estimate: emergency },
    { key: 'entry', label: 'Listed entry fees', category: 'Entrance Fees', estimate: entryFees },
    { key: 'lodging', label: 'Hotel', category: 'Accommodation', estimate: hotel },
    { key: 'transport', label: 'Transportation', category: 'Transport', estimate: transportation },
  ]
}
export function validateExpenseAudit(trip: any, expenses: any, existing: any[]) {
  if (!Array.isArray(expenses) || expenses.length > 300) throw new Error('Review all breakdown items and enter valid actual expenses.')
  const required = new Set(tripExpenseLines(trip).map(line => line.key))
  const existingIds = new Set(existing.map(entry => String(entry._id)))
  const keys = new Set(), ids = new Set()
  for (const row of expenses) {
    if (!row || Object.keys(row).some(key => !['key', 'entryId', 'label', 'category', 'amount', 'reviewed'].includes(key)) || typeof row.key !== 'string' || keys.has(row.key) || row.reviewed !== true || typeof row.label !== 'string' || !row.label.trim() || row.label.length > 120 || /[<>\x00-\x1f]/.test(row.label) || !expenseCategories.includes(row.category) || typeof row.amount !== 'number' || !Number.isFinite(row.amount) || row.amount < 0 || row.amount > 1e9 || Math.abs(row.amount * 100 - Math.round(row.amount * 100)) > 0.00001) throw new Error('Audit every item, including zero-cost items. Amounts must be nonnegative PHP amounts with up to two decimals.')
    keys.add(row.key)
    if (row.entryId) { if (!existingIds.has(row.entryId) || ids.has(row.entryId)) throw new Error('Recorded expenses changed. Reopen the audit.'); ids.add(row.entryId) }
  }
  if ([...required].some(key => !keys.has(key)) || [...existingIds].some(id => !ids.has(id))) throw new Error('Review every cost breakdown item and every recorded expense before completing the trip.')
  return expenses
}
