import { Router, Response } from 'express'
import { BudgetEntry, BudgetSettings } from '../models'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  const entries = await BudgetEntry.find({ userId: req.userId }).sort({ createdAt: -1 })
  res.json(entries)
})

router.get('/settings', async (req: AuthRequest, res: Response) => {
  const settings = await BudgetSettings.findOneAndUpdate(
    { userId: req.userId }, { $setOnInsert: { monthlyBudget: 8000, savingsTarget: 20 } },
    { new: true, upsert: true, runValidators: true },
  )
  res.json(settings)
})

router.put('/settings', async (req: AuthRequest, res: Response) => {
  const { monthlyBudget, savingsTarget } = req.body as { monthlyBudget?: unknown, savingsTarget?: unknown }
  if ((monthlyBudget !== undefined && (typeof monthlyBudget !== 'number' || !Number.isFinite(monthlyBudget) || monthlyBudget < 0)) ||
      (savingsTarget !== undefined && (typeof savingsTarget !== 'number' || !Number.isFinite(savingsTarget) || savingsTarget < 0 || savingsTarget > 100)))
    return res.status(400).json({ error: 'Budget and savings target must be valid positive amounts.' })
  const settings = await BudgetSettings.findOneAndUpdate(
    { userId: req.userId }, { $set: { ...(monthlyBudget !== undefined ? { monthlyBudget } : {}), ...(savingsTarget !== undefined ? { savingsTarget } : {}) } },
    { new: true, upsert: true, runValidators: true },
  )
  res.json(settings)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const { label, category, amount, color, tripId } = req.body
  if (typeof label !== 'string' || !label.trim() || typeof category !== 'string' || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0)
    return res.status(400).json({ error: 'Label, category, and a positive amount are required.' })
  const entry = await BudgetEntry.create({ userId: req.userId!, label, category, amount, color, tripId })
  res.status(201).json(entry)
})

router.delete('/:id', async (req: AuthRequest<{ id: string }>, res: Response) => {
  const entry = await BudgetEntry.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  if (!entry) return res.status(404).json({ error: 'Entry not found' })
  res.json({ message: 'Entry deleted' })
})

export default router
