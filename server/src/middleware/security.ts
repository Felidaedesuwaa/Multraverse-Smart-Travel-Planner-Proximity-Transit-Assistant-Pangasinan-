import { RequestHandler } from 'express'
import { AuthError, authLimit } from '../lib/authLimits'
import { AuthRequest } from './auth'
import { randomUUID } from 'node:crypto'

export const securityHeaders: RequestHandler = (req, res, next) => {
  const requestId = randomUUID()
  res.setHeader('X-Request-Id', requestId)
  res.on('finish', () => {
    if ([401, 403, 429].includes(res.statusCode)) console.warn(JSON.stringify({ event: 'security_rejection', requestId, status: res.statusCode, method: req.method }))
  })
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'" })
  next()
}

export function rateLimit(scope: string, maximum: number, windowMs: number, perUser = false): RequestHandler {
  return async (req: AuthRequest, res, next) => {
    try {
      await authLimit(scope, perUser ? req.userId || req.ip || 'unknown' : req.ip || 'unknown', maximum, windowMs)
      next()
    } catch (error) {
      if (error instanceof AuthError) {
        res.setHeader('Retry-After', String(error.retryAfter || 60))
        res.status(error.status).json({ error: error.message })
      } else next(error) // Fail closed when the shared rate-limit store is unavailable.
    }
  }
}
