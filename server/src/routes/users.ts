import { sanitizeRequest, validateRouter, pagination, validateId } from '../middleware/input'
import { createManagedAccount, managedAccountInput, managedAccountEditInput, MANAGED_USER_FIELDS } from '../lib/managedAccounts'
import mongoose from 'mongoose'
import { PlannerDraft } from '../models/PlannerDraft'
import { PasswordReset } from '../models/PasswordReset'
import { PendingRegistration } from '../models/PendingRegistration'
import { Router, Response } from 'express'
import { User, AuditLog, Trip, BudgetEntry, SavedPlace } from '../models'
import { authenticate, requireRole, requireSuperAdmin, AuthRequest } from '../middleware/auth'
import { PROFILE_FIELDS, profileUpdate } from '../lib/profile'
import { RegistrationError } from '../lib/registration'
import { deleteAccount } from '../lib/deleteAccount'
import { AuthError, authLimit } from '../lib/authLimits'
import { explorerDashboard } from '../lib/explorerUsers'

const router = Router()
router.param('id', validateId)
router.use(sanitizeRequest, validateRouter('users'))
router.use(authenticate)

router.get('/explorers', requireRole(['ADMIN', 'SUPERADMIN']), async (req, res) => {
  if (Object.keys(req.query).some(k => !['search', 'page', 'limit'].includes(k))) return res.status(400).json({ error: 'Only search and pagination are supported.' })
  const search = String(req.query.search || '').trim()
  if (search.length > 120) return res.status(400).json({ error: 'Search must be 120 characters or fewer.' })
  const { skip, limit } = pagination(req)
  res.json(await explorerDashboard(search, skip, limit))
})

for (const [path, role] of [['lgu-accounts', 'LGU'], ['admin-accounts', 'ADMIN']] as const) {
  router.put(`/${path}/:id`, requireSuperAdmin, async (req: AuthRequest, res, next) => {
    let input
    try { input = managedAccountEditInput(req.body, role) }
    catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid account details' }) }
    try {
      await mongoose.connection.transaction(async session => {
        const user = await User.findOneAndUpdate({ _id: req.params.id, role }, { $set: input }, { new: true, runValidators: true, session })
        if (!user) throw new AuthError('Account not found.', 404)
        await PasswordReset.deleteMany({ userId: user._id }, { session })
        await AuditLog.create([{ actor: req.userId, action: `update_${role.toLowerCase()}_account`, targetUser: user._id, metadata: { email: user.email, municipality: user.municipality } }], { session })
      })
      res.json(await User.findById(req.params.id).select(MANAGED_USER_FIELDS).populate('createdBy', 'email role'))
    } catch (error: any) {
      if (error instanceof AuthError) return res.status(error.status).json({ error: error.message })
      if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists' })
      next(error)
    }
  })
  router.delete(`/${path}/:id`, requireSuperAdmin, async (req: AuthRequest, res, next) => {
    if (req.body?.confirmation !== true) return res.status(400).json({ error: 'Confirm account deletion.' })
    try {
      await mongoose.connection.transaction(async session => {
        const user = await User.findOne({ _id: req.params.id, role }).session(session)
        if (!user) throw new AuthError('Account not found.', 404)
        // Validate historical attribution while the target still exists. Both
        // writes remain in this transaction, so deletion failures roll back the log.
        await AuditLog.create([{ actor: req.userId, action: `delete_${role.toLowerCase()}_account`, targetUser: user._id, metadata: { email: user.email, municipality: user.municipality } }], { session })
        const removed = await User.findOneAndDelete({ _id: user._id, role }, { session })
        if (!removed) throw new AuthError('Account changed. Refresh and try again.', 409)
        const userId = user._id
        await Trip.deleteMany({ userId }, { session })
        await BudgetEntry.deleteMany({ userId }, { session })
        await SavedPlace.deleteMany({ userId }, { session })
        await PlannerDraft.deleteMany({ userId }, { session })
        await PasswordReset.deleteMany({ userId }, { session })
        await PendingRegistration.deleteMany({ email: user.email }, { session })
      })
      res.json({ message: 'Account deleted.' })
    } catch (error) {
      if (error instanceof AuthError) return res.status(error.status).json({ error: error.message })
      next(error)
    }
  })
  router.get(`/${path}`, requireSuperAdmin, async (req, res) => {
    res.json(await User.find({ role }).select(MANAGED_USER_FIELDS).populate('createdBy', 'email role').sort({ createdAt: -1, _id: -1 }).skip(pagination(req).skip).limit(pagination(req).limit))
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

router.get('/', requireRole(['ADMIN', 'SUPERADMIN']), async (req: AuthRequest, res: Response) => {
  const users = await User.find(req.userRole === 'ADMIN' ? { role: 'EXPLORER' } : {}).select('name email role municipality location createdAt').sort({ createdAt: -1, _id: -1 }).skip(pagination(req).skip).limit(pagination(req).limit)
  res.json(users)
})

export default router
