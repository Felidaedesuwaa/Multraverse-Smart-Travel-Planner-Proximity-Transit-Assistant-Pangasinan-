import { sanitizeRequest, validateRouter, pagination, validateId } from '../middleware/input'
import express, { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { Phrasebook, TransitRoute } from '../models'
import { publishedFilter } from '../models/_moderation'
import areas from '../data/plannerAreas.json'
import { transitMunicipality } from '../lib/transitBoundary'
import plannerRoutes from './planner'
import groundedItineraryRoutes from './groundedItinerary'
import { AISettings } from '../models/AISettings'
import phrasebookV2 from '../data/phrasebookV2.json'
import transitReference from '../data/pangasinanTransitReference.json'
import corridorReferences from '../data/transitCorridorReferences.json'
import transitFarePolicy from '../../../src/data/transitFarePolicy.json'
import { rateLimit } from '../middleware/security'

const router = Router()
router.param('id', validateId)
router.use(sanitizeRequest, validateRouter('ai'))
router.use(authenticate)
router.use((req, res, next) => req.method === 'POST' ? rateLimit('ai-user', 10, 60 * 1000, true)(req, res, next) : next())
router.use(groundedItineraryRoutes)
router.use(plannerRoutes)
const expressJsonAudio = express.json({ limit: '12mb' })

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'
const supportedLanguages = ['Filipino', 'Pangasinan', 'English'] as const

for (const action of ['plan', 'check']) {
  router.post(`/transit/alarm/${action}`, async (req: AuthRequest, res: Response) => {
    const body = req.body
    const point = (p: any) => p && typeof p.lat === 'number' && typeof p.lng === 'number'
      && Number.isFinite(p.lat) && Number.isFinite(p.lng) && !!transitMunicipality(p.lat, p.lng)
    if (!point(body.destination) || !point(action === 'plan' ? body.origin : body.position)
      || ![100, 300, 500, 1000, 2000].includes(body.radius)
      || (action === 'check' && (!Number.isFinite(body.accuracy) || body.accuracy < 0 || !Number.isFinite(body.timestamp) || body.timestamp < 0)))
      return res.status(400).json({ error: 'Choose Pangasinan coordinates and valid GPS/alarm settings.' })
    try {
      const payload = action === 'plan'
        ? { origin: body.origin, destination: body.destination, radius: body.radius }
        : { position: body.position, destination: body.destination, radius: body.radius, accuracy: body.accuracy, timestamp: body.timestamp }
      return res.json(await callAI(`/transit/alarm/${action}`, payload, 10000))
    } catch (error) { return sendAIError(res, error, 'Unable to calculate your transit alarm.') }
  })
}

router.post('/transit/search', async (req: AuthRequest, res: Response) => {
  const { from, to } = req.body
  if (!areas.some(a => a.id === from) || !areas.some(a => a.id === to) || from === to) return res.status(400).json({ error: 'Choose two different Pangasinan municipalities.' })
  try {
    const records = await TransitRoute.find({ ...publishedFilter, status: 'ACTIVE', sourceUrl: { $regex: '^https?://' }, verifiedAt: { $ne: null } }).limit(500).lean()
    const candidates = records.flatMap((r: any) => {
      const stops = r.stopLocations || []
      const start = stops.findIndex((s: any) => s.areaId === from)
      const end = stops.findIndex((s: any, i: number) => i > start && s.areaId === to)
      if (start < 0 || end <= start || !stops.every((s: any) => transitMunicipality(s.lat, s.lng) === s.areaId)) return []
      return [{ id: String(r._id), name: r.name, type: r.type, frequency: r.frequency, sourceUrl: r.sourceUrl, verifiedAt: r.verifiedAt, firstDeparture: r.firstDeparture, lastDeparture: r.lastDeparture, stops: stops.slice(start, end + 1).map((s: any) => ({ name: s.name, areaId: s.areaId, lat: s.lat, lng: s.lng })) }]
    })
    // Transit selection is deterministic; no language model or Python service is needed.
    const gpsRoutes = transitReference.routes.flatMap(r => {
      const farePolicy = transitFarePolicy.traditional_jeepney
      const estimatedFare = Math.round((farePolicy.base_fare + Math.max(0, r.lengthKm - farePolicy.base_distance_km) * farePolicy.succeeding_rate_per_km) * 100) / 100
      const stops: { name: string; areaId: string; lat: number; lng: number; coordinateType: string }[] = r.stopLocations
      const start = stops.findIndex(s => s.areaId === from)
      const end = stops.findIndex((s, i) => i > start && s.areaId === to)
      if (start < 0 || end <= start || !stops.every(s => transitMunicipality(s.lat, s.lng) === s.areaId)) return []
      return [{ ...r, id: `lptrp-2022-${r.routeNumber}`, sourceUrl: transitReference.sourceUrl,
        sourceFile: transitReference.sourceFile, planYear: transitReference.planYear,
        type: r.authorizedMode, frequency: 'Schedule unconfirmed', gpsReference: true,
        estimatedFare, fareCalculation: { ...farePolicy, vehicle_basis: 'traditional_jeepney', distance_km: r.lengthKm, scope: 'full_route' },
        corridorReferences: corridorReferences.filter(reference => reference.waypoint_labels.some(label => r.unmappedWaypoints.includes(label))),
        stops: stops.slice(start, end + 1) }]
    })
    res.json({ routes: [...candidates, ...gpsRoutes].sort((a, b) => a.stops.length - b.stops.length || a.id.localeCompare(b.id)), referenceRoutes: [] })
  } catch (error) { sendAIError(res, error, 'Unable to search transit routes.') }
})

class AIServiceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'AIServiceError'
  }
}

