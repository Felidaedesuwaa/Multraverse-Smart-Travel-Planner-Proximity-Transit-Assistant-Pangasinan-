import { randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { User } from '../models'
import { AccountFactor } from '../models/AccountSecurity'
import { AuthError, authLimit } from './authLimits'
import { equalDigest, sessionCredential } from './sessionCredential'
import { base32, decryptFactor, encryptFactor, matchingCounter } from './totp'

export const needsMfa = (role: string) => ['ADMIN', 'SUPERADMIN', 'LGU'].includes(role)
export function mfaChallenge(user: any) {
  return { mfaRequired: true, challengeToken: jwt.sign({ purpose: 'mfa', userId: String(user._id), credential: sessionCredential(user.passwordHash), role: user.role, nonce: randomBytes(16).toString('hex') }, process.env.JWT_SECRET!, { algorithm: 'HS256', expiresIn: '10m' }) }
}
async function challengeUser(token: unknown) {
  try {
    if (typeof token !== 'string' || token.length > 2000) throw new Error()
    const claims = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as jwt.JwtPayload
    if (claims.purpose !== 'mfa' || !/^[a-f\d]{24}$/i.test(claims.userId)) throw new Error()
    const user = await User.findById(claims.userId).select('+passwordHash')
    if (!user || user.disabled || user.role !== claims.role || !equalDigest(claims.credential, sessionCredential(user.passwordHash))) throw new Error()
    return { user, nonce: claims.nonce as string }
  } catch { throw new AuthError('Sign in again to verify your authenticator.', 401) }
}
export async function setupMfa(token: unknown) {
  const { user, nonce } = await challengeUser(token)
  await authLimit('mfa-setup', String(user._id), 10, 15 * 60 * 1000)
  let factor = await AccountFactor.findOne({ userId: user._id }).select('+encryptedSecret +enrollmentId')
  if (factor?.enabled) return { setupRequired: false }
  if (!factor) {
    const secret = base32(randomBytes(20))
    try { factor = await AccountFactor.create({ userId: user._id, encryptedSecret: encryptFactor(secret, String(user._id)), enrollmentId: nonce }) }
    catch (error) { if ((error as any).code !== 11000) throw error; factor = await AccountFactor.findOne({ userId: user._id }).select('+encryptedSecret +enrollmentId') }
  }
  if (!factor) throw new AuthError('Please sign in again to set up your authenticator.')
  if (factor.enabled) return { setupRequired: false }
  // A new password challenge may replace only an unconfirmed enrollment.
  if (factor.enrollmentId !== nonce) {
    const secret = base32(randomBytes(20))
    factor = await AccountFactor.findOneAndUpdate({ userId: user._id, enabled: false }, { $set: { encryptedSecret: encryptFactor(secret, String(user._id)), enrollmentId: nonce } }, { returnDocument: 'after' }).select('+encryptedSecret +enrollmentId')
    if (!factor) return { setupRequired: false }
  }
  return { setupRequired: true, secret: decryptFactor(factor.encryptedSecret, String(user._id)) }
}
export async function verifyMfa(token: unknown, code: unknown) {
  const { user, nonce } = await challengeUser(token)
  await authLimit('mfa-verify', String(user._id), 5, 10 * 60 * 1000)
  const factor = await AccountFactor.findOne({ userId: user._id }).select('+encryptedSecret +enrollmentId')
  if (!factor || (!factor.enabled && factor.enrollmentId !== nonce)) throw new AuthError('Set up your authenticator first.')
  const counter = matchingCounter(decryptFactor(factor.encryptedSecret, String(user._id)), code)
  if (counter === null) throw new AuthError('Invalid authenticator code.')
  const updated = await AccountFactor.updateOne({ _id: factor._id, lastCounter: { $lt: counter }, ...(factor.enabled ? {} : { enrollmentId: nonce }) }, { $set: { enabled: true, lastCounter: counter } })
  if (!updated.modifiedCount) throw new AuthError('This code was already used. Wait for a new code.')
  return user
}
