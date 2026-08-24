import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  const trips = await prisma.trip.findMany({
    where: { userId: req.userId },
    include: { tripStops: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(trips)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const { title, location, date, budget, icon } = req.body
  const trip = await prisma.trip.create({
    data: { userId: req.userId!, title, location, date, budget, icon },
  })
  res.status(201).json(trip)
})

router.put('/:id', async (req: AuthRequest<{ id: string }>, res: Response) => {
  const { id } = req.params
  const trip = await prisma.trip.update({
    where: { id },
    data: req.body,
  })
  res.json(trip)
})

router.delete('/:id', async (req: AuthRequest<{ id: string }>, res: Response) => {
  await prisma.trip.delete({ where: { id: req.params.id } })
  res.json({ message: 'Trip deleted' })
})

export default router
