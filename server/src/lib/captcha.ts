import { createHash, randomBytes } from 'node:crypto'
import { CaptchaVerification } from '../models/CaptchaVerification'
import { RegistrationError } from './registration'

const digest = (value: string) => createHash('sha256').update(value).digest('hex')
const invalid = () => new RegistrationError({ captcha: 'Complete the bot verification again. Refresh this page or reopen registration in the app.' })

export async function verifyCaptcha(token: unknown, remoteip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  const hostnames = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean)
  if (!secret || !hostnames.length || (process.env.NODE_ENV === 'production' && /^[123]x0{10}/.test(secret))) {
    throw new RegistrationError({ captcha: 'Bot verification is not configured. Please contact the site administrator.' }, 503)
  }
  if (typeof token !== 'string' || !token.trim() || token.length > 2048) throw invalid()
  let result: { success?: boolean; hostname?: string; action?: string }
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, ...(remoteip ? { remoteip } : {}) }),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error('Verification service unavailable')
    result = await response.json() as typeof result
  } catch {
    throw new RegistrationError({ captcha: 'Bot verification could not connect. Close the challenge and try again.' }, 503)
  }
  if (result?.success !== true || result.action !== 'register' || !hostnames.includes(result.hostname?.toLowerCase() || '')) throw invalid()
  const captchaProof = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
  await CaptchaVerification.create({ digest: digest(captchaProof), expiresAt })
  return { captchaProof, expiresAt: expiresAt.toISOString() }
}

export async function consumeCaptcha(proof: unknown) {
  if (typeof proof !== 'string' || !/^[a-f0-9]{64}$/.test(proof)) throw invalid()
  const used = await CaptchaVerification.findOneAndDelete({ digest: digest(proof), expiresAt: { $gt: new Date() } })
  if (!used) throw invalid()
}
