import { Router, Response } from 'express'
import { BudgetEntry } from '../models'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  const entries = await BudgetEntry.find({ userId: req.userId }).sort({ createdAt: -1 })
  res.json(entries)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const { label, amount, color, tripId } = req.body
  const entry = await BudgetEntry.create({ userId: req.userId!, label, amount, color, tripId })
  res.status(201).json(entry)
})

router.delete('/:id', async (req: AuthRequest<{ id: string }>, res: Response) => {
  const entry = await BudgetEntry.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  if (!entry) return res.status(404).json({ error: 'Entry not found' })
  res.json({ message: 'Entry deleted' })
})

export default router
