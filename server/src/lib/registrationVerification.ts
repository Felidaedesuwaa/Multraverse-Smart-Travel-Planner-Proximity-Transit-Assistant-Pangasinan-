import { createHmac, randomBytes, randomInt } from 'node:crypto'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User } from '../models'
import { PendingRegistration } from '../models/PendingRegistration'
import { registrationDetails, registrationNameDetails, RegistrationError } from './registration'
import { ensureEmailDomain } from './emailDomain'
import { AuthError, authLimit } from './authLimits'
import { emailTransport, sendVerificationEmail } from './verificationEmail'

const TEN_MINUTES = 10 * 60 * 1000
const invalidCode = () => new AuthError('Invalid or expired code. Use the latest email, or request a new code.')
const hashCode = (challengeId: string, code: string) => createHmac('sha256', process.env.JWT_SECRET!).update(`${challengeId}:${code}`).digest('hex')
const deliveryLimit = (email: string) => authLimit('signup-email', email, 5, 60 * 60 * 1000)
const response = (pending: any) => ({
  verificationRequired: true, challengeId: pending.challengeId,
  expiresAt: pending.expiresAt, resendAt: pending.resendAt,
  message: 'Check your email for a six-digit verification code.',
})

export async function beginRegistration(body: Record<string, unknown>) {
  const { email, password } = registrationDetails(body)
  emailTransport().close() // Fail clearly before persisting anything if delivery is unconfigured.
  if (await User.findOne({ email })) throw new RegistrationError({ email: 'Email already in use' })
  await deliveryLimit(email)
  await ensureEmailDomain(email)
  const now = Date.now()
  const challengeId = randomBytes(32).toString('hex')
  const code = randomInt(0, 1000000).toString().padStart(6, '0')
  const passwordHash = await bcrypt.hash(password, 10)
  let pending
  try {
    pending = await PendingRegistration.findOneAndUpdate({ email, resendAt: { $lte: new Date(now) } }, { $set: {
      ...registrationNameDetails(body), email, passwordHash, challengeId,
      codeHash: hashCode(challengeId, code), attempts: 0,
      expiresAt: new Date(now + TEN_MINUTES), resendAt: new Date(now + 60000),
    } }, { upsert: true, returnDocument: 'after' })
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new AuthError('A code was recently requested. Wait one minute before trying again.', 429)
    throw error
  }
  try { await sendVerificationEmail(email, code) }
  catch (error) { await PendingRegistration.deleteOne({ challengeId }); throw error }
  return response(pending)
}

export function validateChallenge(challengeId: unknown): asserts challengeId is string {
  if (typeof challengeId !== 'string' || !/^[a-f0-9]{64}$/.test(challengeId)) throw invalidCode()
}

export async function resendRegistration(challengeId: unknown) {
  validateChallenge(challengeId)
  const pending = await PendingRegistration.findOne({ challengeId })
  if (!pending) throw new AuthError('This signup session has expired. Please start registration again.', 410)
  if (pending.resendAt.getTime() > Date.now()) throw new AuthError('Please wait one minute between verification emails.', 429)
  await deliveryLimit(pending.email)
  const code = randomInt(0, 1000000).toString().padStart(6, '0')
  const now = Date.now()
  const updated = await PendingRegistration.findOneAndUpdate({ challengeId, resendAt: { $lte: new Date(now) } }, { $set: {
    codeHash: hashCode(challengeId, code), attempts: 0,
    expiresAt: new Date(now + TEN_MINUTES), resendAt: new Date(now + 60000),
  } }, { returnDocument: 'after' })
  if (!updated) throw new AuthError('A code was already requested. Please wait one minute.', 429)
  await sendVerificationEmail(updated.email, code)
  return response(updated)
}

export async function verifyRegistration(challengeId: unknown, code: unknown) {
  validateChallenge(challengeId)
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) throw new AuthError('Enter the six-digit code from your email.')
  const filter = { challengeId, attempts: { $lt: 5 }, expiresAt: { $gt: new Date() } }
  // Count every attempt atomically, including simultaneous requests.
  const attempt = await PendingRegistration.findOneAndUpdate(filter, { $inc: { attempts: 1 } }, { returnDocument: 'after' })
  if (!attempt || attempt.codeHash !== hashCode(challengeId, code)) throw invalidCode()
  return mongoose.connection.transaction(async session => {
    const pending = await PendingRegistration.findOneAndDelete({
      challengeId, codeHash: attempt.codeHash, expiresAt: { $gt: new Date() },
    }, { session })
    if (!pending) throw invalidCode()
    const [user] = await User.create([{
      name: pending.name, firstName: pending.firstName, middleName: pending.middleName,
      surname: pending.surname, email: pending.email, passwordHash: pending.passwordHash,
      emailVerifiedAt: new Date(),
    }], { session })
    return user
  })
}
