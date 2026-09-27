import { sanitizeRequest, validateRouter, pagination, validateId } from '../middleware/input'
import { Router, Response } from 'express'
import mongoose from 'mongoose'
import { BudgetEntry, Trip } from '../models'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.param('id', validateId)
router.use(sanitizeRequest, validateRouter('trips'))
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  const trips = await Trip.find({ userId: req.userId }).sort({ createdAt: -1, _id: -1 }).skip(pagination(req).skip).limit(pagination(req).limit)
  const totals = await BudgetEntry.aggregate([
    { $match: { userId: trips[0]?.userId, tripId: { $in: trips.map(trip => trip._id) } } },
    { $group: { _id: '$tripId', total: { $sum: '$amount' } } },
  ])
  const spent = new Map(totals.map(entry => [String(entry._id), entry.total]))
  res.json(trips.map(trip => ({ ...trip.toJSON(), spent: spent.get(String(trip._id)) || 0 })))
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const { title, location, date, budget, icon } = req.body
  const trip = await Trip.create({ userId: req.userId!, title, location, date, budget, icon })
  res.status(201).json(trip)
})

router.put('/:id', async (req: AuthRequest<{ id: string }>, res: Response) => {
  const { id } = req.params
  const allowed = ['title', 'location', 'date', 'status', 'budget', 'icon']
  if (!req.body || Object.keys(req.body).some(key => !allowed.includes(key))) return res.status(400).json({ error: 'Only trip title, location, date, status, budget and icon can be edited. Replan to change itinerary estimates.' })
  const trip = await Trip.findOneAndUpdate({ _id: id, userId: req.userId }, { $set: req.body }, { new: true, runValidators: true })
  if (!trip) return res.status(404).json({ error: 'Trip not found' })
  res.json(trip)
})

router.delete('/:id', async (req: AuthRequest<{ id: string }>, res: Response) => {
  const trip = await mongoose.connection.transaction(async session => {
    const removed = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.userId }, { session })
    if (removed) await BudgetEntry.updateMany({ tripId: removed._id }, { $set: { tripId: null } }, { session })
    return removed
  })
  if (!trip) return res.status(404).json({ error: 'Trip not found' })
  res.json({ message: 'Trip deleted' })
})

export default router
