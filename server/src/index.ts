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
// Vercel overwrites X-Forwarded-For with the client IP. Trust its immediate
// proxy only on Vercel so authentication limits don't group every visitor.
if (process.env.VERCEL === '1') app.set('trust proxy', 1)

let indexesReady: Promise<unknown> | undefined
async function prepareDatabase() {
  await connectDatabase()
  // Share initialization between concurrent cold-start requests. Retry a
  // failed attempt instead of leaving this function instance unusable.
  indexesReady ??= Promise.all([User.init(), PendingRegistration.init(), AuthLimit.init()])
    .catch((error) => { indexesReady = undefined; throw error })
  await indexesReady
}
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
app.use(async (_req, res, next) => {
  try {
    await prepareDatabase()
    next()
  } catch {
    res.status(503).json({ error: 'Database is temporarily unavailable. Please try again.' })
  }
})
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

// Vercel imports the app; local development and Node hosts start a listener.
export default app

if (require.main === module && process.env.VERCEL !== '1') {
  prepareDatabase().then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
  })
  .catch(() => {
    console.error('Unable to start server. Check database configuration and network access.')
    process.exit(1)
  })
}
