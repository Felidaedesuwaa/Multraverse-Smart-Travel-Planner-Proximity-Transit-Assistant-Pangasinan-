import { isLGUMunicipality } from '../lib/lguMunicipalities'
import { Request, Response, NextFunction } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import jwt from 'jsonwebtoken'
import { User } from '../models'
import { isValidObjectId } from 'mongoose'

export interface AuthRequest<P = ParamsDictionary> extends Request<P> {
  /** String serialization of the authenticated user's MongoDB ObjectId. */
  userId?: string
  userRole?: string
  municipality?: string
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
    const user = await User.findById(decoded.userId).select('role municipality')
    if (!user) return res.status(401).json({ error: 'Your account is no longer available. Please sign in again.' })
    req.userId = decoded.userId
    req.userRole = user.role
    // Scope comes only from the current database account, never JWT/body/query claims.
    req.municipality = user.municipality
    next()
  } catch (error) { next(error) }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

/** Roles are case-insensitive at the guard boundary; stored roles remain uppercase. */
export function requireRole(roles: string[]) {
  const allowed = roles.map(role => role.toUpperCase())
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowed.includes(req.userRole.toUpperCase())) return res.status(403).json({ error: 'Access denied' })
    if (req.userRole === 'LGU' && !isLGUMunicipality(req.municipality)) return res.status(403).json({ error: 'LGU account needs a valid assigned Pangasinan municipality' })
    next()
  }
}

export const requireSuperAdmin = requireRole(['superadmin'])
