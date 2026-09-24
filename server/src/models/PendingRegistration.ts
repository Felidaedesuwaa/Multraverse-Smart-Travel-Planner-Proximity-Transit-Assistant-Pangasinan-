import { model, models, Schema } from 'mongoose'

// Unverified registrations never become login-capable User records.
const schema = new Schema({
  email: { type: String, required: true, unique: true },
  challengeId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  firstName: String,
  middleName: String,
  surname: String,
  passwordHash: { type: String, required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  resendAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
})
export const PendingRegistration = models.PendingRegistration || model('PendingRegistration', schema)
