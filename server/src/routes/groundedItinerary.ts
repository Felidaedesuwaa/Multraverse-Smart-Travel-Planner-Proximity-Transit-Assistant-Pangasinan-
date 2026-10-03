import { Router } from 'express'
import { AuthRequest } from '../middleware/auth'
import { PlannerDraft } from '../models/PlannerDraft'
import { Trip } from '../models/Trip'
import { AISettings } from '../models/AISettings'
import { publishedItineraryCatalog } from '../lib/publishedItineraryCatalog'
import { validateItinerary, ItineraryInputError, buildGroundedItinerary, candidatesFor, validateModelOrder } from '../lib/groundedItinerary'
import { guidedSnapshot } from '../lib/guidedSnapshot'
import { estimateCosts, fareTables } from '../lib/itineraryCosts'

const router = Router()
const inFlight = new Set<string>()
router.get('/itinerary/catalog', async (_req, res) => res.json({ areas: await publishedItineraryCatalog(), fareTables }))
router.post('/itinerary/grounded', async (req: AuthRequest, res) => {
  const userId = req.userId!
  if (inFlight.has(userId)) return res.status(409).json({ error: 'A plan is already being generated for your account.' })
  inFlight.add(userId)
  try {
    const request = validateItinerary(req.body)
    // Exact sorted sets, not array order or a caller-supplied identity.
    const match = { userId, 'plan.guided.request.areaId': request.areaId,
      'plan.guided.request.tripTypes': request.tripTypes, 'plan.guided.request.activities': request.activities }
    const [drafts, trips] = await Promise.all([
      PlannerDraft.find(match).sort({ createdAt: -1, _id: -1 }).limit(3).select('plan.guided').lean(),
      Trip.find(match).sort({ createdAt: -1, _id: -1 }).limit(3).select('plan.guided').lean(),
    ])
    const history = [...drafts, ...trips].map(d => d.plan.guided).sort((a,b) => b.generatedAt.localeCompare(a.generatedAt))
      .filter((p,i,all) => all.findIndex(other => other.generatedAt === p.generatedAt) === i).slice(0,3)
    const used = new Set<string>(history.flatMap(p => p.chosenIds))
    const catalog = await publishedItineraryCatalog()
    const candidates = candidatesFor(request, used, catalog)
    let order: string[] = []
    const baseline = estimateCosts(request, catalog.find(a => a.id === request.areaId)?.lodging.find(e => e.id === request.lodgingId)?.lodgingDetails)
    let modelStatus = 'No matching options are available.'
    if (candidates.length && (await AISettings.findById('global').lean())?.itineraryNarrative !== false) {
      try {
        const response = await fetch(`${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/itinerary/rank`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(25000),
          body: JSON.stringify({ areaId: request.areaId, tripTypes: request.tripTypes, activities: request.activities, travelStyle: request.travelStyle,
            budget: request.budget, visitAllowance: Math.max(0, baseline.remainingMin), mealBudget: request.mealBudget, travelers: request.travelers, days: request.days,
            candidates: candidates.map(e => ({ id: e.id, name: e.name, category: e.category, tag: e.tag, description: (e.description || '').slice(0, 1000),
              estimated_group_cost: e.entryFee == null ? null : e.entryFee * (e.feeBasis === 'group' ? 1 : request.travelers),
              lodging_context: e.lodgingDetails ? JSON.stringify(e.lodgingDetails) : '' })) }),
        })
        if (!response.ok) throw new Error('Model unavailable')
        order = validateModelOrder(await response.json(), candidates)
      } catch { modelStatus = 'The AI model was unavailable or returned an invalid selection. This plan uses catalog matching only.' }
    } else if (candidates.length) modelStatus = 'AI assistance is disabled. This plan uses catalog matching only.'
    const plan = buildGroundedItinerary(request, used, order, catalog)
    if (!order.length) plan.warnings.push(modelStatus)
    const draft = await PlannerDraft.create({ userId, plan: guidedSnapshot(plan), expiresAt: new Date(Date.now() + 365*86400000) })
    return res.json({ ...plan, id: String(draft._id) })
  } catch (error) {
    if (error instanceof ItineraryInputError) return res.status(400).json({ error: error.message })
    if ((error as { code?: number }).code === 121) {
      console.error('Itinerary draft rejected by database validator; apply migrate-guided-itinerary after schema changes.')
      return res.status(503).json({ code: 'ITINERARY_SCHEMA_OUTDATED', error: 'The itinerary database needs a schema update. Please ask the administrator to update the planner database and try again.' })
    }
    throw error
  } finally { inFlight.delete(userId) }
})
export default router
