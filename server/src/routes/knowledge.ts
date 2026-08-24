import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

// ── Places ─────────────────────────────────────────────

router.get('/places', async (req: AuthRequest, res: Response) => {
  const places = await prisma.place.findMany({
    orderBy: { createdAt: 'desc' },
  })
  res.json(places)
})

router.post('/places', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const place = await prisma.place.create({ data: req.body })
    res.status(201).json(place)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

router.put('/places/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const place = await prisma.place.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(place)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

router.delete('/places/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    await prisma.place.delete({ where: { id: req.params.id } })
    res.json({ message: 'Place deleted' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

// ── Route Prices ───────────────────────────────────────

router.get('/route-prices', async (req: AuthRequest, res: Response) => {
  const routes = await prisma.routePrice.findMany({
    orderBy: { createdAt: 'desc' },
  })
  res.json(routes)
})

router.post('/route-prices', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const route = await prisma.routePrice.create({ data: req.body })
    res.status(201).json(route)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

router.put('/route-prices/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const route = await prisma.routePrice.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(route)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

router.delete('/route-prices/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    await prisma.routePrice.delete({ where: { id: req.params.id } })
    res.json({ message: 'Route price deleted' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

// ── Local Food ─────────────────────────────────────────

router.get('/foods', async (req: AuthRequest, res: Response) => {
  const foods = await prisma.localFood.findMany({
    orderBy: { createdAt: 'desc' },
  })
  res.json(foods)
})

router.post('/foods', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const food = await prisma.localFood.create({ data: req.body })
    res.status(201).json(food)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

router.put('/foods/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const food = await prisma.localFood.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(food)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

router.delete('/foods/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    await prisma.localFood.delete({ where: { id: req.params.id } })
    res.json({ message: 'Food deleted' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

export default router
