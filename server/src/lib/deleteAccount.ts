import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User, Trip, BudgetEntry, SavedPlace } from '../models'
import { PlannerDraft } from '../models/PlannerDraft'
import { PendingRegistration } from '../models/PendingRegistration'
import { PasswordReset } from '../models/PasswordReset'
import { AuthError } from './authLimits'

export async function deleteAccount(userId: string, password: unknown, confirmation: unknown) {
  if (confirmation !== true) throw new AuthError('Confirm that you want to permanently delete your account.')
  if (typeof password !== 'string' || !password || password.length > 256) throw new AuthError('Enter your current password.')
  const user = await User.findById(userId).select('+passwordHash')
  if (!user) throw new AuthError('Account no longer exists.', 401)
  if (!await bcrypt.compare(password, user.passwordHash)) throw new AuthError('Incorrect password. Your account has not been deleted.')

  // A failure rolls back the entire deletion; shared destination/transit catalogs stay intact.
  await mongoose.connection.transaction(async session => {
    const removed = await User.findOneAndDelete({ _id: userId, passwordHash: user.passwordHash }, { session })
    if (!removed) throw new AuthError('Account changed. Please sign in and try again.', 409)
    await Trip.deleteMany({ userId }, { session })
    await BudgetEntry.deleteMany({ userId }, { session })
    await SavedPlace.deleteMany({ userId }, { session })
    await PlannerDraft.deleteMany({ userId }, { session })
    await PendingRegistration.deleteMany({ email: user.email }, { session })
    await PasswordReset.deleteMany({ userId }, { session })
  })
}
