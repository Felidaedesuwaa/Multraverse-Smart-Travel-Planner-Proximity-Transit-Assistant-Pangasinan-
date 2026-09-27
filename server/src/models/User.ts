import { hardenSchema } from './_hardening'
import { lguMunicipalityNames, normalizeLGUMunicipality } from '../lib/lguMunicipalities'
import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
// Embedded preferences belong to User; no separate BudgetSettings collection.
export const budgetSettingsSchema = new Schema({
  monthlyBudget: { type: Number, required: true, min: 0, max: 1000000000 },
  savingsTarget: { type: Number, required: true, min: 0, max: 100 },
}, { _id: false })
hardenSchema(budgetSettingsSchema, 'BudgetSettings')

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  firstName: { type: String, trim: true, maxlength: 35 },
  middleName: { type: String, trim: true, maxlength: 35 },
  surname: { type: String, trim: true, maxlength: 35 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  passwordHash: { type: String, required: true, select: false, minlength: 60, maxlength: 60 },
  emailVerifiedAt: { type: Date, default: null },
  role: { type: String, enum: ['EXPLORER', 'PRO', 'ADMIN', 'LGU', 'SUPERADMIN'], uppercase: true, default: 'EXPLORER' },
  municipality: { type: String, trim: true, enum: lguMunicipalityNames, set: normalizeLGUMunicipality, maxlength: 120, required: function (this: { role?: string }) { return this.role === 'LGU' } },
  location: { type: String, trim: true, maxlength: 120 },
  budgetSettings: { type: budgetSettingsSchema, default: undefined },
  photo: { type: String, default: null },
}, apiSchemaOptions)

hardenSchema(userSchema, 'User')
export const User = models.User || model('User', userSchema)
