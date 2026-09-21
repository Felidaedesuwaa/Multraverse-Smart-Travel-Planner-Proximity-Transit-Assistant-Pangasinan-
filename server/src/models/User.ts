import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['EXPLORER', 'PRO', 'ADMIN'], default: 'EXPLORER' },
  location: { type: String, default: 'Dagupan City', trim: true, maxlength: 120 },
  photo: { type: String, default: null },
}, apiSchemaOptions)

export const User = models.User || model('User', userSchema)
