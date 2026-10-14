import { model, models, Schema } from 'mongoose'

// Separate additive storage avoids changing validators on existing users.
const factorSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, unique: true },
  encryptedSecret: { type: String, required: true, select: false },
  enrollmentId: { type: String, required: true, select: false },
  enabled: { type: Boolean, default: false },
  lastCounter: { type: Number, default: -1 },
}, { strict: 'throw', autoCreate: false, autoIndex: false })
const revokedSchema = new Schema({
  digest: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { strict: 'throw', autoCreate: false, autoIndex: false })
export const AccountFactor = models.AccountFactor || model('AccountFactor', factorSchema)
export const RevokedSession = models.RevokedSession || model('RevokedSession', revokedSchema)
const privacySchema = new Schema({
  challengeId: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, default: null },
  noticeVersion: { type: String, required: true },
  acceptedAt: { type: Date, required: true },
  expiresAt: { type: Date, default: null, expires: 0 },
}, { strict: 'throw', autoCreate: false, autoIndex: false })
export const PrivacyAcknowledgment = models.PrivacyAcknowledgment || model('PrivacyAcknowledgment', privacySchema)
export async function prepareAccountSecurityStorage() {
  for (const model of [AccountFactor, RevokedSession, PrivacyAcknowledgment]) {
    await model.createCollection({ validator: { $jsonSchema: model.schema.toJSONSchema({ useBsonType: true }) } })
    await model.createIndexes()
  }
}
