import express, { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { LocalFood, Phrasebook, Place, RoutePrice } from '../models'
import plannerRoutes from './planner'
import { AISettings } from '../models/AISettings'

const router = Router()
router.use(authenticate)
router.use(plannerRoutes)
const expressJsonAudio = express.json({ limit: '12mb' })

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'
const supportedLanguages = ['Filipino', 'Pangasinan', 'English'] as const
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

class AIServiceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'AIServiceError'
  }
}

async function callAI(endpoint: string, body: object) {
  let response: globalThis.Response
  try {
    response = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reach AI service'
    throw new AIServiceError(`AI service is unavailable: ${message}`, 503)
  }

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload && typeof payload === 'object' && 'detail' in payload
      ? (payload as { detail?: unknown }).detail
      : undefined
    throw new AIServiceError(
      typeof detail === 'string' ? detail : 'AI service error',
      response.status,
    )
  }
  return payload
}

function sendAIError(res: Response, error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback
  const status = error instanceof AIServiceError ? error.status : 500
  return res.status(status).json({ error: message })
}

// The regular /itinerary endpoint remains the deterministic planner route
// mounted above. This opt-in model endpoint returns the FastAPI JSON itinerary
// shape, while supplying an exact, MongoDB-derived context snapshot.
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

    const pattern = new RegExp(escapeRegex(destination.trim()), 'i')
    const [matchedPlaces, matchedRoutes, foods] = await Promise.all([
      Place.find({ $or: [{ municipality: pattern }, { location: pattern }, { name: pattern }] }).lean(),
      RoutePrice.find({ $or: [{ from: pattern }, { to: pattern }] }).lean(),
      LocalFood.find().lean(),
    ])
    const [places, routes] = await Promise.all([
      matchedPlaces.length ? matchedPlaces : Place.find().limit(6).lean(),
      matchedRoutes.length ? matchedRoutes : RoutePrice.find({ $or: [{ to: pattern }, { from: /Dagupan/i }] }).limit(8).lean(),
    ])
    const result = await callAI('/itinerary', {
      destination: destination.trim(), budget: String(budget), days,
      preferences: preferences || [], places, routes, foods,
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
router.get('/phrasebook', async (_req: AuthRequest, res: Response) => {
  try {
    const phrases = await Phrasebook.find({}).sort({ category: 1, filipino: 1 }).lean()
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
