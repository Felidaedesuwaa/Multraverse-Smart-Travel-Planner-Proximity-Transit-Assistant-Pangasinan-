import { sanitizeRequest, validateRouter, pagination, validateId } from '../middleware/input'
import { publishedFilter } from '../models/_moderation'
import { Router } from 'express'
import { Geofence } from '../models'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth'
import { GeofenceMonitor } from '../models/GeofenceMonitor'
import { meters, transition, validateFence } from '../lib/geofence'
import { transitMunicipality } from '../lib/transitBoundary'

const router = Router()
router.param('id', validateId)
router.use(sanitizeRequest, authenticate)
router.get('/events', requireAdmin, async (_req, res) => {
  res.json(await GeofenceMonitor.aggregate([{ $unwind: '$events' }, { $replaceRoot: { newRoot: '$events' } }, { $sort: { timestamp: -1 } }, { $limit: 100 }]))
})
router.post('/track', async (req: AuthRequest, res) => {
  const { lat, lng, accuracy, timestamp } = req.body || {}
  if (Object.keys(req.body || {}).some(k => !['lat', 'lng', 'accuracy', 'timestamp'].includes(k)) || ![lat, lng, accuracy, timestamp].every(Number.isFinite) || lat < -90 || lat > 90 || lng < -180 || lng > 180 || accuracy < 0 || accuracy > 100 || Math.abs(Date.now() - timestamp) > 30000) return res.status(400).json({ error: 'A fresh GPS fix with accuracy of 100 metres or better is required.' })
  const zones = await Geofence.find({ $and: [publishedFilter], active: true }).lean()
  let monitor = await GeofenceMonitor.findOne({ userId: req.userId })
  if (!monitor) {
    try { monitor = await GeofenceMonitor.create({ userId: req.userId }) }
    catch (error: any) { if (error.code !== 11000) throw error; monitor = await GeofenceMonitor.findOne({ userId: req.userId }) }
  }
  if (!monitor || timestamp <= monitor.lastTimestamp) return res.status(409).json({ error: 'This GPS fix has already been processed.' })
  const states: Record<string, any> = {}, events: any[] = []
  const now = Date.now(), insideProvince = !!transitMunicipality(lat, lng)
  for (const zone of zones) {
    try { validateFence(zone) } catch { continue }
    const id = String(zone._id), previous = monitor.states[id], version = new Date(zone.updatedAt).getTime()
    const continuous = previous?.version === version && timestamp - monitor.lastTimestamp <= 30000
    const result = transition(continuous ? previous : undefined, insideProvince ? meters({ lat, lng }, zone.coordinates) : Infinity, accuracy, zone.radiusMeters, zone.dwellSeconds || 120, now)
    states[id] = { ...result.state, version }
    if (result.event) events.push({ zoneId: id, location: zone.location, message: zone.advisory || '', type: result.event, timestamp: new Date(now) })
  }
  monitor.states = states; monitor.lastTimestamp = timestamp
  monitor.set('events', [...monitor.events, ...events].slice(-500))
  for (const event of events) monitor.counts.set(event.zoneId, (monitor.counts.get(event.zoneId) || 0) + 1)
  try { await monitor.save() } catch (error: any) { if (error.name === 'VersionError') return res.status(409).json({ error: 'Another GPS fix is being processed. Try the next fix.' }); throw error }
  res.json({ events, insideProvince })
})
router.use(validateRouter('geofences'))
router.get('/', async (req: AuthRequest, res) => {
  const geofences = await Geofence.find(req.userRole === 'ADMIN' ? {} : publishedFilter).sort({ createdAt: -1, _id: -1 }).skip(pagination(req).skip).limit(pagination(req).limit)
  const counts = await GeofenceMonitor.aggregate([{ $project: { counts: { $objectToArray: '$counts' } } }, { $unwind: '$counts' }, { $group: { _id: '$counts.k', total: { $sum: '$counts.v' } } }])
  res.json(geofences.map(zone => {
    let boundaryError: string | undefined
    try { validateFence(zone) } catch (error: any) { boundaryError = error.message }
    return { ...zone.toJSON(), monitorable: !boundaryError, boundaryError, alerts: counts.find(c => c._id === String(zone._id))?.total || 0 }
  }))
})
router.post('/', requireAdmin, async (req: AuthRequest, res) => {
  let municipality
  try { municipality = validateFence(req.body) } catch (error: any) { return res.status(400).json({ error: error.message }) }
  res.status(201).json(await Geofence.create({ ...req.body, municipality }))
})
router.put('/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res) => {
  const current = await Geofence.findById(req.params.id)
  if (!current) return res.status(404).json({ error: 'Geofence not found' })
  if (req.body.active === false && Object.keys(req.body).length === 1) return res.json(await Geofence.findByIdAndUpdate(req.params.id, { active: false }, { new: true, runValidators: true }))
  let municipality
  try { municipality = validateFence({ ...current.toObject(), ...req.body }) } catch (error: any) { return res.status(400).json({ error: error.message }) }
  res.json(await Geofence.findByIdAndUpdate(req.params.id, { ...req.body, municipality }, { new: true, runValidators: true }))
})
router.delete('/:id', requireAdmin, async (req: AuthRequest<{ id: string }>, res) => {
  const geofence = await Geofence.findByIdAndDelete(req.params.id)
  if (!geofence) return res.status(404).json({ error: 'Geofence not found' })
  res.json({ message: 'Geofence deleted' })
})
export default router
