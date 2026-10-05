import mongoose from 'mongoose'
import { collectionNames } from '../models/_collections'

let connectionPromise: Promise<typeof mongoose> | undefined

export class DatabaseLayoutError extends Error {
  constructor(missing: string[]) {
    super(`Database setup is incomplete (missing collections: ${missing.join(', ')}). Run npm run db:rebuild -- --apply --create-missing-only --database=YOUR_DATABASE_NAME to create only missing collections.`)
    this.name = 'DatabaseLayoutError'
  }
}

// Raw driver errors can contain connection URIs. Log actionable startup errors
// without exposing database credentials or network addresses.
export function databaseStartupMessage(error: unknown) {
  if (error instanceof DatabaseLayoutError) return error.message
  const failure = error as { name?: string; code?: number } | null
  if (failure?.code === 13) return 'Database initialization was denied. The database account needs permission to create the missing collections and their indexes, and update geofence validation.'
  const name = typeof failure?.name === 'string' && /^[A-Za-z][A-Za-z0-9]*$/.test(failure.name) ? failure.name : 'Error'
  const code = typeof failure?.code === 'number' ? `, code ${failure.code}` : ''
  return `Database initialization failed (${name}${code}). Check database configuration and network access.`
}

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
  if (missing.length) throw new DatabaseLayoutError(missing)
  const unvalidated = collections.filter(c => Object.values(collectionNames).includes(c.name) && !('options' in c && c.options?.validator?.$jsonSchema)).map(c => c.name)
  if (unvalidated.length) console.warn(`MongoDB validation is not yet installed on: ${unvalidated.join(', ')}. Complete db:rebuild with collMod permission.`)
}
