import { Router, Response } from 'express'
import { Geofence, TransitRoute, Trip, User } from '../models'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate, requireAdmin)

const percentChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

router.get('/dashboard', async (_req: AuthRequest, res: Response) => {
  const now = new Date()
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const [users, trips, routes, geofences] = await Promise.all([
    User.find().select('createdAt').lean(),
    Trip.find().select('spent createdAt').lean(),
    TransitRoute.find().sort({ updatedAt: -1 }).select('name type status updatedAt').lean(),
    Geofence.find().select('active alerts').lean(),
  ])
  const inPeriod = (date: Date, start: Date, end: Date) => date >= start && date < end
  const currentUsers = users.filter((user) => inPeriod(user.createdAt, currentMonthStart, now)).length
  const previousUsers = users.filter((user) => inPeriod(user.createdAt, previousMonthStart, currentMonthStart)).length
  const currentRevenue = trips.filter((trip) => inPeriod(trip.createdAt, currentMonthStart, now)).reduce((total, trip) => total + (Number(trip.spent) || 0), 0)
  const previousRevenue = trips.filter((trip) => inPeriod(trip.createdAt, previousMonthStart, currentMonthStart)).reduce((total, trip) => total + (Number(trip.spent) || 0), 0)
  const activeRoutes = routes.filter((route) => route.status === 'ACTIVE')
  const activeGeofences = geofences.filter((geofence) => geofence.active)
  const geofenceAlerts = geofences.reduce((total, geofence) => total + (Number(geofence.alerts) || 0), 0)
  res.json({
    totalUsers: users.length,
    userGrowthRate: percentChange(currentUsers, previousUsers),
    activeRoutes: activeRoutes.length,
    routesUpdatedThisMonth: routes.filter((route) => inPeriod(route.updatedAt, currentMonthStart, now)).length,
    geofenceAlerts,
    activeGeofences: activeGeofences.length,
    totalRevenue: trips.reduce((total, trip) => total + (Number(trip.spent) || 0), 0),
    revenueGrowthRate: percentChange(currentRevenue, previousRevenue),
    routes: routes.slice(0, 4).map((route) => ({ name: route.name, type: route.type, status: route.status, updatedAt: route.updatedAt })),
    activity: [
      { label: 'Registered users', value: users.length, detail: 'All user accounts' },
      { label: 'Trips created', value: trips.length, detail: 'All recorded trips' },
      { label: 'Active geofences', value: activeGeofences.length, detail: 'Enabled alert zones' },
      { label: 'Geofence alerts', value: geofenceAlerts, detail: 'Recorded across all zones' },
    ],
  })
})

router.get('/', async (_req: AuthRequest, res: Response) => {
  const now = new Date()
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const [users, trips] = await Promise.all([
    User.find().select('createdAt').lean(),
    Trip.find().select('userId location spent createdAt').lean(),
  ])
  const inPeriod = (date: Date, start: Date, end: Date) => date >= start && date < end
  const userCount = (start: Date, end: Date) => users.filter((user) => inPeriod(user.createdAt, start, end)).length
  const tripCount = (start: Date, end: Date) => trips.filter((trip) => inPeriod(trip.createdAt, start, end)).length
  const revenue = (start: Date, end: Date) => trips.filter((trip) => inPeriod(trip.createdAt, start, end)).reduce((total, trip) => total + (Number(trip.spent) || 0), 0)
  const tripsByUser = new Map<string, number>()
  for (const trip of trips) { const id = String(trip.userId); tripsByUser.set(id, (tripsByUser.get(id) || 0) + 1) }
  const growthData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1))
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
    return { month: date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }), users: userCount(date, end) }
  })
  const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (6 - index)))
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (5 - index)))
    return { day: start.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' }), users: new Set(trips.filter((trip) => inPeriod(trip.createdAt, start, end)).map((trip) => String(trip.userId))).size }
  })
  const destinations = new Map<string, number>()
  for (const trip of trips) { const name = trip.location?.trim(); if (name) destinations.set(name, (destinations.get(name) || 0) + 1) }
  const currentRevenue = revenue(currentMonthStart, now)
  const previousRevenue = revenue(previousMonthStart, currentMonthStart)
  res.json({
    totalUsers: users.length, totalTrips: trips.length, totalRevenue: trips.reduce((total, trip) => total + (Number(trip.spent) || 0), 0),
    retentionRate: users.length ? Number(((Array.from(tripsByUser.values()).filter((count) => count > 1).length / users.length) * 100).toFixed(1)) : 0,
    userGrowthRate: percentChange(userCount(currentMonthStart, now), userCount(previousMonthStart, currentMonthStart)),
    tripGrowthRate: percentChange(tripCount(currentMonthStart, now), tripCount(previousMonthStart, currentMonthStart)),
    revenueGrowthRate: percentChange(currentRevenue, previousRevenue), growthData, weeklyActivity,
    topDestinations: Array.from(destinations, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
  })
})
export default router
