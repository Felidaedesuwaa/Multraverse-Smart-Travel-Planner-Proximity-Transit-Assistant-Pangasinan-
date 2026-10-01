import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { AuditLog, User } from '../models'
import { isLGUMunicipality } from './lguMunicipalities'
import { registrationEmailError } from './registration'

export const MANAGED_USER_FIELDS = 'name email role municipality createdAt createdBy'
export function managedAccountInput(body: unknown, role: 'LGU' | 'ADMIN') {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Provide account details')
  const input = body as Record<string, unknown>
  const allowed = role === 'LGU' ? ['email', 'password', 'municipality'] : ['email', 'password']
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new Error('Unexpected account field')
  const emailError = registrationEmailError(input.email)
  if (emailError) throw new Error(emailError)
  if (typeof input.password !== 'string' || input.password.length < 8 || Buffer.byteLength(input.password, 'utf8') > 72 || !/[A-Z]/.test(input.password) || !/[a-z]/.test(input.password) || !/[0-9]/.test(input.password)) throw new Error('Password needs 8 or more characters, uppercase, lowercase and a number; maximum 72 UTF-8 bytes')
  if (role === 'LGU' && !isLGUMunicipality(input.municipality)) throw new Error('Select a valid Pangasinan municipality')
  return { email: (input.email as string).trim().toLowerCase(), password: input.password, municipality: role === 'LGU' ? input.municipality as string : undefined }
}

export async function createManagedAccount(input: ReturnType<typeof managedAccountInput>, role: 'LGU' | 'ADMIN', actor: string) {
  const passwordHash = await bcrypt.hash(input.password, 12)
  // Account and its audit event commit together; an audit failure cannot leave an unaudited account.
  const session = await mongoose.startSession()
  let userId: string | undefined
  try {
    await session.withTransaction(async () => {
      const [user] = await User.create([{
        name: role === 'LGU' ? `${input.municipality} Tourism Officer` : 'Administrator',
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
  return User.findById(userId).select(MANAGED_USER_FIELDS).populate('createdBy', 'email role')
}
