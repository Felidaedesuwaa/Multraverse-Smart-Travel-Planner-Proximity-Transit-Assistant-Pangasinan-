import { hardenSchema } from './_hardening'
import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
import { planSchema } from './_plan'
const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  destination: { type: String, maxlength: 200 },
  tripDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
  days: { type: Number, min: 1, max: 7 },
  travelers: { type: Number, min: 1, max: 30 },
  budgetPHP: { type: Number, min: 0, max: 1000000000 },
  estimatedMinPHP: { type: Number, min: 0, max: 1000000000 },
  estimatedMaxPHP: { type: Number, min: 0, max: 1000000000 },
  plan: { type: planSchema, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, apiSchemaOptions)
schema.set('minimize', false)
// Keep the readable table columns aligned with the canonical snapshot on writes.
schema.pre('validate', function (this: any) {
  const plan = this.plan
  if (!plan) return
  const guided = plan.guided
  this.destination = guided?.request?.areaId || plan.request?.destinations?.map((d: any) => d.areaId).join(' / ')
  this.tripDate = guided?.request?.date || plan.request?.dates?.start
  this.days = plan.request?.days
  this.travelers = plan.request?.travelers
  this.budgetPHP = plan.request?.budget
  this.estimatedMinPHP = guided?.costEstimate?.min ?? plan.costs?.knownTotal
  this.estimatedMaxPHP = guided?.costEstimate?.max ?? plan.costs?.knownTotal
})
hardenSchema(schema, 'PlannerDraft')
export const PlannerDraft = models.PlannerDraft || model('PlannerDraft', schema)
