import { Router, Response } from 'express'
import { User } from '../models'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth'
import { PROFILE_FIELDS, profileUpdate } from '../lib/profile'

const router = Router()
router.use(authenticate)

router.get('/me', async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId).select(PROFILE_FIELDS)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

router.put('/me', async (req: AuthRequest, res: Response) => {
  let update
  try { update = profileUpdate(req.body) }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid profile details' }) }
  const user = await User.findByIdAndUpdate(req.userId, { $set: update }, { new: true, runValidators: true }).select(PROFILE_FIELDS)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const users = await User.find().select('name email role location createdAt').sort({ createdAt: -1 })
  res.json(users)
})

export default router
