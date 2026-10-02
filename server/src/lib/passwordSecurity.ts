import { createHmac, randomBytes, randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { setTimeout as delay } from 'node:timers/promises'
import { AuditLog, User } from '../models'
import { PasswordReset } from '../models/PasswordReset'
import { AuthError, authLimit } from './authLimits'
import { RegistrationError, registrationEmailError, registrationPasswordError } from './registration'
import { equalDigest, sessionCredential } from './sessionCredential'
import { emailTransport, sendVerificationEmail } from './verificationEmail'

const lifetime = 10 * 60 * 1000
const invalidCode = () => new AuthError('Invalid or expired code. Request a new code and try again.', 400)
const otpHash = (challenge: string, code: string) => createHmac('sha256', process.env.JWT_SECRET!).update(`password-reset:${challenge}:${code}`).digest('hex')

function validateNewPassword(value: unknown): asserts value is string {
  const error = registrationPasswordError(value)
  if (error) throw new RegistrationError({ newPassword: error })
}

export async function requestPasswordReset(input: unknown) {
  const replyAt = Date.now() + 6000
  const error = registrationEmailError(input)
  if (error) throw new RegistrationError({ email: error })
  // Check configuration for every request, not just existing accounts.
  emailTransport().close()
  const email = (input as string).trim().toLowerCase()
  await authLimit('password-reset-email', email, 5, 60 * 60 * 1000)
  await authLimit('password-reset-cooldown', email, 1, 60 * 1000)
  const challengeId = randomBytes(32).toString('hex')
  const code = String(randomInt(100000, 1000000))
  const expiresAt = new Date(Date.now() + lifetime)
  const user = await User.findOne({ email }).select('+passwordHash')
  if (user) {
    await PasswordReset.findOneAndUpdate({ userId: user._id }, { $set: {
      challengeId, codeHash: otpHash(challengeId, code), credential: sessionCredential(user.passwordHash), attempts: 0, expiresAt,
    } }, { upsert: true, returnDocument: 'after' })
    try { await sendVerificationEmail(email, code, 'reset') }
    catch {
      await PasswordReset.deleteOne({ userId: user._id, challengeId })
      // The client response must not reveal which email addresses are registered.
      console.warn('Password reset email delivery failed; check mail service availability.')
    }
  }
  // Do not provide an immediate response only for unknown accounts. Email delivery
  // has a four-second deadline, leaving time for persistence on either path.
  await delay(Math.max(0, replyAt - Date.now()))
  return { challengeId, expiresAt: expiresAt.toISOString(), resendAfterSeconds: 60,
    message: 'If an account uses this email, a six-digit code has been sent. Check your inbox and spam folder.' }
}

export async function resetPassword(challengeId: unknown, code: unknown, newPassword: unknown) {
  if (typeof challengeId !== 'string' || !/^[a-f0-9]{64}$/.test(challengeId) || typeof code !== 'string' || !/^\d{6}$/.test(code)) throw invalidCode()
  validateNewPassword(newPassword)
  // Reserve an attempt atomically before comparison, including concurrent guesses.
  const reset = await PasswordReset.findOneAndUpdate({ challengeId, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } },
    { $inc: { attempts: 1 } }, { returnDocument: 'after' }).select('+codeHash +credential')
  if (!reset || !equalDigest(reset.codeHash, otpHash(challengeId, code))) throw invalidCode()
  const user = await User.findById(reset.userId).select('+passwordHash')
  if (!user || !equalDigest(reset.credential, sessionCredential(user.passwordHash))) throw invalidCode()
  if (await bcrypt.compare(newPassword, user.passwordHash)) throw new RegistrationError({ newPassword: 'Choose a password different from your current password.' })
  const passwordHash = await bcrypt.hash(newPassword, 12)
  await mongoose.connection.transaction(async session => {
    // Consume the code in the same transaction as the password and audit event.
    const consumed = await PasswordReset.findOneAndDelete({ _id: reset._id, challengeId, codeHash: reset.codeHash, expiresAt: { $gt: new Date() } }, { session })
    if (!consumed) throw invalidCode()
    const updated = await User.updateOne({ _id: user._id, passwordHash: user.passwordHash }, { $set: { passwordHash } }, { session })
    if (updated.modifiedCount !== 1) throw invalidCode()
    await AuditLog.create([{ actor: user._id, targetUser: user._id, action: 'password_reset', metadata: { method: 'email_otp' } }], { session })
  })
  return { message: 'Password reset. Sign in with your new password. All previous sessions have been signed out.' }
}

export async function changePassword(userId: string, currentPassword: unknown, newPassword: unknown) {
  if (typeof currentPassword !== 'string' || !currentPassword || currentPassword.length > 256) throw new RegistrationError({ currentPassword: 'Enter your current password.' })
  validateNewPassword(newPassword)
  const user = await User.findById(userId).select('+passwordHash')
  if (!user) throw new AuthError('Please sign in again.', 401)
  if (!await bcrypt.compare(currentPassword, user.passwordHash)) throw new RegistrationError({ currentPassword: 'Current password is incorrect.' })
  if (await bcrypt.compare(newPassword, user.passwordHash)) throw new RegistrationError({ newPassword: 'Choose a password different from your current password.' })
  const passwordHash = await bcrypt.hash(newPassword, 12)
  await mongoose.connection.transaction(async session => {
    const updated = await User.updateOne({ _id: userId, passwordHash: user.passwordHash }, { $set: { passwordHash } }, { session })
    if (updated.modifiedCount !== 1) throw new AuthError('Your account changed. Please sign in again.', 409)
    await PasswordReset.deleteMany({ userId }, { session })
    await AuditLog.create([{ actor: userId, targetUser: userId, action: 'password_changed', metadata: { method: 'current_password' } }], { session })
  })
  return { message: 'Password changed. Sign in again with your new password.' }
}
