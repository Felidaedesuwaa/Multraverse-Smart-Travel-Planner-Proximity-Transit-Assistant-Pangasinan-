import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User, Trip, TripStop, BudgetEntry, BudgetSettings, SavedPlace } from '../models'
import { PlannerDraft } from '../models/PlannerDraft'
import { PendingRegistration } from '../models/PendingRegistration'
import { AuthError } from './authLimits'

export async function deleteAccount(userId: string, password: unknown, confirmation: unknown) {
  if (confirmation !== true) throw new AuthError('Confirm that you want to permanently delete your account.')
  if (typeof password !== 'string' || !password || password.length > 256) throw new AuthError('Enter your current password.')
  const user = await User.findById(userId)
  if (!user) throw new AuthError('Account no longer exists.', 401)
  if (!await bcrypt.compare(password, user.passwordHash)) throw new AuthError('Incorrect password. Your account has not been deleted.')

  // A failure rolls back the entire deletion; shared destination/transit catalogs stay intact.
  await mongoose.connection.transaction(async session => {
    const removed = await User.findOneAndDelete({ _id: userId, passwordHash: user.passwordHash }, { session })
    if (!removed) throw new AuthError('Account changed. Please sign in and try again.', 409)
    const trips = await Trip.find({ userId }).select('_id').session(session)
    await TripStop.deleteMany({ tripId: { $in: trips.map(trip => trip._id) } }, { session })
    await Trip.deleteMany({ userId }, { session })
    await BudgetEntry.deleteMany({ userId }, { session })
    await BudgetSettings.deleteMany({ userId }, { session })
    await SavedPlace.deleteMany({ userId }, { session })
    await PlannerDraft.deleteMany({ userId }, { session })
    await PendingRegistration.deleteMany({ email: user.email }, { session })
  })
}
