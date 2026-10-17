import { tripExpenseLines, validateExpenseAudit } from '../lib/tripExpenseAudit'
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

router.get('/:id/expense-audit', async (req: AuthRequest<{ id: string }>, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, userId: req.userId })
  if (!trip) return res.status(404).json({ error: 'Trip not found' })
  const entries = await BudgetEntry.find({ tripId: trip._id, userId: req.userId }).sort({ createdAt: 1, _id: 1 })
  res.json({ lines: tripExpenseLines(trip), entries })
})
router.post('/:id/complete', async (req: AuthRequest<{ id: string }>, res) => {
  try {
    const result = await mongoose.connection.transaction(async session => {
      const trip = await Trip.findOne({ _id: req.params.id, userId: req.userId }).session(session)
      if (!trip) throw Object.assign(new Error('Trip not found'), { status: 404 })
      if (trip.status !== 'UPCOMING') throw Object.assign(new Error('Only upcoming trips can be completed. Refresh your trips.'), { status: 409 })
      const existing = await BudgetEntry.find({ tripId: trip._id, userId: req.userId }).session(session)
      let expenses: any[]
      try { expenses = validateExpenseAudit(trip, req.body.expenses, existing) }
      catch (error: any) { throw Object.assign(error, { status: 400 }) }
      // Claim the completion in the same transaction as every expense write.
      const updated = await Trip.findOneAndUpdate({ _id: trip._id, userId: req.userId, status: 'UPCOMING' }, { $set: { status: 'COMPLETED' } }, { new: true, session, runValidators: true })
      if (!updated) throw Object.assign(new Error('Trip already completed. Refresh your trips.'), { status: 409 })
      for (const row of expenses) {
        const data = { label: row.label.trim(), category: row.category, amount: row.amount }
        if (row.entryId) await BudgetEntry.updateOne({ _id: row.entryId, tripId: trip._id, userId: req.userId }, { $set: data }, { session, runValidators: true })
        else await BudgetEntry.create([{ ...data, userId: req.userId, tripId: trip._id }], { session })
      }
      return { ...updated.toJSON(), spent: expenses.reduce((sum: number, row: any) => sum + row.amount, 0) }
    })
    res.json(result)
  } catch (error: any) { res.status(error.status || (['ValidationError', 'CastError'].includes(error.name) ? 400 : 500)).json({ error: error.status ? error.message : 'Could not complete the trip. No expenses were saved. Please try again.' }) }
})
router.put('/:id', async (req: AuthRequest<{ id: string }>, res: Response) => {
  if (req.body.status === 'COMPLETED') return res.status(400).json({ error: 'Audit all trip expenses before completing this trip.' })
  const { id } = req.params
  const allowed = ['title', 'location', 'date', 'status', 'budget', 'icon']
  if (!req.body || Object.keys(req.body).some(key => !allowed.includes(key))) return res.status(400).json({ error: 'Only trip title, location, date, status, budget and icon can be edited. Replan to change itinerary estimates.' })
  const trip = await Trip.findOneAndUpdate({ _id: id, userId: req.userId }, { $set: req.body }, { new: true, runValidators: true })
  if (!trip) return res.status(404).json({ error: 'Trip not found' })
  res.json(trip)
})

router.delete('/:id', async (req: AuthRequest<{ id: string }>, res: Response) => {
  const existing = await Trip.findOne({ _id: req.params.id, userId: req.userId }).select('status')
  if (!existing) return res.status(404).json({ error: 'Trip not found' })
  if (!['COMPLETED', 'CANCELED'].includes(existing.status)) return res.status(409).json({ error: 'Complete or cancel this trip before deleting it.' })
  const trip = await mongoose.connection.transaction(async session => {
    const removed = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.userId, status: { $in: ['COMPLETED', 'CANCELED'] } }, { session })
    if (removed) await BudgetEntry.updateMany({ tripId: removed._id }, { $set: { tripId: null } }, { session })
    return removed
  })
  if (!trip) return res.status(404).json({ error: 'Trip not found' })
  res.json({ message: 'Trip deleted' })
})

export default router
