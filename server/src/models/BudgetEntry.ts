import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions, objectId } from './_helpers'
const budgetEntrySchema = new Schema({
  userId: { ...objectId(), ref: 'User', index: true }, tripId: { type: Schema.Types.ObjectId, ref: 'Trip', default: null },
  label: { type: String, required: true }, amount: { type: Number, required: true }, color: { type: String, default: '#0B3C5D' },
}, { ...apiSchemaOptions, timestamps: { createdAt: true, updatedAt: false } })
export const BudgetEntry = models.BudgetEntry || model('BudgetEntry', budgetEntrySchema)
