import './lib/environment'
import express from 'express'
import cors from 'cors'

import authRoutes from './routes/auth'
import tripRoutes from './routes/trips'
import budgetRoutes from './routes/budget'
import placesRoutes from './routes/places'
import transitRoutes from './routes/transitRoutes'
import geofenceRoutes from './routes/geofences'
import userRoutes from './routes/users'
import locationRoutes from './routes/locations'
import aiRoutes from './routes/ai'
import knowledgeRoutes from './routes/knowledge'
import analyticsRoutes from './routes/analytics'
import { connectDatabase } from './lib/db'
import { User } from './models'
import { PendingRegistration } from './models/PendingRegistration'
import { AuthLimit } from './lib/authLimits'

const app = express()
const PORT = process.env.PORT || 3001
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    // Native clients do not send an Origin header. Expo Web uses a dynamic
    // localhost port, so permit local development origins and configured hosts.
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || configuredOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    callback(new Error(`Origin ${origin} is not allowed by CORS`))
  },
  credentials: true,
}))
// Profile photos are resized on-device and capped at 512 KB by the route.
app.use('/api/users/me', express.json({ limit: '1mb' }))
app.use('/api/auth', express.json({ limit: '16kb' }))
// Voice recordings are posted to the local speech service as base64. The
// route validates its own tighter payload shape; this limit keeps recordings
// usable while still bounding request memory.
app.use(express.json({ limit: '12mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/budget', budgetRoutes)
app.use('/api/places', placesRoutes)
app.use('/api/transit-routes', transitRoutes)
app.use('/api/geofences', geofenceRoutes)
app.use('/api/users', userRoutes)
app.use('/api/locations', locationRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/knowledge', knowledgeRoutes)
app.use('/api/analytics', analyticsRoutes)

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

app.use((error: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = error.status || 500
  res.status(status).json({ error: status === 413 ? 'Photo is too large. Choose a smaller image.' : status === 400 ? 'Invalid request' : 'Unable to complete the request. Please try again.' })
})

connectDatabase()
  .then(async () => {
    // Unique/TTL indexes must exist before accepting concurrent signup requests.
    await Promise.all([User.init(), PendingRegistration.init(), AuthLimit.init()])
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
  })
  .catch((error) => {
    console.error('Unable to start server:', error)
    process.exit(1)
  })