async function callAI(endpoint: string, body: object, timeout = 120_000) {
  let response: globalThis.Response
  try {
    response = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    })
  } catch (error) {
    throw new AIServiceError('AI service is unavailable. Please try again later.', 503)
  }

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload && typeof payload === 'object' && 'detail' in payload
      ? (payload as { detail?: unknown }).detail
      : undefined
    throw new AIServiceError(
      'The AI service could not complete the request. Please try again.',
      response.status >= 500 ? 503 : 400,
    )
  }
  return payload
}

function sendAIError(res: Response, error: unknown, fallback: string) {
  const message = error instanceof AIServiceError ? error.message : fallback
  const status = error instanceof AIServiceError ? error.status : 500
  return res.status(status).json({ error: message })
}

// The regular /itinerary endpoint remains the deterministic planner route
// mounted above. This opt-in model endpoint returns the FastAPI JSON itinerary
// shape using the selected tourism guides in FastAPI.
router.post('/itinerary/model', async (req: AuthRequest, res: Response) => {
  try {
    const { destination, budget, days, preferences } = req.body as {
      destination?: unknown; budget?: unknown; days?: unknown; preferences?: unknown
    }
    if (typeof destination !== 'string' || destination.trim().length < 2)
      return res.status(400).json({ error: 'A destination is required' })
    if (!Number.isInteger(days) || (days as number) < 1 || (days as number) > 7)
      return res.status(400).json({ error: 'Days must be a whole number from 1 to 7' })
    if (typeof budget !== 'string' && typeof budget !== 'number')
      return res.status(400).json({ error: 'A budget is required' })
    if (preferences !== undefined && (!Array.isArray(preferences) || preferences.some(item => typeof item !== 'string')))
      return res.status(400).json({ error: 'Preferences must be a list of strings' })

    const result = await callAI('/itinerary', {
      destination: destination.trim(), budget: String(budget), days,
      preferences: preferences || [],
    })
    return res.json(result)
  } catch (error) {
    return sendAIError(res, error, 'Failed to generate an AI itinerary')
  }
})

