import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/me', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, role: true, location: true, createdAt: true },
  })
  res.json(user)
})

router.put('/me', async (req: AuthRequest, res: Response) => {
  const { name, location } = req.body
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { name, location },
    select: { id: true, name: true, email: true, role: true, location: true },
  })
  res.json(user)
})

router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, location: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(users)
})

export default router