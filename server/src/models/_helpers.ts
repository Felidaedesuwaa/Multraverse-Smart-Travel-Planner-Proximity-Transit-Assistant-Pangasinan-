import { Schema } from 'mongoose'

/** Keep the existing API contract while MongoDB stores ObjectIds in `_id`. */
export const apiSchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      ret.id = String(ret._id)
      delete ret._id
      return ret
    },
  },
}

export const objectId = () => ({ type: Schema.Types.ObjectId, required: true })
