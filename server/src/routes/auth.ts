import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models'
import { RegistrationError } from '../lib/registration'
import { AuthError, authLimit } from '../lib/authLimits'
import { beginRegistration, resendRegistration, verifyRegistration } from '../lib/registrationVerification'

const router = Router()
function authResponse(user: any) {
  return {
    token: jwt.sign({ userId: user._id.toString(), role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' }),
    user: { id: user._id.toString(), name: user.name, firstName: user.firstName, middleName: user.middleName, surname: user.surname, email: user.email, role: user.role, municipality: user.municipality, location: user.location, photo: user.photo },
  }
}
function authFailure(error: unknown, res: Response) {
  if (error instanceof RegistrationError) return res.status(error.status).json({ error: error.message, fieldErrors: error.fieldErrors })
  if (error instanceof AuthError) return res.status(error.status).json({ error: error.message })
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
    const user = await User.findOne({ email: email.trim().toLowerCase() })
    if (!user || !await bcrypt.compare(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' })
    res.json(authResponse(user))
  } catch (error) { authFailure(error, res) }
})
export default router
