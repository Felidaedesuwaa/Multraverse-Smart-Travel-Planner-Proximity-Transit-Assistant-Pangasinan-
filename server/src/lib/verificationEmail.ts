import nodemailer from 'nodemailer'
import { AuthError } from './authLimits'

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

export async function sendVerificationEmail(email: string, code: string) {
  const transport = emailTransport()
  try {
    const result = await transport.sendMail({
      from: process.env.MAIL_FROM, to: email,
      subject: 'Your Multraverse verification code',
      text: `Your Multraverse verification code is ${code}.\n\nIt expires in 10 minutes. Enter it in the signup screen to create your account. Never share this code.\n\nIf you did not request this, you can ignore this email. No account has been created.`,
    })
    if (!result.accepted.length) throw new Error('Recipient rejected')
  } catch {
    // Do not expose SMTP credentials, server responses, or codes in logs/API errors.
    throw new AuthError('We could not send the verification email. Please try again in a minute.', 503)
  } finally { transport.close() }
}
