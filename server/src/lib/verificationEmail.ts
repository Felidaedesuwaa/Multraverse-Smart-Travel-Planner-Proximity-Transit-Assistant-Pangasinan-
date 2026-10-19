import nodemailer from 'nodemailer'
import { AuthError } from './authLimits'

// Provider errors may contain addresses, credentials or message contents. Keep
// only documented status fields so delivery can be diagnosed safely in logs.
export function smtpFailureDetails(error: unknown) {
  const failure = error as { code?: unknown; responseCode?: unknown; command?: unknown } | null
  const codes = ['EAUTH', 'ECONNECTION', 'ECONNREFUSED', 'ECONNRESET', 'EDNS', 'ENOTFOUND', 'ETIMEDOUT', 'ESOCKET', 'ETLS', 'EENVELOPE', 'EMESSAGE', 'ESTREAM']
  const commands = ['CONN', 'EHLO', 'HELO', 'STARTTLS', 'AUTH', 'AUTH LOGIN', 'AUTH PLAIN', 'AUTH XOAUTH2', 'MAIL FROM', 'RCPT TO', 'DATA']
  return {
    code: typeof failure?.code === 'string' && codes.includes(failure.code) ? failure.code : 'UNKNOWN',
    ...(typeof failure?.responseCode === 'number' && Number.isInteger(failure.responseCode) && failure.responseCode >= 100 && failure.responseCode <= 599 ? { responseCode: failure.responseCode } : {}),
    ...(typeof failure?.command === 'string' && commands.includes(failure.command) ? { command: failure.command } : {}),
  }
}

export function emailTransport() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env
  const port = Number(process.env.SMTP_PORT || 587)
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_FROM || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new AuthError('Verification email is not configured yet. Please contact support.', 503)
  }
  return nodemailer.createTransport({
    host: SMTP_HOST, port, secure: port === 465, requireTLS: port !== 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    disableFileAccess: true, disableUrlAccess: true,
  })
}

export async function sendVerificationEmail(email: string, code: string, purpose: 'registration' | 'reset' = 'registration') {
  const transport = emailTransport()
  const started = Date.now()
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const delivery = transport.sendMail({
      from: process.env.MAIL_FROM, to: email,
      subject: purpose === 'reset' ? 'Reset your Multraverse password' : 'Your Multraverse verification code',
      text: purpose === 'reset'
        ? `Your Multraverse password reset code is ${code}.\n\nIt expires in 10 minutes and can only be used once. Enter it in the Forgot Password screen. Never share this code.\n\nIf you did not request a password reset, ignore this email. Your password has not changed.`
        : `Your Multraverse verification code is ${code}.\n\nIt expires in 10 minutes. Enter it in the signup screen to create your account. Never share this code.\n\nIf you did not request this, you can ignore this email. No account has been created.`,
    })
    // Bound reset delivery so known/unknown accounts can return on the same schedule.
    const result = purpose === 'reset' ? await Promise.race([delivery, new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => { transport.close(); reject(new Error('Delivery timeout')) }, 4000)
    })]) : await delivery
    if (!result.accepted.length) throw new Error('Recipient rejected')
    // SMTP acceptance confirms handoff to the provider, not inbox delivery.
    console.info(JSON.stringify({ event: 'email_smtp_accepted', purpose, acceptedCount: result.accepted.length, elapsedMs: Date.now() - started }))
  } catch (error) {
    console.warn(JSON.stringify({ event: 'email_smtp_failed', purpose, ...smtpFailureDetails(error), elapsedMs: Date.now() - started }))
    throw new AuthError('We could not send the verification email. Please try again in a minute.', 503)
  } finally { if (timeout) clearTimeout(timeout); transport.close() }
}
