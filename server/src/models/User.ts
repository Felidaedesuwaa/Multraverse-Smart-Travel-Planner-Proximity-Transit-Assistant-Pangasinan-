import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['EXPLORER', 'PRO', 'ADMIN'], default: 'EXPLORER' },
  location: { type: String, default: 'Dagupan City' },
}, apiSchemaOptions)

export const User = models.User || model('User', userSchema)
