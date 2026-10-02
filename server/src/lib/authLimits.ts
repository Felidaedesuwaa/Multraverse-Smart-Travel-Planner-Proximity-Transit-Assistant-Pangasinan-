import { createHmac } from 'node:crypto'
import { AuthLimit } from '../models/AuthLimit'
export { AuthLimit } from '../models/AuthLimit'

export class AuthError extends Error {
  constructor(message: string, public status = 400, public retryAfter?: number) { super(message) }
}

// Database-backed limits also apply after a restart or across server instances.
export async function authLimit(scope: string, key: string, maximum: number, windowMs: number) {
  const bucket = Math.floor(Date.now() / windowMs)
  const digest = createHmac('sha256', process.env.JWT_SECRET!).update(`${scope}:${key}`).digest('hex')
  const _id = `${digest}:${bucket}`
  let record
  try {
    record = await AuthLimit.findOneAndUpdate({ _id }, {
      $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 1) * windowMs) },
    }, { upsert: true, returnDocument: 'after' })
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error
    record = await AuthLimit.findOneAndUpdate({ _id }, { $inc: { count: 1 } }, { returnDocument: 'after' })
  }
  if (!record || record.count > maximum) throw new AuthError('Too many attempts. Please try again later.', 429, Math.max(1, Math.ceil(((bucket + 1) * windowMs - Date.now()) / 1000)))
}
