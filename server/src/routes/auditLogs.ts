import { Router } from 'express'
import { isValidObjectId } from 'mongoose'
import { AuditLog } from '../models'
import { authenticate, requireSuperAdmin } from '../middleware/auth'

const router = Router()
router.use(authenticate, requireSuperAdmin)
router.get('/', async (req, res) => {
  if (Object.keys(req.query).some(key => !['page', 'limit', 'action', 'actor'].includes(key))) return res.status(400).json({ error: 'Unsupported audit filter' })
  const { page = '1', limit = '25', action, actor } = req.query
  if (typeof page !== 'string' || !/^[1-9]\d*$/.test(page) || Number(page) > 100000 || typeof limit !== 'string' || !/^[1-9]\d*$/.test(limit) || Number(limit) > 100) return res.status(400).json({ error: 'Page must be 1?100000 and limit 1?100' })
  if (action !== undefined && (typeof action !== 'string' || !/^[a-z_]{1,80}$/.test(action))) return res.status(400).json({ error: 'Invalid action filter' })
  if (actor !== undefined && (typeof actor !== 'string' || !isValidObjectId(actor))) return res.status(400).json({ error: 'Invalid actor ID' })
  const filter = { ...(action ? { action } : {}), ...(actor ? { actor } : {}) }
  const [items, total] = await Promise.all([
    AuditLog.find(filter).populate('actor', 'email role').populate('targetUser', 'email role').sort({ createdAt: -1, _id: -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit)),
    AuditLog.countDocuments(filter),
  ])
  res.json({ items, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) })
})
export default router
