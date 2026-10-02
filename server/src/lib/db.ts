import mongoose from 'mongoose'
import { collectionNames } from '../models/_collections'

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

export async function verifyDatabaseLayout() {
  const collections = await mongoose.connection.db!.listCollections().toArray()
  const missing = Object.values(collectionNames).filter(name => !collections.some(c => c.name === name))
  if (missing.length) throw new Error(`Database setup is incomplete (${missing.join(', ')}). Run npm run db:rebuild -- --apply --database=multraverse before starting the server.`)
  const unvalidated = collections.filter(c => Object.values(collectionNames).includes(c.name) && !('options' in c && c.options?.validator?.$jsonSchema)).map(c => c.name)
  if (unvalidated.length) console.warn(`MongoDB validation is not yet installed on: ${unvalidated.join(', ')}. Complete db:rebuild with collMod permission.`)
}
