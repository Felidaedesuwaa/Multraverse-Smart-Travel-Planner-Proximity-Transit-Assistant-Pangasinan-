import { publishedFilter } from '../models/_moderation'
import { Router, Request, Response } from 'express'
import { Geofence } from '../models'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const geofences = await Geofence.find(req.userRole === 'ADMIN' ? {} : publishedFilter).sort({ createdAt: -1 })
  res.json(geofences)
})

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { location, zone, radius, coord, x, y } = req.body
  const geofence = await Geofence.create({ location, zone, radius, coord, x, y })
  res.status(201).json(geofence)
})

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  const geofence = await Geofence.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!geofence) return res.status(404).json({ error: 'Geofence not found' })
  res.json(geofence)
})

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  const geofence = await Geofence.findByIdAndDelete(req.params.id)
  if (!geofence) return res.status(404).json({ error: 'Geofence not found' })
  res.json({ message: 'Geofence deleted' })
})

export default router
