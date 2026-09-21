import { Router, Response } from 'express'
import { Place, SavedPlace } from '../models'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/public', async (_req, res: Response) => {
  const places = await SavedPlace.find({ isPublic: true }).sort({ createdAt: -1 })
  res.json(places)
})

router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  const places = await SavedPlace.find({ userId: req.userId }).sort({ createdAt: -1 })
  res.json(places)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, category, description, icon } = req.body
  const matches = typeof name === 'string' ? await Place.find({ name }).select('_id').limit(2) : []
  const place = await SavedPlace.create({ userId: req.userId!, name, category, description, icon, ...(matches.length === 1 ? { placeId: matches[0]._id } : {}) })
  res.status(201).json(place)
})

router.put('/:id', async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const place = await SavedPlace.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true },
    )
    if (!place) return res.status(404).json({ error: 'Place not found' })
    res.json(place)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req: AuthRequest<{ id: string }>, res: Response) => {
  const place = await SavedPlace.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  if (!place) return res.status(404).json({ error: 'Place not found' })
  res.json({ message: 'Place removed' })
})

export default router