// ── Translate ────────────────────────────────────────────
router.post('/translate', async (req: AuthRequest, res: Response) => {
  try {
    const { text, from, to } = req.body as { text?: unknown; from?: unknown; to?: unknown }

    if (typeof text !== 'string' || !text.trim())
      return res.status(400).json({ error: 'Text is required' })
    if (text.length > 2_000)
      return res.status(400).json({ error: 'Text must be 2,000 characters or fewer' })
    if (
      typeof from !== 'string' ||
      typeof to !== 'string' ||
      !supportedLanguages.includes(from as typeof supportedLanguages[number]) ||
      !supportedLanguages.includes(to as typeof supportedLanguages[number])
    ) {
      return res.status(400).json({ error: 'Translations are available for Filipino, Pangasinan, and English only' })
    }
    if (from === to) return res.json({ translation: text.trim(), source: 'identity' })

    // Use known translations without invoking the generative model.
    const needle = text.trim().toLowerCase()
    const fromField = from.toLowerCase() as 'filipino' | 'pangasinan' | 'english'
    const toField = to.toLowerCase() as 'filipino' | 'pangasinan' | 'english'
    const phrase = await Phrasebook.findOne({
      $or: phrasebookV2,
      [fromField]: { $regex: `^${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    })
    if (phrase) return res.json({ translation: phrase[toField], source: 'phrasebook' })

    const controls = await AISettings.findById('global')
    if (controls?.translation === false) return res.status(503).json({ error: 'Local AI translation is disabled by the administrator. No phrasebook match was found.' })
    const result = await callAI('/translate', {
      text: text.trim(),
      from_lang: from,
      to_lang: to,
    })
    return res.json(result)
  } catch (error: unknown) {
    console.error('Translation route error:', error)
    return sendAIError(res, error, 'Failed to translate text')
  }
})

// The phrasebook is the source of truth for verified traveller phrases. Keeping
// this behind the API means additions and corrections in MongoDB appear in the
// app without a client release or a hard-coded duplicate list.
router.get('/phrasebook', async (req: AuthRequest, res: Response) => {
  try {
    const phrases = await Phrasebook.find({ $or: phrasebookV2 }).sort({ category: 1, filipino: 1, _id: 1 }).skip(pagination(req).skip).limit(pagination(req).limit).lean()
    return res.json(phrases.map(({ _id, filipino, pangasinan, english, category }) => ({
      id: String(_id), filipino, pangasinan, english, category,
    })))
  } catch (error) {
    return sendAIError(res, error, 'Unable to load the phrasebook')
  }
})

// ── Transcribe ────────────────────────────────────────────
// Audio stays local: Express validates the request then proxies it to Whisper/TTS.
router.post('/transcribe', expressJsonAudio, async (req: AuthRequest, res: Response) => {
  try {
    const { audio, mimeType } = req.body as { audio?: unknown; mimeType?: unknown }
    if (typeof audio !== 'string' || audio.length < 20 || audio.length > 14_000_000)
      return res.status(400).json({ error: 'A valid audio recording is required' })
    const result = await callAI('/transcribe', { audio, mime_type: typeof mimeType === 'string' ? mimeType : 'audio/webm' })
    return res.json(result)
  } catch (error) {
    return sendAIError(res, error, 'Unable to transcribe recording')
  }
})

router.post('/speech', async (req: AuthRequest, res: Response) => {
  try {
    const { text, language } = req.body as { text?: unknown; language?: unknown }
    if (typeof text !== 'string' || !text.trim() || text.length > 2_000)
      return res.status(400).json({ error: 'Text is required' })
    const result = await callAI('/speech', { text: text.trim(), language: typeof language === 'string' ? language : 'English' })
    return res.json(result)
  } catch (error) {
    return sendAIError(res, error, 'Unable to create speech')
  }
})

// ── AI Itinerary ──────────────────────────────────────────
// Itinerary planning is handled by plannerRoutes above.

export default router
