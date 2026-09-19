import { Router, Response } from 'express'
import { User } from '../models'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/me', async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId).select('name email role location createdAt')
  res.json(user)
})

router.put('/me', async (req: AuthRequest, res: Response) => {
  const { name, location } = req.body
  const user = await User.findByIdAndUpdate(req.userId, { name, location }, { new: true, runValidators: true }).select('name email role location')
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const users = await User.find().select('name email role location createdAt').sort({ createdAt: -1 })
  res.json(users)
})

export default router
