import { publishedFilter } from '../models/_moderation'
import { Router, Request, Response } from 'express'
import { TransitRoute } from '../models'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const routes = await TransitRoute.find(req.userRole === 'ADMIN' ? {} : publishedFilter).sort({ createdAt: -1 })
  res.json(routes)
})

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name, type, stops, frequency, passengers } = req.body
  const route = await TransitRoute.create({ name, type, stops, frequency, passengers })
  res.status(201).json(route)
})

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  const route = await TransitRoute.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!route) return res.status(404).json({ error: 'Route not found' })
  res.json(route)
})

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  const route = await TransitRoute.findByIdAndDelete(req.params.id)
  if (!route) return res.status(404).json({ error: 'Route not found' })
  res.json({ message: 'Route deleted' })
})

export default router
