import { Router, Response } from 'express'
import { BudgetEntry, Trip, TripStop } from '../models'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  const trips = await Trip.find({ userId: req.userId }).sort({ createdAt: -1 }).populate('tripStops')
  res.json(trips)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const { title, location, date, budget, icon } = req.body
  const trip = await Trip.create({ userId: req.userId!, title, location, date, budget, icon })
  res.status(201).json(trip)
})

router.put('/:id', async (req: AuthRequest<{ id: string }>, res: Response) => {
  const { id } = req.params
  const trip = await Trip.findOneAndUpdate({ _id: id, userId: req.userId }, req.body, { new: true, runValidators: true })
  if (!trip) return res.status(404).json({ error: 'Trip not found' })
  res.json(trip)
})

router.delete('/:id', async (req: AuthRequest<{ id: string }>, res: Response) => {
  const trip = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  if (!trip) return res.status(404).json({ error: 'Trip not found' })
  await Promise.all([TripStop.deleteMany({ tripId: trip._id }), BudgetEntry.updateMany({ tripId: trip._id }, { $set: { tripId: null } })])
  res.json({ message: 'Trip deleted' })
})

export default router
