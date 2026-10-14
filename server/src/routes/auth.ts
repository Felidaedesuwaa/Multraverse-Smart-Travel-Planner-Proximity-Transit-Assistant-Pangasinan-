import { sanitizeRequest, validateRouter, pagination, validateId } from '../middleware/input'
﻿import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models'
import { RegistrationError } from '../lib/registration'
import { AuthError, authLimit } from '../lib/authLimits'
import { beginRegistration, resendRegistration, verifyRegistration } from '../lib/registrationVerification'
import { authenticate, AuthRequest } from '../middleware/auth'
import { sessionCredential } from '../lib/sessionCredential'
import { requestPasswordReset, resetPassword, changePassword, verifyPasswordReset, recoverPassword } from '../lib/passwordSecurity'
import { mfaChallenge, needsMfa, setupMfa, verifyMfa } from '../lib/mfa'
import { RevokedSession } from '../models/AccountSecurity'
import { tokenDigest } from '../lib/totp'
import { randomUUID } from 'node:crypto'

const router = Router()
router.param('id', validateId)
router.use(sanitizeRequest, validateRouter('auth'))
function authResponse(user: any, mfa = false): any {
  if (needsMfa(user.role) && !mfa) return mfaChallenge(user)
  return {
    token: jwt.sign({ userId: user._id.toString(), role: user.role, credential: sessionCredential(user.passwordHash), mfa }, process.env.JWT_SECRET!, { algorithm: 'HS256', jwtid: randomUUID(), expiresIn: needsMfa(user.role) ? '1h' : '7d' }),
    user: { id: user._id.toString(), name: user.name, firstName: user.firstName, middleName: user.middleName, surname: user.surname, email: user.email, role: user.role, municipality: user.municipality, location: user.location, photo: user.photo },
  }
}
function authFailure(error: unknown, res: Response) {
  if (error instanceof RegistrationError) return res.status(error.status).json({ error: error.message, fieldErrors: error.fieldErrors })
  if (error instanceof AuthError) {
    if (error.retryAfter) res.setHeader('Retry-After', String(error.retryAfter))
    return res.status(error.status).json({ error: error.message })
  }
  if ((error as { code?: number }).code === 11000) return res.status(400).json({ error: 'Email already in use', fieldErrors: { email: 'Email already in use' } })
  return res.status(500).json({ error: 'Could not complete your request. Please try again.' })
}

router.post('/register', async (req, res) => {
  try {
    await authLimit('signup-ip', req.ip || 'unknown', 20, 60 * 60 * 1000)
    res.status(202).json(await beginRegistration(req.body))
  } catch (error) { authFailure(error, res) }
})
router.post('/register/resend', async (req, res) => {
  try {
    await authLimit('signup-ip', req.ip || 'unknown', 20, 60 * 60 * 1000)
    res.json(await resendRegistration(req.body?.challengeId))
  } catch (error) { authFailure(error, res) }
})
router.post('/register/verify', async (req, res) => {
  try {
    await authLimit('verify-ip', req.ip || 'unknown', 30, 10 * 60 * 1000)
    res.status(201).json(authResponse(await verifyRegistration(req.body?.challengeId, req.body?.code)))
  } catch (error) { authFailure(error, res) }
})
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password || password.length > 256)
      return res.status(400).json({ error: 'Email and password are required' })
    await authLimit('login-ip', req.ip || 'unknown', 30, 15 * 60 * 1000)
    await authLimit('login-account', email.trim().toLowerCase(), 15, 15 * 60 * 1000)
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash')
    // Perform a bcrypt comparison for unknown accounts too.
    const valid = await bcrypt.compare(password, user?.passwordHash || '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxOPjLZFdFTLoFqsSGPPHYvhq9m')
    if (!user || !valid) return res.status(401).json({ error: 'Invalid credentials' })
    res.json(authResponse(user))
  } catch (error) { authFailure(error, res) }
})
router.post('/mfa/setup', async (req, res) => {
  try {
    await authLimit('mfa-ip', req.ip || 'unknown', 20, 10 * 60 * 1000)
    res.json(await setupMfa(req.body.challengeToken))
  } catch (error) { authFailure(error, res) }
})
router.post('/mfa/verify', async (req, res) => {
  try {
    await authLimit('mfa-ip', req.ip || 'unknown', 20, 10 * 60 * 1000)
    res.json(authResponse(await verifyMfa(req.body.challengeToken, req.body.code), true))
  } catch (error) { authFailure(error, res) }
})
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization!.split(' ')[1]
    const claims = jwt.decode(token) as jwt.JwtPayload
    await RevokedSession.updateOne({ digest: tokenDigest(token) }, { $setOnInsert: { expiresAt: new Date(claims.exp! * 1000) } }, { upsert: true })
    res.json({ message: 'Signed out.' })
  } catch (error) { authFailure(error, res) }
})
router.post('/password/forgot', async (req, res) => {
  try {
    await authLimit('reset-request-ip', req.ip || 'unknown', 10, 60 * 60 * 1000)
    res.status(202).json(await requestPasswordReset(req.body.email))
  } catch (error) { authFailure(error, res) }
})
router.post('/password/reset', async (req, res) => {
  try {
    await authLimit('reset-verify-ip', req.ip || 'unknown', 20, 10 * 60 * 1000)
    res.json(await resetPassword(req.body.challengeId, req.body.code, req.body.newPassword))
  } catch (error) { authFailure(error, res) }
})
router.post('/password/change', authenticate, async (req: AuthRequest, res) => {
  try {
    await authLimit('password-change-user', req.userId!, 5, 15 * 60 * 1000)
    await authLimit('password-change-ip', req.ip || 'unknown', 20, 15 * 60 * 1000)
    const result = await changePassword(req.userId!, req.body.currentPassword, req.body.newPassword)
    res.json({ ...result, ...authResponse(await User.findById(req.userId).select('+passwordHash'), true) })
  } catch (error) { authFailure(error, res) }
})
router.post('/password/recovery-code', authenticate, async (req: AuthRequest, res) => {
  try {
    await authLimit('reset-request-ip', req.ip || 'unknown', 10, 60 * 60 * 1000)
    const user = await User.findById(req.userId).select('email')
    if (!user) return res.status(401).json({ error: 'Please sign in again.' })
    res.status(202).json(await requestPasswordReset(user.email))
  } catch (error) { authFailure(error, res) }
})
router.post('/password/verify', async (req, res) => {
  try {
    await authLimit('reset-verify-ip', req.ip || 'unknown', 20, 10 * 60 * 1000)
    res.json(await verifyPasswordReset(req.body.challengeId, req.body.code))
  } catch (error) { authFailure(error, res) }
})
router.post('/password/recover', async (req, res) => {
  try {
    await authLimit('reset-verify-ip', req.ip || 'unknown', 20, 10 * 60 * 1000)
    res.json({ message: 'Password changed successfully.', ...authResponse(await recoverPassword(req.body.grantToken, req.body.newPassword)) })
  } catch (error) { authFailure(error, res) }
})
export default router
