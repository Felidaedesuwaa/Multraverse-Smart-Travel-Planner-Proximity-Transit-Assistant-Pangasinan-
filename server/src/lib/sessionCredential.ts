import { createHmac, timingSafeEqual } from 'node:crypto'

// Changing the salted password hash invalidates every previously issued token.
// No credential or reusable password hash is placed in the JWT.
export function sessionCredential(passwordHash: string): string {
  if (!passwordHash || !process.env.JWT_SECRET) throw new Error('Missing authentication configuration')
  return createHmac('sha256', process.env.JWT_SECRET).update(`session:${passwordHash}`).digest('hex')
}

export function equalDigest(left: unknown, right: string): boolean {
  return typeof left === 'string' && /^[a-f0-9]{64}$/.test(left) &&
    timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'))
}
