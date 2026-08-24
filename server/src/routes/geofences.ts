import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', authenticate, async (req: Request, res: Response) => {
  const geofences = await prisma.geofence.findMany({
    orderBy: { createdAt: 'desc' },
  })
  res.json(geofences)
})

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { location, zone, radius, coord, x, y } = req.body
  const geofence = await prisma.geofence.create({
    data: { location, zone, radius, coord, x, y },
  })
  res.status(201).json(geofence)
})

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  const geofence = await prisma.geofence.update({
    where: { id: req.params.id },
    data: req.body,
  })
  res.json(geofence)
})

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  await prisma.geofence.delete({ where: { id: req.params.id } })
  res.json({ message: 'Geofence deleted' })
})

export default router
