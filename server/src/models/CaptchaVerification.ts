import { model, models, Schema } from 'mongoose'

// Store only a digest. Atomic deletion makes each registration pass single-use.
const schema = new Schema({
  digest: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { strict: 'throw', autoCreate: false, autoIndex: false })

export const CaptchaVerification = models.CaptchaVerification || model('CaptchaVerification', schema)

export async function prepareCaptchaStorage() {
  await CaptchaVerification.createCollection({ validator: { $jsonSchema: schema.toJSONSchema({ useBsonType: true }) } })
  await CaptchaVerification.createIndexes()
}
