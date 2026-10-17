export const expenseCategories = ['Transport', 'Food', 'Accommodation', 'Entrance Fees', 'Activities', 'Shopping', 'Emergency', 'Others']
export function tripExpenseLines(trip: any) {
  const lines: { key: string; label: string; category: string; estimate: number | null }[] = []
  const add = (key: string, label: string, category: string, value: any) => lines.push({ key, label: label.slice(0, 120), category, estimate: typeof value === 'number' && Number.isFinite(value) ? value : null })
  const plan = trip.plan
  if (plan?.guided) {
    const g = plan.guided, c = g.costEstimate || {}, r = g.request || {}
    add('meals', 'Meals', 'Food', c.meals ?? r.mealBudget * r.days * r.travelers)
    add('lodging', 'Lodging', 'Accommodation', c.lodging?.max ?? 0)
    for (const [i, mode] of (r.transportModes || []).entries()) add(`transport-${i}`, `${mode} fares`, 'Transport', c.transport?.find((f: any) => f.mode === mode)?.total)
    if (!(r.transportModes || []).length) add('transport', 'Transport', 'Transport', c.transportTotal ?? 0)
    for (const [i, stop] of (g.stops || []).entries()) if (stop.tag === 'Attraction') add(`entry-${i}`, `${stop.title} entry fee`, 'Entrance Fees', stop.price)
    add('emergency', 'Emergency reserve (record only what you spent)', 'Emergency', c.emergency ?? r.budget * 0.1)
  } else {
    const categories = plan?.costs?.categories && Object.keys(plan.costs.categories).length ? plan.costs.categories : { food: null, lodging: null, entry: null, transport: null }
    const names: Record<string, string> = { food: 'Food', lodging: 'Accommodation', entry: 'Entrance Fees', transport: 'Transport', buffer: 'Emergency' }
    for (const [key, value] of Object.entries(categories)) add(key, key, names[key] || 'Others', value)
    if (!('buffer' in categories) && plan?.allocation?.buffer != null) add('buffer', 'Emergency reserve (record only what you spent)', 'Emergency', plan.allocation.buffer)
  }
  return lines
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
