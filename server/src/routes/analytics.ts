import { Router } from 'express'
import { BudgetEntry, Geofence, TransitRoute, Trip, User } from '../models'
import { authenticate, requireAdmin } from '../middleware/auth'
import { GeofenceMonitor } from '../models/GeofenceMonitor'
import { validateFence } from '../lib/geofence'
import { publishedFilter } from '../models/_moderation'

const router = Router()
router.use(authenticate, requireAdmin)
const change = (current: number, previous: number) => previous ? Number(((current - previous) / previous * 100).toFixed(1)) : current ? 100 : 0
const period = (start: Date, end: Date) => ({ $and: [{ $gte: ['$createdAt', start] }, { $lt: ['$createdAt', end] }] })
async function summary() {
  const now = new Date()
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const group = { _id: null, total: { $sum: 1 }, current: { $sum: { $cond: [period(current, now), 1, 0] } }, previous: { $sum: { $cond: [period(previous, current), 1, 0] } } }
  const [users, trips, expenses] = await Promise.all([
    User.aggregate([{ $group: group }]),
    Trip.aggregate([{ $group: group }]),
    BudgetEntry.aggregate([{ $group: { _id: null, revenue: { $sum: '$amount' }, currentRevenue: { $sum: { $cond: [period(current, now), '$amount', 0] } }, previousRevenue: { $sum: { $cond: [period(previous, current), '$amount', 0] } } } }]),
  ])
  return { now, current, u: users[0] || { total: 0, current: 0, previous: 0 }, t: { total: 0, current: 0, previous: 0, revenue: 0, currentRevenue: 0, previousRevenue: 0, ...trips[0], ...expenses[0] } }
}
router.get('/dashboard', async (_req, res) => {
  const { now, current, u, t } = await summary()
  const [activeRoutes, updated, routes, zones] = await Promise.all([
    TransitRoute.countDocuments({ status: 'ACTIVE' }), TransitRoute.countDocuments({ updatedAt: { $gte: current, $lt: now } }),
    TransitRoute.find().sort({ updatedAt: -1 }).limit(4).select('name type status updatedAt').lean(),
    Geofence.aggregate([{ $group: { _id: null, active: { $sum: { $cond: ['$active', 1, 0] } }, alerts: { $sum: '$alerts' } } }]),
  ])
  const zone = zones[0] || { active: 0, alerts: 0 }
  const counts = await GeofenceMonitor.aggregate([{ $project: { counts: { $objectToArray: '$counts' } } }, { $unwind: '$counts' }, { $group: { _id: null, total: { $sum: '$counts.v' } } }])
  zone.alerts = counts[0]?.total || 0
  const fences = await Geofence.find({ $and: [publishedFilter], active: true }).lean()
  zone.active = fences.filter(fence => { try { validateFence(fence); return true } catch { return false } }).length
  res.json({ totalUsers: u.total, userGrowthRate: change(u.current, u.previous), activeRoutes, routesUpdatedThisMonth: updated, geofenceAlerts: zone.alerts, activeGeofences: zone.active, totalRevenue: t.revenue, revenueGrowthRate: change(t.currentRevenue, t.previousRevenue), routes, activity: [
    { label: 'Registered users', value: u.total, detail: 'All user accounts' }, { label: 'Trips created', value: t.total, detail: 'All recorded trips' },
    { label: 'Active geofences', value: zone.active, detail: 'Enabled alert zones' }, { label: 'Geofence alerts', value: zone.alerts, detail: 'Recorded across all zones' },
  ] })
})
router.get('/', async (_req, res) => {
  const { now, u, t } = await summary()
  const months = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1)))
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6 + i)))
  const [growth, weekly, returning, destinations] = await Promise.all([
    User.aggregate([{ $match: { createdAt: { $gte: months[0] } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } }]),
    Trip.aggregate([{ $match: { createdAt: { $gte: days[0] } } }, { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } }, user: '$userId' } } }, { $group: { _id: '$_id.day', count: { $sum: 1 } } }]),
    Trip.aggregate([{ $group: { _id: '$userId', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $count: 'count' }]).allowDiskUse(true),
    Trip.aggregate([{ $group: { _id: { $trim: { input: '$location' } }, value: { $sum: 1 } } }, { $match: { _id: { $ne: '' } } }, { $sort: { value: -1 } }, { $limit: 5 }]).allowDiskUse(true),
  ])
  const growthData = months.map(date => ({ month: date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }), users: growth.find(r => r._id === date.toISOString().slice(0, 7))?.count || 0 }))
  const weeklyActivity = days.map(date => ({ day: date.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' }), users: weekly.find(r => r._id === date.toISOString().slice(0, 10))?.count || 0 }))
  res.json({ totalUsers: u.total, totalTrips: t.total, totalRevenue: t.revenue, retentionRate: u.total ? Number(((returning[0]?.count || 0) / u.total * 100).toFixed(1)) : 0, userGrowthRate: change(u.current, u.previous), tripGrowthRate: change(t.current, t.previous), revenueGrowthRate: change(t.currentRevenue, t.previousRevenue), growthData, weeklyActivity, topDestinations: destinations.map(d => ({ name: d._id, value: d.value })) })
})
export default router
