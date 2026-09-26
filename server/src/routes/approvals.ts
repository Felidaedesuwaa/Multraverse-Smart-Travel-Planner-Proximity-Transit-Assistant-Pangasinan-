import { AuditLog } from '../models'
import { Router } from 'express'
import { isValidObjectId } from 'mongoose'
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth'
import { lguResources } from '../lib/lguResources'

const router = Router()
router.use(authenticate, requireAdmin)
router.use('/:resource', (req, res, next) => {
  if (!Object.prototype.hasOwnProperty.call(lguResources, req.params.resource)) return res.status(404).json({ error: 'Unknown resource' })
  next()
})
router.get('/:resource', async (req: AuthRequest<{ resource: string }>, res) => {
  const status = req.query.status || 'pending'
  if (!['pending', 'approved', 'rejected'].includes(String(status))) return res.status(400).json({ error: 'Invalid status' })
  res.json(await lguResources[req.params.resource].model.find({ approvalStatus: status }).sort({ submittedAt: -1 }))
})
router.post('/:resource/:id/:decision', async (req: AuthRequest<{ resource: string; id: string; decision: string }>, res) => {
  const { id, decision, resource } = req.params
  if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid resource ID' })
  if (!['approve', 'reject'].includes(decision)) return res.status(404).json({ error: 'Unknown decision' })
  const reason = req.body?.reason
  if (decision === 'reject' && (typeof reason !== 'string' || !reason.trim() || reason.length > 1000)) return res.status(400).json({ error: 'Provide a rejection reason (1–1000 characters)' })
  const revision = req.body?.revision
  if (!Number.isInteger(revision) || revision < 0) return res.status(400).json({ error: 'Provide the submission revision being reviewed' })
  const { model } = lguResources[resource]
  const types: Record<string, string> = { places: 'place', geofences: 'geofence', foods: 'local_food', 'route-prices': 'route_price', 'transit-routes': 'transit_route' }
  const logDecision = (item: any) => AuditLog.create({ actor: req.userId, action: `${decision}_${types[resource]}`, metadata: { itemId: id, municipality: item.municipality, ...(item.pendingDeletion ? { deletion: true } : {}) } })
  if (decision === 'approve') {
    const deleted = await model.findOneAndDelete({ _id: id, approvalStatus: 'pending', pendingDeletion: true, reviewRevision: revision })
    if (deleted) { await logDecision(deleted); return res.json({ id, deleted: true }) }
  }
  // Match pending state atomically so a decision cannot be applied twice.
  const item = await model.findOneAndUpdate({ _id: id, approvalStatus: 'pending', reviewRevision: revision, ...(decision === 'approve' ? { pendingDeletion: { $ne: true } } : {}) }, {
    $set: { approvalStatus: decision === 'approve' ? 'approved' : 'rejected', reviewedBy: req.userId, reviewedAt: new Date(), rejectionReason: decision === 'reject' ? reason.trim() : null },
  }, { new: true, runValidators: true })
  if (!item) return res.status(409).json({ error: 'Submission no longer pending; refresh the queue' })
  await logDecision(item)
  res.json(item)
})
export default router
