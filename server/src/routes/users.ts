import { createManagedAccount, managedAccountInput, MANAGED_USER_FIELDS } from '../lib/managedAccounts'
import { Router, Response } from 'express'
import { User } from '../models'
import { authenticate, requireAdmin, requireSuperAdmin, AuthRequest } from '../middleware/auth'
import { PROFILE_FIELDS, profileUpdate } from '../lib/profile'
import { RegistrationError } from '../lib/registration'
import { deleteAccount } from '../lib/deleteAccount'
import { AuthError, authLimit } from '../lib/authLimits'

const router = Router()
router.use(authenticate)

for (const [path, role] of [['lgu-accounts', 'LGU'], ['admin-accounts', 'ADMIN']] as const) {
  router.get(`/${path}`, requireSuperAdmin, async (_req, res) => {
    res.json(await User.find({ role }).select(MANAGED_USER_FIELDS).populate('createdBy', 'email role').sort({ createdAt: -1, _id: -1 }))
  })
  router.post(`/${path}`, requireSuperAdmin, async (req: AuthRequest, res, next) => {
    let input
    try { input = managedAccountInput(req.body, role) }
    catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid account details' }) }
    try {
      if (await User.exists({ email: input.email })) return res.status(409).json({ error: 'An account with this email already exists' })
      const user = await createManagedAccount(input, role, req.userId!)
      res.status(201).json(user)
    } catch (error: any) {
      if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists' })
      next(error)
    }
  })
}

router.delete('/me', async (req: AuthRequest, res: Response, next) => {
  try {
    await authLimit('delete-account', req.userId!, 5, 15 * 60 * 1000)
    await deleteAccount(req.userId!, req.body?.password, req.body?.confirmation)
    res.json({ message: 'Your account and associated data have been permanently deleted.' })
  } catch (error) {
    if (error instanceof AuthError) return res.status(error.status).json({ error: error.message })
    next(error)
  }
})

router.get('/me', async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId).select(PROFILE_FIELDS)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

router.put('/me', async (req: AuthRequest, res: Response) => {
  let update
  try { update = profileUpdate(req.body) }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid profile details', ...(error instanceof RegistrationError ? { fieldErrors: error.fieldErrors } : {}) }) }
  const user = await User.findByIdAndUpdate(req.userId, { $set: update }, { new: true, runValidators: true }).select(PROFILE_FIELDS)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const users = await User.find().select('name email role municipality location createdAt').sort({ createdAt: -1 })
  res.json(users)
})

export default router
