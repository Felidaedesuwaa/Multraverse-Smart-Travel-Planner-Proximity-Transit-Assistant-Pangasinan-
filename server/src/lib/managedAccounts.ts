import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { profileUpdate } from './profile'
import mongoose from 'mongoose'
import { AuditLog, User } from '../models'
import { isLGUMunicipality } from './lguMunicipalities'
import { registrationNameDetails } from './registration'

// Managed emails are sign-in identifiers; they do not need a deliverable mailbox.
function managedEmailError(email: unknown): string | null {
  if (typeof email !== 'string' || !email.trim()) return 'Email sign-in ID is required'
  if (email.trim().length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email.trim())) {
    return 'Use an email-formatted sign-in ID, such as lgu.dagupan@multraverse.ph'
  }
  return null
}

export const MANAGED_USER_FIELDS = 'name email role municipality disabled createdAt createdBy'
export function managedAccountInput(body: unknown, role: 'LGU' | 'ADMIN') {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Provide account details')
  const input = body as Record<string, unknown>
  const allowed = role === 'LGU' ? ['name', 'firstName', 'surname', 'email', 'municipality'] : ['name', 'firstName', 'surname', 'email']
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new Error('Unexpected account field')
  const emailError = managedEmailError(input.email)
  if (emailError) throw new Error(emailError)
  if (role === 'ADMIN' && !/^admin\.[a-z0-9]+(?:[._-][a-z0-9]+)*@/i.test((input.email as string).trim())) throw new Error('Include the administrator name in the email, such as admin.juan.delacruz@multraverse.ph. Each account needs a unique email.')
  const nameDetails = 'firstName' in input || 'surname' in input
    ? registrationNameDetails(input)
    : { name: profileUpdate({ name: input.name }).name!, firstName: undefined, surname: undefined }
  if ('name' in input && ('firstName' in input || 'surname' in input)) throw new Error('Provide first name and surname only')
  if (role === 'LGU' && !isLGUMunicipality(input.municipality)) throw new Error('Select a valid Pangasinan municipality')
  return { ...nameDetails, email: (input.email as string).trim().toLowerCase(), municipality: role === 'LGU' ? input.municipality as string : undefined }
}

export async function createManagedAccount(input: ReturnType<typeof managedAccountInput>, role: 'LGU' | 'ADMIN', actor: string) {
  const temporaryPassword = `Mv9_${randomBytes(18).toString('base64url')}`
  const passwordHash = await bcrypt.hash(temporaryPassword, 12)
  // Account and its audit event commit together; an audit failure cannot leave an unaudited account.
  const session = await mongoose.startSession()
  let userId: string | undefined
  try {
    await session.withTransaction(async () => {
      const [user] = await User.create([{
        name: input.name, firstName: input.firstName, surname: input.surname, mustChangePassword: true,
        email: input.email, passwordHash, role, createdBy: actor,
        ...(role === 'LGU' ? { municipality: input.municipality, location: `${input.municipality}, Pangasinan` } : { location: 'Pangasinan' }),
        emailVerifiedAt: new Date(),
      }], { session })
      await AuditLog.create([{
        actor, action: role === 'LGU' ? 'create_lgu_account' : 'create_admin_account', targetUser: user._id,
        ...(role === 'LGU' ? { metadata: { municipality: input.municipality } } : {}),
      }], { session })
      userId = String(user._id)
    })
  } finally { await session.endSession() }
  const user = await User.findById(userId).select(MANAGED_USER_FIELDS).populate('createdBy', 'email role')
  return { ...user!.toJSON(), temporaryPassword }
}

export function managedAccountEditInput(body: unknown, role: 'LGU' | 'ADMIN') {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Provide account details')
  const input = body as Record<string, unknown>
  const allowed = role === 'LGU' ? ['email', 'municipality'] : ['email']
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new Error('Unexpected account field')
  const emailError = managedEmailError(input.email)
  if (emailError) throw new Error(emailError)
  if (role === 'LGU' && !isLGUMunicipality(input.municipality)) throw new Error('Select a valid Pangasinan municipality')
  return { email: (input.email as string).trim().toLowerCase(), ...(role === 'LGU' ? { municipality: input.municipality as string, location: `${input.municipality}, Pangasinan` } : {}) }
}
