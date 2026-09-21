import { model, models, Schema } from 'mongoose'
const schema = new Schema({
  _id: { type: String, default: 'global' },
  itineraryNarrative: { type: Boolean, default: true },
  translation: { type: Boolean, default: true },
}, { timestamps: true })
export const AISettings = models.AISettings || model('AISettings', schema)
