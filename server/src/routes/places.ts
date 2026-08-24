import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  const places = await prisma.savedPlace.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  })
  res.json(places)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, category, description, icon } = req.body
  const place = await prisma.savedPlace.create({
    data: { userId: req.userId!, name, category, description, icon },
  })
  res.status(201).json(place)
})

router.delete('/:id', async (req: AuthRequest<{ id: string }>, res: Response) => {
  await prisma.savedPlace.delete({ where: { id: req.params.id } })
  res.json({ message: 'Place removed' })
})

export default router
