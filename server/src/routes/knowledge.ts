import { Router, Response } from 'express'
import { LocalFood, Place, RoutePrice } from '../models'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

// ── Places ─────────────────────────────────────────────

router.get('/places', async (req: AuthRequest, res: Response) => {
  const places = await Place.find().sort({ createdAt: -1 })
  res.json(places)
})

router.post('/places', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const place = await Place.create(req.body)
    res.status(201).json(place)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

router.put('/places/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const place = await Place.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!place) return res.status(404).json({ error: 'Place not found' })
    res.json(place)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

router.delete('/places/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const place = await Place.findByIdAndDelete(req.params.id)
    if (!place) return res.status(404).json({ error: 'Place not found' })
    res.json({ message: 'Place deleted' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

// ── Route Prices ───────────────────────────────────────

router.get('/route-prices', async (req: AuthRequest, res: Response) => {
  const routes = await RoutePrice.find().sort({ createdAt: -1 })
  res.json(routes)
})

router.post('/route-prices', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const route = await RoutePrice.create(req.body)
    res.status(201).json(route)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

router.put('/route-prices/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const route = await RoutePrice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!route) return res.status(404).json({ error: 'Route price not found' })
    res.json(route)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

router.delete('/route-prices/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const route = await RoutePrice.findByIdAndDelete(req.params.id)
    if (!route) return res.status(404).json({ error: 'Route price not found' })
    res.json({ message: 'Route price deleted' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

// ── Local Food ─────────────────────────────────────────

router.get('/foods', async (req: AuthRequest, res: Response) => {
  const foods = await LocalFood.find().sort({ createdAt: -1 })
  res.json(foods)
})

router.post('/foods', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const food = await LocalFood.create(req.body)
    res.status(201).json(food)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

router.put('/foods/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const food = await LocalFood.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!food) return res.status(404).json({ error: 'Food not found' })
    res.json(food)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

router.delete('/foods/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const food = await LocalFood.findByIdAndDelete(req.params.id)
    if (!food) return res.status(404).json({ error: 'Food not found' })
    res.json({ message: 'Food deleted' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

export default router
