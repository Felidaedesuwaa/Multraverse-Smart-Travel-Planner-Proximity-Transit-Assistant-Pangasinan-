import { model, models, Schema } from 'mongoose'
import { hardenSchema } from './_hardening'
const schema = new Schema({
  _id: { type: String, required: true, maxlength: 100 },
  count: { type: Number, default: 0, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
})
hardenSchema(schema, 'AuthLimit')
export const AuthLimit = models.AuthLimit || model('AuthLimit', schema)
