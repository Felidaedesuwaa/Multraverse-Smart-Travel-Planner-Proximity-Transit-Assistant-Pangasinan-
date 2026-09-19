import mongoose from 'mongoose'

let connectionPromise: Promise<typeof mongoose> | undefined

mongoose.connection.on('connected', () => console.log('MongoDB connected'))
mongoose.connection.on('error', (error) => console.error('MongoDB connection error:', error))
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'))

export function connectDatabase() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required')
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose)
  connectionPromise ??= mongoose.connect(process.env.MONGODB_URI)
  return connectionPromise
}

export function disconnectDatabase() {
  return mongoose.disconnect()
}
