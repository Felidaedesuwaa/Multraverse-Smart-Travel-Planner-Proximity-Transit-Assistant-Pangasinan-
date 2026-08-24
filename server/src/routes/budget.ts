import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  const entries = await prisma.budgetEntry.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  })
  res.json(entries)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const { label, amount, color, tripId } = req.body
  const entry = await prisma.budgetEntry.create({
    data: { userId: req.userId!, label, amount, color, tripId },
  })
  res.status(201).json(entry)
})

router.delete('/:id', async (req: AuthRequest<{ id: string }>, res: Response) => {
  await prisma.budgetEntry.delete({ where: { id: req.params.id } })
  res.json({ message: 'Entry deleted' })
})

export default router
