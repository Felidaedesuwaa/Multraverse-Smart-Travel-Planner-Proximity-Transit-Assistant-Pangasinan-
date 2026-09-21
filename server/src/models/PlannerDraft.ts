import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  plan: { type: Schema.Types.Mixed, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, apiSchemaOptions)
export const PlannerDraft = models.PlannerDraft || model('PlannerDraft', schema)
