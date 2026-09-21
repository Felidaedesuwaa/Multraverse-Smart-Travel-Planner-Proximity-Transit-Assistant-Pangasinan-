import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { searchLocations } from '../lib/locations'

const router = Router()
router.use(authenticate)
router.get('/search', async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (query.length < 3 || query.length > 120) {
    return res.status(400).json({ error: 'Enter between 3 and 120 characters to search locations' })
  }
  try {
    return res.json({ results: await searchLocations(query) })
  } catch {
    return res.status(503).json({ error: 'Online location search is unavailable. You can still enter your location manually.' })
  }
})
export default router
