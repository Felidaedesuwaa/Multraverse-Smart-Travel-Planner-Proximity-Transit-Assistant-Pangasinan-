import mongoose from 'mongoose'

let connectionPromise: Promise<typeof mongoose> | undefined

mongoose.connection.on('connected', () => console.log('MongoDB connected'))
mongoose.connection.on('error', () => console.error('MongoDB connection failed. Check configuration and network access.'))
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'))

export function connectDatabase() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required')
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose)
  connectionPromise ??= mongoose.connect(process.env.MONGODB_URI).catch((error) => {
    connectionPromise = undefined
    throw error
  })
  return connectionPromise
}

export function disconnectDatabase() {
  connectionPromise = undefined
  return mongoose.disconnect()
}
