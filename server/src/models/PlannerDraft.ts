import { hardenSchema } from './_hardening'
import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
import { planSchema } from './_plan'
const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  plan: { type: planSchema, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, apiSchemaOptions)
hardenSchema(schema, 'PlannerDraft')
export const PlannerDraft = models.PlannerDraft || model('PlannerDraft', schema)
