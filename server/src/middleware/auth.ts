import { Request, Response, NextFunction } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import jwt from 'jsonwebtoken'
import { User } from '../models'
import { isValidObjectId } from 'mongoose'

export interface AuthRequest<P = ParamsDictionary> extends Request<P> {
  /** String serialization of the authenticated user's MongoDB ObjectId. */
  userId?: string
  userRole?: string
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token provided' })

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string
      role: string
    }
    if (!isValidObjectId(decoded.userId)) throw new Error('Invalid user')
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
  try {
    // A signed token cannot restore a deleted account or stale admin role.
    const user = await User.findById(decoded.userId).select('role')
    if (!user) return res.status(401).json({ error: 'Your account is no longer available. Please sign in again.' })
    req.userId = decoded.userId
    req.userRole = user.role
    next()
  } catch (error) { next(error) }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}
