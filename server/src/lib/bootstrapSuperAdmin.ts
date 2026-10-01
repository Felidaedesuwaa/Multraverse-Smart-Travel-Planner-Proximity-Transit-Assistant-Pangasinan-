import bcrypt from 'bcryptjs'
import { User } from '../models'
import { managedAccountInput } from './managedAccounts'

export async function bootstrapSuperAdmin(email: string, password: string) {
  // A partial unique index makes parallel seed runs safe, even with different emails.
  await User.collection.createIndex({ role: 1 }, { unique: true, partialFilterExpression: { role: 'SUPERADMIN' }, name: 'single_bootstrap_superadmin' })
  const existing = await User.findOne({ role: 'SUPERADMIN' }).select('email role')
  if (existing) return { email: existing.email, created: false }
  const input = managedAccountInput({ email, password }, 'ADMIN')
  try {
    const user = await User.create({ name: 'Super Administrator', email: input.email, passwordHash: await bcrypt.hash(password, 12), role: 'SUPERADMIN', createdBy: null, location: 'Pangasinan', emailVerifiedAt: new Date() })
    return { email: user.email, created: true }
  } catch (error: any) {
    if (error.code === 11000) {
      const winner = await User.findOne({ role: 'SUPERADMIN' }).select('email')
      if (winner) return { email: winner.email, created: false }
      throw new Error('Bootstrap email belongs to an existing account; choose SUPERADMIN_SEED_EMAIL. No account was promoted.')
    }
    throw error
  }
}
