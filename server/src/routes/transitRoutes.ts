import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', authenticate, async (req: Request, res: Response) => {
  const routes = await prisma.transitRoute.findMany({
    orderBy: { createdAt: 'desc' },
  })
  res.json(routes)
})

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name, type, stops, frequency, passengers } = req.body
  const route = await prisma.transitRoute.create({
    data: { name, type, stops, frequency, passengers },
  })
  res.status(201).json(route)
})

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  const route = await prisma.transitRoute.update({
    where: { id: req.params.id },
    data: req.body,
  })
  res.json(route)
})

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest<{ id: string }>, res: Response) => {
  await prisma.transitRoute.delete({ where: { id: req.params.id } })
  res.json({ message: 'Route deleted' })
})

export default router
