import { model, models, Schema } from 'mongoose'
import { hardenSchema } from './_hardening'

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  challengeId: { type: String, required: true, unique: true, match: /^[a-f0-9]{64}$/, maxlength: 64 },
  codeHash: { type: String, required: true, select: false, maxlength: 64 },
  credential: { type: String, required: true, select: false, maxlength: 64 },
  attempts: { type: Number, required: true, default: 0, min: 0, max: 5 },
  expiresAt: { type: Date, required: true, expires: 0 },
})
hardenSchema(schema, 'PasswordReset')
export const PasswordReset = models.PasswordReset || model('PasswordReset', schema)

// Additive setup only: never rebuild, alter or delete existing account data.
// Kept explicit because the other application schemas disable autoCreate.
export async function preparePasswordResetStorage() {
  await PasswordReset.createCollection({ validator: { $jsonSchema: schema.toJSONSchema({ useBsonType: true }) } })
  await PasswordReset.createIndexes()
}
