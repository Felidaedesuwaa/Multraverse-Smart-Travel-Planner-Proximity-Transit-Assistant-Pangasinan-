import express from 'express'
import cors from 'cors'
import 'dotenv/config'

import authRoutes from './routes/auth'
import tripRoutes from './routes/trips'
import budgetRoutes from './routes/budget'
import placesRoutes from './routes/places'
import transitRoutes from './routes/transitRoutes'
import geofenceRoutes from './routes/geofences'
import userRoutes from './routes/users'
import aiRoutes from './routes/ai'
import knowledgeRoutes from './routes/knowledge'
import analyticsRoutes from './routes/analytics'
import { connectDatabase } from './lib/db'

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
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/budget', budgetRoutes)
app.use('/api/places', placesRoutes)
app.use('/api/transit-routes', transitRoutes)
app.use('/api/geofences', geofenceRoutes)
app.use('/api/users', userRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/knowledge', knowledgeRoutes)
app.use('/api/analytics', analyticsRoutes)

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

connectDatabase()
  .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
  .catch((error) => {
    console.error('Unable to start server:', error)
    process.exit(1)
  })
