import { Router } from 'express'
import { isValidObjectId } from 'mongoose'
import { authenticate, AuthRequest, requireRole } from '../middleware/auth'
import { lguResources, resourceInput } from '../lib/lguResources'

const router = Router()
router.use(authenticate, requireRole(['lgu']))
// All five resources share this guard and the exact authenticated account scope.
router.use((req, res, next) => {
  if (Object.keys(req.query).some(key => key !== 'status')) return res.status(400).json({ error: 'Only a status filter is supported; municipality comes from your account' })
  next()
})

router.use('/:resource', (req, res, next) => {
  if (!Object.prototype.hasOwnProperty.call(lguResources, req.params.resource)) return res.status(404).json({ error: 'Unknown resource' })
  next()
})

router.get('/:resource', async (req: AuthRequest<{ resource: string }>, res) => {
  const { model } = lguResources[req.params.resource]
  const query: Record<string, unknown> = { municipality: req.municipality }
  if (req.query.status !== undefined) {
    if (!['pending', 'approved', 'rejected'].includes(String(req.query.status))) return res.status(400).json({ error: 'Invalid status' })
    query.approvalStatus = req.query.status
  }
  res.json(await model.find(query).sort({ submittedAt: -1, createdAt: -1 }))
})

router.get('/:resource/:id', async (req: AuthRequest<{ resource: string; id: string }>, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid resource ID' })
  const item = await lguResources[req.params.resource].model.findOne({ _id: req.params.id, municipality: req.municipality })
  if (!item) return res.status(404).json({ error: 'Resource not found' })
  res.json(item)
})

router.post('/:resource', async (req: AuthRequest<{ resource: string }>, res, next) => {
  const { model, fields } = lguResources[req.params.resource]
  try {
    const input = resourceInput(req.body, fields)
    if (input.transitRouteId) {
      const route = await lguResources['transit-routes'].model.findOne({ _id: input.transitRouteId, municipality: req.municipality })
      if (!route) return res.status(400).json({ error: 'Transit route must belong to your municipality' })
    }
    const item = await model.create({ ...input, municipality: req.municipality, approvalStatus: 'pending', submittedBy: req.userId, submittedAt: new Date() })
    res.status(201).json(item)
  } catch (error: any) {
    if (error.name === 'MongoServerError') return next(error)
    res.status(400).json({ error: error.message })
  }
})

router.put('/:resource/:id', async (req: AuthRequest<{ resource: string; id: string }>, res, next) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid resource ID' })
  const { model, fields } = lguResources[req.params.resource]
  try {
    const input = resourceInput(req.body, fields)
    if (input.transitRouteId) {
      const route = await lguResources['transit-routes'].model.findOne({ _id: input.transitRouteId, municipality: req.municipality })
      if (!route) return res.status(400).json({ error: 'Transit route must belong to your municipality' })
    }
    const item = await model.findOneAndUpdate({ _id: req.params.id, municipality: req.municipality }, {
      $set: { ...input, approvalStatus: 'pending', submittedBy: req.userId, submittedAt: new Date(), pendingDeletion: false },
      $inc: { reviewRevision: 1 },
    $unset: { reviewedBy: 1, reviewedAt: 1, rejectionReason: 1 },
    }, { new: true, runValidators: true })
    if (!item) return res.status(404).json({ error: 'Resource not found' })
    res.json(item)
  } catch (error: any) {
    if (error.name === 'MongoServerError') return next(error)
    res.status(400).json({ error: error.message })
  }
})

// Deletions also require review. The record remains available in the LGU queue.
router.delete('/:resource/:id', async (req: AuthRequest<{ resource: string; id: string }>, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid resource ID' })
  const item = await lguResources[req.params.resource].model.findOneAndUpdate({ _id: req.params.id, municipality: req.municipality }, {
    $set: { approvalStatus: 'pending', pendingDeletion: true, submittedBy: req.userId, submittedAt: new Date() },
    $inc: { reviewRevision: 1 },
    $unset: { reviewedBy: 1, reviewedAt: 1, rejectionReason: 1 },
  }, { new: true, runValidators: true })
  if (!item) return res.status(404).json({ error: 'Resource not found' })
  res.json(item)
})

export default router
