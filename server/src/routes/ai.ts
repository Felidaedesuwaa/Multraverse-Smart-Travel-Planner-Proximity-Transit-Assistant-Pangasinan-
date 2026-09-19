import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { Phrasebook } from '../models'

const router = Router()
router.use(authenticate)

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'
const supportedLanguages = ['Filipino', 'Pangasinan', 'English'] as const

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

// ── Transcribe ────────────────────────────────────────────
// The local FastAPI service is a text model and deliberately has no speech-to-text
// endpoint. Keep the public route explicit until a local speech model is integrated.
router.post('/transcribe', (_req: AuthRequest, res: Response) => {
  return res.status(501).json({
    error: 'Local audio transcription is not configured. The AI service supports text generation only.',
  })
})

// ── AI Itinerary ──────────────────────────────────────────
router.post('/itinerary', async (req: AuthRequest, res: Response) => {
  try {
    const { destination, budget, days, preferences } = req.body as {
      destination?: unknown
      budget?: unknown
      days?: unknown
      preferences?: unknown
    }
    if (typeof destination !== 'string' || !destination.trim() ||
        (typeof budget !== 'string' && typeof budget !== 'number') ||
        typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > 30 ||
        (preferences !== undefined && (!Array.isArray(preferences) || !preferences.every(item => typeof item === 'string')))) {
      return res.status(400).json({ error: 'destination, budget, and a days value from 1 to 30 are required' })
    }

    const result = await callAI('/itinerary', {
      destination: destination.trim(),
      budget: String(budget),
      days,
      preferences: preferences ?? [],
    })
    return res.json(result)
  } catch (error: unknown) {
    console.error('Itinerary route error:', error)
    return sendAIError(res, error, 'Failed to generate itinerary')
  }
})

export default router
