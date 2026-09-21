import { Router } from 'express'
import mongoose from 'mongoose'
import { AuthRequest, requireAdmin } from '../middleware/auth'
import { Place, RoutePrice, TransitRoute, LocalFood, SavedPlace, Geofence, Trip, TripStop, User } from '../models'
import { PlannerDraft } from '../models/PlannerDraft'
import { AISettings } from '../models/AISettings'
import areas from '../data/plannerAreas.json'
import { areaIdFor, buildPlan, PlanningError, savedPlaceIds, validateRequest } from '../lib/planner'

// Mounted after authentication in ai.ts. All plan IDs are scoped to their owner.
const router = Router()
const settings = async () => (await AISettings.findById('global').lean()) || { itineraryNarrative: true, translation: true }
const ownedDraft = (id: string, userId?: string) => mongoose.isValidObjectId(id) ? PlannerDraft.findOne({ _id: id, userId, expiresAt: { $gt: new Date() } }) : Promise.resolve(null)
router.get('/settings', async (_req, res) => { res.json(await settings()) })
router.put('/settings', requireAdmin, async (req, res) => {
  const changes = req.body
  if (!changes || Object.keys(changes).some(k => !['itineraryNarrative', 'translation'].includes(k) || typeof changes[k] !== 'boolean')) return res.status(400).json({ error: 'Only boolean AI controls are accepted.' })
  res.json(await AISettings.findByIdAndUpdate('global', { $set: changes }, { new: true, upsert: true, runValidators: true }))
})
router.get('/planner/catalog', async (req: AuthRequest, res) => {
  const [places, saved, fares, foods] = await Promise.all([
    Place.find().sort({ name: 1 }).lean(),
    SavedPlace.find({ userId: req.userId }).select('placeId name').lean(),
    RoutePrice.find().select('from to vehicle price duration notes').lean(),
    LocalFood.find().select('name description avgPrice where category').lean(),
  ])
  const savedIds = savedPlaceIds(places, saved)
  const catalogPlaces = places.map(p => ({ ...p, id: String(p._id), _id: undefined, areaId: areaIdFor(p), saved: savedIds.has(String(p._id)) }))
  res.json({
    // `places` is the canonical unfiltered catalog. `areas` remains for older clients.
    places: catalogPlaces,
    areas: areas.map(area => ({ ...area, attractions: catalogPlaces.filter(p => p.areaId === area.id) })),
    // These are displayed as planning guidance before generation; the itinerary
    // engine still calculates its result from the current MongoDB records.
    fares: fares.map(fare => ({ ...fare, id: String(fare._id), _id: undefined })),
    foods: foods.map(food => ({ ...food, id: String(food._id), _id: undefined })),
    generatedAt: new Date().toISOString(),
  })
})
const profileAreaId = (location?: string) => {
  const normalized = String(location || '').toLowerCase().replace(/\bcity\b|\bpangasinan\b/g, '').replace(/[^a-z]/g, '')
  return areas.find(area => area.name.toLowerCase().replace(/[^a-z]/g, '') === normalized)?.id || 'dagupan'
}
router.post('/itinerary', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId).select('location').lean()
    // Origin is automatically the user's saved profile location. This avoids a
    // duplicate starting-town field in the planner while preserving route logic.
    const request = validateRequest({ ...req.body, origin: { areaId: profileAreaId(user?.location) } })
    const [places, fares, routes, foods, saved, geofences] = await Promise.all([
      Place.find().lean(), RoutePrice.find().lean(), TransitRoute.find().lean(), LocalFood.find().lean(),
      SavedPlace.find({ userId: req.userId }).lean(), Geofence.find({ active: true }).lean(),
    ])
    const plan = buildPlan(request, { places, fares, routes, foods, saved, geofences })
    const draft = await PlannerDraft.create({ userId: req.userId, plan, expiresAt: new Date(Date.now() + 86400000) })
    res.json({ ...plan, id: String(draft._id) })
  } catch (error) {
    if (error instanceof PlanningError) return res.status(400).json({ error: error.message })
    throw error
  }
})

