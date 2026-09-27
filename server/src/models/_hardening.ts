import { Schema, Query } from 'mongoose'
import { addGeo } from './_geo'
import { collectionNames } from './_collections'

export const budgetCategories = ['Transport', 'Food', 'Accommodation', 'Entrance Fees', 'Activities', 'Shopping', 'Emergency', 'Others']
const integerFields = /^(stops|passengers|alerts|reviewCount|order|day|attempts|count|reviewRevision|capacity|visitMinutes|durationMinutes|openingMinutes|closingMinutes)$/

/** Shared, explicit policy applied before model compilation (also used by the migration). */
export function hardenSchema(schema: Schema, name: string) {
  if (collectionNames[name]) schema.set('collection', collectionNames[name])
  if (name === 'Place' || name === 'Geofence') addGeo(schema)
  schema.set('strict', 'throw')
  schema.set('strictQuery', true)
  // Schema/index changes are deployed only by the reviewed migration.
  schema.set('autoIndex', false)
  schema.set('autoCreate', false)
  const jsonOptions = schema.get('toJSON') || {}
  const transform = jsonOptions.transform
  schema.set('toJSON', { ...jsonOptions, transform: (doc: any, ret: any, options: any) => {
    if (typeof transform === 'function') ret = transform(doc, ret, options) || ret
    delete ret.passwordHash
    delete ret.codeHash
    return ret
  } })
  schema.eachPath((key, field: any) => {
    if (field.instance === 'String') {
      const max = key === 'photo' ? 700000 : /description|notes|tips|highlights|advisory|userNote/.test(key) ? 10000 : 2000
      if (field.options.maxlength === undefined) { field.options.maxlength = max; field.maxlength(max) }
      field.castFunction((value: unknown) => {
        if (value == null || typeof value === 'string') return value
        throw new Error(`${key} must be a string`)
      })
    }
    if (field.instance === 'Number') {
      if (key !== '__v' && field.options.min === undefined) { field.options.min = 0; field.min(0) }
      if (field.options.max === undefined) { field.options.max = 1e9; field.max(1e9) }
      field.castFunction((value: unknown) => {
        if (value == null || (typeof value === 'number' && Number.isFinite(value))) return value
        throw new Error(`${key} must be a finite number`)
      })
      if (integerFields.test(key)) { field.options.integer = true; field.validate((v: number | null) => v == null || Number.isInteger(v), `${key} must be an integer`) }
    }
    if (field.instance === 'Boolean') field.castFunction((value: unknown) => {
      if (value == null || typeof value === 'boolean') return value
      throw new Error(`${key} must be a boolean`)
    })
    if (field.instance === 'Array') {
      field.options.castNonArrays = false
      field.options.maxItems ??= key === 'photos' ? 20 : 500
      field.validate((v: unknown[]) => !v || v.length <= field.options.maxItems, `${key} has too many items`)
      const element = field.$embeddedSchemaType
      if (element?.instance === 'String') {
        element.maxlength(2000)
        element.castFunction((v: unknown) => {
          if (typeof v === 'string') return v
          throw new Error(`${key} items must be strings`)
        })
      }
    }
    if (field.instance === 'Mixed') {
      field.validate((v: unknown) => v == null || (typeof v === 'object' && !Array.isArray(v) && JSON.stringify(v).length <= 1000000), `${key} must be a bounded object`)
    }
    if (field.options.ref) {
      field.validate({
        validator: async function(this: any, value: any) {
          if (value == null) return true
          // Historical attribution and saved snapshots may outlive their source.
          if (!(this instanceof Query) && !this.isNew && !this.isModified(key)) return true
          const connection = this instanceof Query ? this.model.db : this.constructor.db
          const session = this instanceof Query ? this.getOptions().session : this.$session()
          const target = connection.model(field.options.ref)
          return !!(await target.exists({ _id: value }).session(session || null))
        }, message: `${key} references a missing ${field.options.ref}`,
      })
    }
  })
  schema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace'], function() {
    this.setOptions({ runValidators: true, strict: 'throw', strictQuery: true })
    if (Array.isArray(this.getUpdate())) throw new Error('Pipeline updates require a reviewed migration')
  })
  if (schema.path('createdAt') && !['AISettings', 'PlannerDraft'].includes(name) && !schema.indexes().some(([key]) => JSON.stringify(key) === JSON.stringify({ createdAt: -1, _id: -1 }))) schema.index({ createdAt: -1, _id: -1 })
  if (schema.path('userId') && name !== 'PlannerDraft') schema.index({ userId: 1, createdAt: -1, _id: -1 })
  if (schema.path('approvalStatus')) {
    schema.index({ municipality: 1, approvalStatus: 1, submittedAt: -1, createdAt: -1, _id: -1 })
    schema.index({ approvalStatus: 1, submittedAt: -1, _id: -1 })
  }
  if (name === 'BudgetEntry') { (schema.path('category') as any).enum(...budgetCategories); schema.index({ userId: 1, tripId: 1 }); schema.index({ tripId: 1 }) }
  if (name === 'SavedPlace') { schema.index({ isPublic: 1, createdAt: -1, _id: -1 }); schema.index({ userId: 1, placeId: 1 }); schema.index({ userId: 1, name: 1 }) }
  if (name === 'User') {
    schema.index({ role: 1, createdAt: -1, _id: -1 })
    schema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: 'SUPERADMIN' }, name: 'single_bootstrap_superadmin' })
  }
  if (name === 'Place') schema.index({ name: 1, _id: 1 })
  if (name === 'RoutePrice') schema.index({ fromAreaId: 1, toAreaId: 1, transitRouteId: 1 })
  if (name === 'TransitRoute') { schema.index({ updatedAt: -1 }); schema.index({ status: 1 }) }
  if (name === 'Phrasebook') schema.index({ category: 1, filipino: 1, _id: 1 })
}
