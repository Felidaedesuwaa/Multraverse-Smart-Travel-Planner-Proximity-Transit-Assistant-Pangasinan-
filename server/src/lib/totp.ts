import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
export function base32(bytes: Buffer): string {
  let bits = 0, value = 0, result = ''
  for (const byte of bytes) {
    value = (value << 8) | byte; bits += 8
    while (bits >= 5) { bits -= 5; result += alphabet[(value >>> bits) & 31] }
  }
  if (bits) result += alphabet[(value << (5 - bits)) & 31]
  return result
}
export function decodeBase32(secret: string): Buffer {
  if (!/^[A-Z2-7]+$/.test(secret)) throw new Error('Invalid factor secret')
  let bits = 0, value = 0
  const result: number[] = []
  for (const character of secret) {
    value = (value << 5) | alphabet.indexOf(character); bits += 5
    if (bits >= 8) { bits -= 8; result.push((value >>> bits) & 255) }
  }
  return Buffer.from(result)
}
export function totp(secret: string, counter: number, digits = 6): string {
  const buffer = Buffer.alloc(8); buffer.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', decodeBase32(secret)).update(buffer).digest()
  const offset = digest[19] & 15
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits)).toString().padStart(digits, '0')
}
export function matchingCounter(secret: string, code: unknown, now = Date.now()): number | null {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return null
  const current = Math.floor(now / 30000)
  for (const counter of [current, current - 1, current + 1]) {
    if (counter >= 0 && timingSafeEqual(Buffer.from(code), Buffer.from(totp(secret, counter)))) return counter
  }
  return null
}
function encryptionKey() {
  const key = process.env.MFA_ENCRYPTION_KEY
  if (!key || !/^[a-f0-9]{64}$/i.test(key)) throw new Error('Configure MFA_ENCRYPTION_KEY with 32 random bytes as hex')
  return Buffer.from(key, 'hex')
}
export function encryptFactor(secret: string, userId: string): string {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  cipher.setAAD(Buffer.from(userId))
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64')
}
export class FactorDecryptionError extends Error {
  constructor() { super('Authenticator verification is unavailable because the server encryption key does not match the saved authenticator. Restore the original MFA encryption key and try again.'); this.name = 'FactorDecryptionError' }
}
export function decryptFactor(encrypted: string, userId: string): string {
  const currentKey = encryptionKey()
  const previousKeys = (process.env.MFA_PREVIOUS_ENCRYPTION_KEYS || '').split(',').map(key => key.trim()).filter(Boolean)
  if (previousKeys.some(key => !/^[a-f0-9]{64}$/i.test(key))) throw new FactorDecryptionError()
  const bytes = Buffer.from(encrypted, 'base64')
  for (const key of [currentKey, ...previousKeys.map(key => Buffer.from(key, 'hex'))]) {
    try {
      const cipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12))
      cipher.setAAD(Buffer.from(userId)); cipher.setAuthTag(bytes.subarray(12, 28))
      return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString('utf8')
    } catch { /* Try a retained key without changing the enrolled authenticator. */ }
  }
  throw new FactorDecryptionError()
}
export const tokenDigest = (token: string) => createHash('sha256').update(token).digest('hex')
