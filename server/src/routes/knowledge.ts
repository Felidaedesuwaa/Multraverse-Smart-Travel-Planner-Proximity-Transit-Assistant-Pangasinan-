import { sanitizeRequest, validateRouter, pagination, validateId } from '../middleware/input'
import { publishedFilter } from '../models/_moderation'
import { Router, Response } from 'express'
import { LocalFood, Place, RoutePrice } from '../models'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()
router.param('id', validateId)
router.use(sanitizeRequest, validateRouter('knowledge'))
router.use(authenticate)

// ── Places ─────────────────────────────────────────────

router.get('/places', async (req: AuthRequest, res: Response) => {
  const places = await Place.find(req.userRole === 'ADMIN' ? {} : publishedFilter).sort({ createdAt: -1, _id: -1 }).skip(pagination(req).skip).limit(pagination(req).limit)
  res.json(places)
})

router.post('/places', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const place = await Place.create(req.body)
    res.status(201).json(place)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(err instanceof Error && ['ValidationError', 'CastError', 'StrictModeError'].includes(err.name) ? 400 : 500).json({ error: 'Unable to save resource; check the supplied fields.' })
  }
})

router.put('/places/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const place = await Place.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!place) return res.status(404).json({ error: 'Place not found' })
    res.json(place)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(err instanceof Error && ['ValidationError', 'CastError', 'StrictModeError'].includes(err.name) ? 400 : 500).json({ error: 'Unable to save resource; check the supplied fields.' })
  }
})

router.delete('/places/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const place = await Place.findByIdAndDelete(req.params.id)
    if (!place) return res.status(404).json({ error: 'Place not found' })
    res.json({ message: 'Place deleted' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(err instanceof Error && ['ValidationError', 'CastError', 'StrictModeError'].includes(err.name) ? 400 : 500).json({ error: 'Unable to save resource; check the supplied fields.' })
  }
})

// ── Route Prices ───────────────────────────────────────

router.get('/route-prices', async (req: AuthRequest, res: Response) => {
  const routes = await RoutePrice.find(req.userRole === 'ADMIN' ? {} : publishedFilter).sort({ createdAt: -1, _id: -1 }).skip(pagination(req).skip).limit(pagination(req).limit)
  res.json(routes)
})

router.post('/route-prices', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const route = await RoutePrice.create(req.body)
    res.status(201).json(route)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(err instanceof Error && ['ValidationError', 'CastError', 'StrictModeError'].includes(err.name) ? 400 : 500).json({ error: 'Unable to save resource; check the supplied fields.' })
  }
})

router.put('/route-prices/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const route = await RoutePrice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!route) return res.status(404).json({ error: 'Route price not found' })
    res.json(route)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(err instanceof Error && ['ValidationError', 'CastError', 'StrictModeError'].includes(err.name) ? 400 : 500).json({ error: 'Unable to save resource; check the supplied fields.' })
  }
})

router.delete('/route-prices/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const route = await RoutePrice.findByIdAndDelete(req.params.id)
    if (!route) return res.status(404).json({ error: 'Route price not found' })
    res.json({ message: 'Route price deleted' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(err instanceof Error && ['ValidationError', 'CastError', 'StrictModeError'].includes(err.name) ? 400 : 500).json({ error: 'Unable to save resource; check the supplied fields.' })
  }
})

// ── Local Food ─────────────────────────────────────────

router.get('/foods', async (req: AuthRequest, res: Response) => {
  const foods = await LocalFood.find(req.userRole === 'ADMIN' ? {} : publishedFilter).sort({ createdAt: -1, _id: -1 }).skip(pagination(req).skip).limit(pagination(req).limit)
  res.json(foods)
})

router.post('/foods', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const food = await LocalFood.create(req.body)
    res.status(201).json(food)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(err instanceof Error && ['ValidationError', 'CastError', 'StrictModeError'].includes(err.name) ? 400 : 500).json({ error: 'Unable to save resource; check the supplied fields.' })
  }
})

router.put('/foods/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const food = await LocalFood.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!food) return res.status(404).json({ error: 'Food not found' })
    res.json(food)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(err instanceof Error && ['ValidationError', 'CastError', 'StrictModeError'].includes(err.name) ? 400 : 500).json({ error: 'Unable to save resource; check the supplied fields.' })
  }
})

router.delete('/foods/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const food = await LocalFood.findByIdAndDelete(req.params.id)
    if (!food) return res.status(404).json({ error: 'Food not found' })
    res.json({ message: 'Food deleted' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(err instanceof Error && ['ValidationError', 'CastError', 'StrictModeError'].includes(err.name) ? 400 : 500).json({ error: 'Unable to save resource; check the supplied fields.' })
  }
})

export default router
