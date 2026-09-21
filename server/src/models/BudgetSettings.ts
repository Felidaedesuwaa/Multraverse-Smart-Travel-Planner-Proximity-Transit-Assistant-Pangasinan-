import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions, objectId } from './_helpers'

const budgetSettingsSchema = new Schema({
  userId: { ...objectId(), ref: 'User', unique: true, index: true },
  monthlyBudget: { type: Number, required: true, min: 0, default: 8000 },
  savingsTarget: { type: Number, required: true, min: 0, max: 100, default: 20 },
}, apiSchemaOptions)

export const BudgetSettings = models.BudgetSettings || model('BudgetSettings', budgetSettingsSchema)
