import { Router, Response } from 'express'
import Groq from 'groq-sdk'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { authenticate, AuthRequest } from '../middleware/auth'
import { LocalFood, Phrasebook, Place, RoutePrice } from '../models'

const router = Router()
router.use(authenticate)

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const supportedLanguages = ['Filipino', 'Pangasinan', 'English'] as const

const pangasinanTranslationGuide = `You are a careful Pangasinan linguist translating for travelers in Pangasinan, Philippines.

Pangasinan is a low-resource language: do not treat it as Ilocano, Tagalog, Cebuano, or Indonesian. Translate the source language directly; never translate through English unless the target is English. Preserve names, place names, numbers, politeness, questions, and tense. Use natural, contemporary Pangasinan spelling. If a Pangasinan word is ambiguous, choose the most common Pangasinan sense from context; do not invent a word or silently replace it with an Ilocano word.

Verified examples:
- Pangasinan "Maabig ya kaboasan" → Filipino "Magandang umaga"
- Pangasinan "Iner so terminal?" → Filipino "Nasaan ang terminal?"
- Pangasinan "Magkano so pamasahe?" → Filipino "Magkano ang pamasahe?"
- Pangasinan "Abigan mo ak!" → Filipino "Tulungan mo ako!"
- Pangasinan "Iner so ospital?" → Filipino "Nasaan ang ospital?"
- Filipino "Magandang umaga" → Pangasinan "Maong ya bigla"
- Filipino "Nasaan ang terminal?" → Pangasinan "Iner so terminal?"

Return only the translated text. Do not add explanations, alternatives, labels, confidence notes, or markdown.`

// ── Translate ───────────────────────────────────────────
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
    if (from === to) return res.json({ translation: text.trim() })

    // ── Phrasebook lookup first ─────────────────────────
    const needle = text.trim().toLowerCase()
    const fromField = from.toLowerCase() as 'filipino' | 'pangasinan' | 'english'
    const toField = to.toLowerCase() as 'filipino' | 'pangasinan' | 'english'

    const phrase = await Phrasebook.findOne({ [fromField]: { $regex: `^${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })

    if (phrase) {
      return res.json({
        translation: phrase[toField],
        source: 'phrasebook',
      })
    }

    // ── Fall back to Groq if not in phrasebook ──────────
    const completion = await groq.chat.completions.create({
      model: 'groq/compound-mini',
      messages: [
        { role: 'system', content: pangasinanTranslationGuide },
        { role: 'user', content: `Translate from ${from} to ${to}:\n${text.trim()}` },
      ],
      temperature: 0,
      max_tokens: 1024,
    })

    const translation = completion.choices[0]?.message?.content?.trim()
    if (!translation) throw new Error('Translation service returned no text')

    return res.json({ translation, source: 'ai' })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to translate text'
    console.error('Translation route error:', err)
    return res.status(500).json({ error: message })
  }
})

// ── Transcribe (Groq Whisper) ───────────────────────────
router.post('/transcribe', async (req: AuthRequest, res: Response) => {
  let tempPath: string | null = null
  try {
    const { audio, mimeType } = req.body as { audio?: string; mimeType?: string }

    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required' })
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, 'base64')

    if (audioBuffer.length < 500) {
      return res.status(400).json({ error: 'Audio recording is too short. Please speak longer.' })
    }

    // Write to temp file — Groq requires a file stream
    const ext = mimeType?.includes('mp4') ? 'm4a' : 'webm'
    tempPath = path.join(os.tmpdir(), `transcribe-${Date.now()}.${ext}`)
    fs.writeFileSync(tempPath, audioBuffer)

    // Send to Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-large-v3-turbo',
      response_format: 'text',
      language: 'tl', // Filipino/Tagalog — also works for Pangasinan and English
    })

    return res.json({ text: transcription })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Transcription failed'
    console.error('Transcription error:', err)
    return res.status(500).json({ error: message })
  } finally {
    // Always clean up temp file
    if (tempPath && fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath) } catch { /* ignore */ }
    }
  }
})

// ── AI Itinerary ────────────────────────────────────────
router.post('/itinerary', async (req: AuthRequest, res: Response) => {
  try {
    const { destination, budget, days, preferences } = req.body

    if (!destination || !budget || !days) {
      return res.status(400).json({ error: 'destination, budget and days are required' })
    }

    // ── Pull real data from knowledge base ──────────────
    const [places, routes, foods] = await Promise.all([
      Place.find({ $or: ['municipality', 'location', 'name'].map(field => ({ [field]: { $regex: destination, $options: 'i' } })) }),
      RoutePrice.find({ $or: ['from', 'to'].map(field => ({ [field]: { $regex: destination, $options: 'i' } })) }),
      LocalFood.find(),
    ])

    // If no specific places found, get all places as fallback
    const finalPlaces = places.length > 0
      ? places
      : await Place.find().limit(6)

    // Get transport routes to destination from common hubs
    const transportRoutes = routes.length > 0
      ? routes
      : await RoutePrice.find({ $or: [{ to: { $regex: destination, $options: 'i' } }, { from: { $regex: '^Dagupan$', $options: 'i' } }] }).limit(8)

    const prompt = `You are a Pangasinan travel expert AI assistant.
Create a detailed ${days}-day travel itinerary for ${destination}, Pangasinan with a total budget of ₱${budget}.
Travel preferences: ${preferences?.join(', ') || 'general sightseeing'}.

IMPORTANT: Use ONLY the verified data provided below. Do not invent places, prices, or routes.

=== VERIFIED PLACES TO VISIT ===
${JSON.stringify(finalPlaces.map(p => ({
  name: p.name,
  location: p.location,
  category: p.category,
  entryFee: p.entryFee,
  openHours: p.openHours,
  highlights: p.highlights,
  tips: p.tips,
})), null, 2)}

=== VERIFIED TRANSPORT ROUTES & PRICES ===
${JSON.stringify(transportRoutes.map(r => ({
  from: r.from,
  to: r.to,
  vehicle: r.vehicle,
  price: r.price,
  duration: r.duration,
  notes: r.notes,
})), null, 2)}

=== VERIFIED LOCAL FOOD ===
${JSON.stringify(foods.map(f => ({
  name: f.name,
  avgPrice: f.avgPrice,
  where: f.where,
  category: f.category,
})), null, 2)}

RULES:
- Only use places from the verified list above
- Only use transport prices from the verified list above
- Include at least one local food stop per day using verified food data
- Keep total estimated cost within ₱${budget}
- Use realistic travel times based on verified route durations
- Include entry fees from the verified data

Respond ONLY with a valid JSON object, no explanation, no markdown, no code blocks.
Use exactly this structure:
{
  "days": [
    {
      "day": 1,
      "stops": [
        {
          "time": "8:00 AM",
          "place": "Place Name",
          "activity": "What to do there",
          "estimatedCost": 150
        }
      ]
    }
  ]
}`

    const completion = await groq.chat.completions.create({
      model: 'groq/compound-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2048,
    })

    const text = completion.choices[0]?.message?.content ?? ''
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(clean)
    return res.json(parsed)

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate itinerary'
    console.error('AI route error:', err)
    return res.status(500).json({ error: message })
  }
})

export default router
