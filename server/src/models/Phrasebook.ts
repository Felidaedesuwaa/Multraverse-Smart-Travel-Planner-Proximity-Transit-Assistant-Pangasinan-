import { model, models, Schema } from 'mongoose'
import { apiSchemaOptions } from './_helpers'
const phrasebookSchema = new Schema({
  filipino: { type: String, required: true }, pangasinan: { type: String, required: true }, english: { type: String, required: true }, category: { type: String, required: true },
}, { ...apiSchemaOptions, timestamps: { createdAt: true, updatedAt: false } })
export const Phrasebook = models.Phrasebook || model('Phrasebook', phrasebookSchema)
