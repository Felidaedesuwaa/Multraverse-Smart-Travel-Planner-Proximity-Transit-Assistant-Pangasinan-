import { sanitizeRequest, validateRouter, pagination, validateId } from '../middleware/input'
import { Router, Response } from 'express'
import { BudgetEntry, User, Trip } from '../models'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.param('id', validateId)
router.use(sanitizeRequest, validateRouter('budget'))
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  const entries = await BudgetEntry.find({ userId: req.userId }).sort({ createdAt: -1, _id: -1 }).skip(pagination(req).skip).limit(pagination(req).limit)
  res.json(entries)
})

router.get('/settings', async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId).select('budgetSettings')
  if (!user) return res.status(404).json({ error: 'Account not found' })
  res.json(user.budgetSettings || { monthlyBudget: null, savingsTarget: null })
})

router.put('/settings', async (req: AuthRequest, res: Response) => {
  const user = await User.findByIdAndUpdate(req.userId, { $set: { budgetSettings: req.body } }, { new: true, runValidators: true }).select('budgetSettings')
  if (!user) return res.status(404).json({ error: 'Account not found' })
  res.json(user.budgetSettings)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const { label, category, amount, color, tripId } = req.body
  if (typeof label !== 'string' || !label.trim() || typeof category !== 'string' || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0)
    return res.status(400).json({ error: 'Label, category, and a positive amount are required.' })
  if (tripId && !await Trip.exists({ _id: tripId, userId: req.userId })) return res.status(400).json({ error: 'Trip must belong to your account' })
  const entry = await BudgetEntry.create({ userId: req.userId!, label, category, amount, color, tripId })
  res.status(201).json(entry)
})

router.delete('/:id', async (req: AuthRequest<{ id: string }>, res: Response) => {
  const entry = await BudgetEntry.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  if (!entry) return res.status(404).json({ error: 'Entry not found' })
  res.json({ message: 'Entry deleted' })
})

export default router
