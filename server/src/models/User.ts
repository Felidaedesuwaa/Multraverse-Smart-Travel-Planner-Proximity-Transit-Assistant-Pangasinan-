import { lguMunicipalityNames, normalizeLGUMunicipality } from '../lib/lguMunicipalities'
import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  firstName: { type: String, trim: true, maxlength: 35 },
  middleName: { type: String, trim: true, maxlength: 35 },
  surname: { type: String, trim: true, maxlength: 35 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  passwordHash: { type: String, required: true },
  emailVerifiedAt: { type: Date, default: null },
  role: { type: String, enum: ['EXPLORER', 'PRO', 'ADMIN', 'LGU', 'SUPERADMIN'], uppercase: true, default: 'EXPLORER' },
  municipality: { type: String, trim: true, enum: lguMunicipalityNames, set: normalizeLGUMunicipality, maxlength: 120, required: function (this: { role?: string }) { return this.role === 'LGU' } },
  location: { type: String, default: 'Dagupan City', trim: true, maxlength: 120 },
  photo: { type: String, default: null },
}, apiSchemaOptions)

export const User = models.User || model('User', userSchema)
