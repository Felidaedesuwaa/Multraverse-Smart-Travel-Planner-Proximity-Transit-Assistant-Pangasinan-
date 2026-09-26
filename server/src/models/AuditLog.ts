import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'

const auditLogSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  targetUser: { type: Schema.Types.ObjectId, ref: 'User' },
  metadata: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, immutable: true },
}, { ...apiSchemaOptions, timestamps: false })
auditLogSchema.index({ actor: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ createdAt: -1, _id: -1 })
export const AuditLog = models.AuditLog || model('AuditLog', auditLogSchema)
