import { Schema } from 'mongoose'

export const moderationFields = {
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved', index: true },
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  submittedAt: Date,
  reviewRevision: { type: Number, default: 0 },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  rejectionReason: { type: String, maxlength: 1000 },
  pendingDeletion: { type: Boolean, default: false },
}

// Legacy records remain published until the explicit backfill has run.
export const publishedFilter = { pendingDeletion: { $ne: true }, $or: [{ approvalStatus: 'approved' }, { approvalStatus: { $exists: false } }] }