let circuitUntil = 0
const inFlight = new Set<string>()
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
router.post('/planner/:id/narrative', async (req: AuthRequest<{ id: string }>, res) => {
  const draft = await ownedDraft(req.params.id, req.userId)
  if (!draft) return res.status(404).json({ error: 'Plan expired. Generate again before saving or enriching it.' })
  const plan = draft.plan
  const fallback = (reason: string) => res.json({ ...plan, id: String(draft._id), days: plan.days.map((day: any) => ({ ...day, stops: day.stops.map((stop: any) => ({ ...stop, narrative: null })) })), mode: 'database', narrativeStatus: reason })
  if (!(await settings()).itineraryNarrative) return fallback('disabled-by-admin')
  if (plan.mode === 'hybrid') return res.json({ ...plan, id: String(draft._id) })
  if (circuitUntil > Date.now()) return fallback('service-cooling-down')
  if (inFlight.size) return fallback('service-busy')
  if (!plan.days.some((d: any) => d.stops.length)) return fallback('no-stops')
  inFlight.add(req.params.id)
  try {
    const placeIds = plan.days.flatMap((day: any) => day.stops.map((stop: any) => stop.placeId)).filter((id: unknown) => mongoose.isValidObjectId(id))
    const destinationNames = plan.request.destinations
      .map((destination: any) => areas.find(area => area.id === destination.areaId)?.name)
      .filter((name: unknown): name is string => typeof name === 'string')
    const destinationMatcher = destinationNames.length ? new RegExp(destinationNames.map(escapeRegex).join('|'), 'i') : /$^/
    const [contextPlaces, contextRoutes, contextFoods] = await Promise.all([
      Place.find({ _id: { $in: placeIds } }).select('name location municipality description entryFee').lean(),
      RoutePrice.find({ $or: [{ from: destinationMatcher }, { to: destinationMatcher }] }).select('from to vehicle price duration notes').limit(8).lean(),
      LocalFood.find({ where: destinationMatcher }).select('name description avgPrice where category').limit(6).lean(),
    ])
    // The FastAPI service has its own startup cache too. This narrower snapshot
    // keeps a request tied to the exact database records used by this plan.
    const response = await fetch(`${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/narrative`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        days: plan.days.map((day: any) => ({ day: day.day, stops: day.stops.map((stop: any) => ({ placeId: stop.placeId, name: stop.place, facts: stop.activity })) })),
        context: { places: contextPlaces, routes: contextRoutes, foods: contextFoods },
      }),
    })
    if (!response.ok) throw new Error('Local model unavailable')
    const result: any = await response.json()
    if (!Array.isArray(result.days)) throw new Error('Invalid narrative response')
    let accepted = 0
    for (const day of plan.days) {
      const enrichment = result.days.find((d: any) => d.day === day.day)
      for (const stop of day.stops) {
        const item = enrichment?.stops?.find((s: any) => s.placeId === stop.placeId)
        // Extractive validation: the model may select a source sentence, never add facts.
        if (typeof item?.text === 'string' && item.text.trim().length >= 12 && item.text.length <= 400 && stop.activity.includes(item.text.trim())) {
          stop.narrative = item.text.trim(); accepted++
        }
      }
      // Day summaries are deterministic so a model cannot introduce unscheduled stops.
      day.narrativeSource = 'database'
    }
    if (!(await settings()).itineraryNarrative) return fallback('disabled-by-admin')
    plan.mode = accepted ? 'hybrid' : 'database'
    plan.narrativeStatus = accepted ? 'complete' : 'no-grounded-text'
    draft.plan = plan; draft.markModified('plan'); await draft.save()
    return res.json({ ...plan, id: String(draft._id) })
  } catch {
    circuitUntil = Date.now() + 30_000
    return fallback('offline-or-timeout')
  } finally { inFlight.delete(req.params.id) }
})

router.post('/planner/:id/save', async (req: AuthRequest<{ id: string }>, res) => {
  const plannerId = `${req.userId}:${req.params.id}`
  const existing = await Trip.findOne({ userId: req.userId, plannerId }).populate('tripStops')
  if (existing) return res.json(existing)
  const draft = await ownedDraft(req.params.id, req.userId)
  if (!draft) return res.status(404).json({ error: 'Plan expired. Generate again before saving.' })
  const plan = draft.plan
  const stops = plan.days.flatMap((day: any) => day.stops.map((stop: any) => ({ ...stop, day: day.day, date: day.date })))
  if (!stops.length || plan.costs.status === 'over-budget') return res.status(400).json({ error: 'Add stops and resolve the known budget overrun before saving.' })
  if (plan.costs.status === 'incomplete' && req.body?.acceptIncomplete !== true) return res.status(400).json({ error: 'Acknowledge unpriced items before saving this provisional plan.' })
  try {
    const result = await mongoose.connection.transaction(async session => {
      const [trip] = await Trip.create([{
        userId: req.userId, plannerId, title: `${plan.request.destinations.map((d: any) => areas.find(a => a.id === d.areaId)?.name).join(' / ')} trip`,
        location: 'Pangasinan', date: plan.request.dates.start, budget: plan.request.budget, spent: 0, stops: stops.length,
        estimatedCost: plan.costs.knownTotal, plan, icon: 'landmark', status: 'UPCOMING',
      }], { session })
      await TripStop.insertMany(stops.map((stop: any, order: number) => ({ tripId: trip._id, placeId: stop.placeId, name: stop.place, address: stop.address, order, day: stop.day, date: stop.date, time: stop.time, estimatedCost: stop.estimatedCost, details: stop })), { session })
      return trip
    })
    return res.status(201).json(result)
  } catch (error: any) {
    if (error?.code === 11000) return res.json(await Trip.findOne({ userId: req.userId, plannerId }))
    throw error
  }
})
export default router
