import { calculateBudgetTotals, calculateTransport, finiteNumber } from '../../server/src/lib/fareCalculation';

export function itinerarySummary(plan, fareTables = []) {
  if (!plan?.request) return null;
  const r = plan.request, stored = plan.costEstimate || {};
  const calculated = fareTables.length ? calculateTransport(r, fareTables) : [];
  const transport = (r.transportModes || []).map(mode => {
    const saved = stored.transport?.find(f => f.mode === mode);
    return saved?.total != null && Number.isFinite(Number(saved.total)) ? saved : calculated.find(f => f.mode === mode) || saved;
  }).filter(Boolean);
  const transportTotal = transport.reduce((sum, fare) => sum + finiteNumber(fare.total), 0);
  const meals = finiteNumber(stored.meals, finiteNumber(r.mealBudget) * finiteNumber(r.days) * finiteNumber(r.travelers));
  const entryFees = finiteNumber(stored.entryFees, (plan.stops || []).filter(s => s.tag === 'Attraction').reduce((sum, s) => sum + finiteNumber(s.price), 0));
  const costs = { ...stored, meals, entryFees, transport, transportTotal };
  return { ...costs, ...calculateBudgetTotals(r.budget, r.travelers, costs) };
}
