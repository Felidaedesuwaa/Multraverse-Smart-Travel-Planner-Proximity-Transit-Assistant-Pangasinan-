import { budgetSettingsSchema } from '../models/User'
import { RequestHandler, Request } from 'express'
import { Schema } from 'mongoose'
import { BudgetEntry, Trip, SavedPlace, Place, RoutePrice, LocalFood, Geofence, TransitRoute } from '../models'
import { lguResources } from '../lib/lguResources'
import { validateRequest } from '../lib/planner'
import { tripFieldErrors } from '../lib/tripValidation'

function invalid(message = 'Invalid request'): never { throw Object.assign(new Error(message), { status: 400 }) }
function object(value: unknown): asserts value is Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Expected an object')
}
// Strip recursively and reject the request, so sanitization cannot broaden a query.
export function sanitize(value: any, depth = 0): boolean {
  if (depth > 32) invalid('Request nesting is too deep')
  let changed = false
  if (value && typeof value === 'object') for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.') || ['__proto__', 'constructor', 'prototype'].includes(key)) { delete value[key]; changed = true }
    else changed = sanitize(value[key], depth + 1) || changed
  }
  return changed
}
export const sanitizeRequest: RequestHandler = (req, _res, next) => {
  try {
    const query = req.query
    const changed = [req.body, query, req.params].map(v => sanitize(v)).some(Boolean)
    // Express 5 exposes query as a getter; assigning to it throws.
    Object.defineProperty(req, 'query', { value: query, writable: true, configurable: true })
    if (changed) invalid('Operator keys and dotted field names are not accepted')
    for (const value of Object.values(query)) if (typeof value !== 'string') invalid('Query parameters must be single strings')
    next()
  } catch (error) { next(error) }
}

export function validateId(req: Request, res: any, next: any, value: string) {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) return res.status(400).json({ error: 'Invalid resource ID' })
  next()
}

export function pagination(req: Request) {
  const parse = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > max) invalid('Invalid pagination')
    return Number(value)
  }
  const page = parse(req.query.page, 1, 10000), limit = parse(req.query.limit, 100, 200)
  return { skip: (page - 1) * limit, limit }
}

function checkField(field: any, value: any, key: string): void {
  if (value === undefined) return
  if (value === null) { if (field.isRequired) invalid(`${key} is required`); return }
  const opts = field.options
  if (field.instance === 'String') {
    if (typeof value !== 'string' || value.length > (opts.maxlength ?? 2000) || value.length < (opts.minlength ?? 0) || (field.isRequired && !value.trim())) invalid(`Invalid ${key}`)
    if (field.enumValues?.length && !field.enumValues.includes(value)) invalid(`Invalid ${key}`)
    if (opts.match && !opts.match.test(value)) invalid(`Invalid ${key}`)
  } else if (field.instance === 'Number') {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < (opts.min ?? -Infinity) || value > (opts.max ?? Infinity) || (opts.integer && !Number.isInteger(value))) invalid(`Invalid ${key}`)
  } else if (field.instance === 'Boolean') { if (typeof value !== 'boolean') invalid(`Invalid ${key}`) }
  else if (field.instance === 'ObjectId') { if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) invalid(`Invalid ${key}`) }
  else if (field.instance === 'Date') { if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) invalid(`Invalid ${key}`) }
  else if (field.instance === 'Array') {
    if (!Array.isArray(value) || value.length > (opts.maxItems ?? 500)) invalid(`Invalid ${key}`)
    const element = field.$embeddedSchemaType
    if (element) value.forEach(v => checkField(element, v, key))
  } else if (field.instance === 'Mixed') object(value)
}

export function modelInput(schema: Schema, body: unknown, allowed: string[], create: boolean) {
  object(body)
  if (!Object.keys(body).length || Object.keys(body).some(k => !allowed.includes(k))) invalid('Provide only editable fields')
  for (const [key, value] of Object.entries(body)) {
    const field = schema.path(key)
    if (field) checkField(field, value, key)
    else {
      object(value)
      const nested = Object.keys(schema.paths).filter(p => p.startsWith(`${key}.`))
      if (!nested.length || Object.keys(value).some(k => !nested.includes(`${key}.${k}`))) invalid(`Invalid ${key}`)
      for (const [k, v] of Object.entries(value)) checkField(schema.path(`${key}.${k}`), v, `${key}.${k}`)
      if (key === 'coordinates' && (typeof value.lat !== 'number' || typeof value.lng !== 'number')) invalid('Provide both latitude and longitude')
    }
  }
  if (create) for (const key of allowed) {
    const field: any = schema.path(key)
    if (field?.isRequired && field.defaultValue === undefined && body[key] === undefined) invalid(`${key} is required`)
  }
}

type Rule = (v: any) => boolean
const string: Rule = v => typeof v === 'string' && v.length <= 2000
const bool: Rule = v => typeof v === 'boolean'
const number: Rule = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e9
function fields(body: unknown, rules: Record<string, Rule>, required: string[] = []) {
  object(body)
  if (Object.entries(body).some(([key, value]) => !rules[key]?.(value)) || required.some(k => body[k] === undefined)) invalid('Malformed request fields')
}
const catalog: Record<string, any> = { places: Place, 'route-prices': RoutePrice, foods: LocalFood, geofences: Geofence, 'transit-routes': TransitRoute }
const serverFields = ['_id', '__v', 'createdAt', 'updatedAt', 'submittedBy', 'submittedAt', 'reviewedBy', 'reviewedAt', 'reviewRevision', 'approvalStatus', 'pendingDeletion', 'rejectionReason', 'geoPoint']

/** Each router installs this before its handlers, including isolated API tests. */
export function validateRouter(scope: string): RequestHandler {
  return (req, res, next) => {
    try {
      if (sanitize(req.params)) invalid('Invalid parameters')
      pagination(req)
      // Resource IDs are parsed later by Express, so validate path segments here.
      const parts = req.path.split('/').filter(Boolean)
      if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next()
      const body = req.body ?? {}
      object(body)
      const create = req.method === 'POST'
      if (scope === 'auth') {
        const rules: Record<string, Rule> = { email: string, password: string, firstName: string, middleName: string, surname: string, challengeId: string, code: string, currentPassword: string, newPassword: string }
        const keys = req.path === '/password/forgot' ? ['email'] : req.path === '/password/reset' ? ['challengeId', 'code', 'newPassword'] : req.path === '/password/change' ? ['currentPassword', 'newPassword'] : req.path === '/login' ? ['email', 'password'] : req.path === '/register' ? ['firstName', 'middleName', 'surname', 'email', 'password'] : req.path === '/register/resend' ? ['challengeId'] : ['challengeId', 'code']
        fields(body, Object.fromEntries(keys.map(k => [k, rules[k]])), keys.filter(k => k !== 'middleName'))
      } else if (scope === 'users') {
        const rules: Record<string, Rule> = req.path === '/me' ? { name: string, firstName: string, middleName: string, surname: string, location: string, photo: (v: any) => v === null || (typeof v === 'string' && v.length <= 700000) } : { email: string, password: string, municipality: string }
        fields(body, rules)
      } else if (scope === 'trips') {
        const errors = tripFieldErrors(body, create)
        if (Object.keys(errors).length) return res.status(400).json({ error: 'Check the highlighted trip fields.', fieldErrors: errors })
        modelInput(Trip.schema, body, create ? ['title', 'location', 'date', 'budget', 'icon'] : ['title', 'location', 'date', 'status', 'budget', 'icon'], create)
      }
      else if (scope === 'budget') modelInput(req.path === '/settings' ? budgetSettingsSchema : BudgetEntry.schema, body, req.path === '/settings' ? ['monthlyBudget', 'savingsTarget'] : ['label', 'category', 'amount', 'color', 'tripId'], create || req.path === '/settings')
      else if (scope === 'places') {
        if ('name' in body && (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 120 || !/\p{L}/u.test(body.name) || /[<>\x00-\x1f\x7f]/.test(body.name))) invalid('Enter a place name with letters, 2–120 characters, without markup.')
        modelInput(SavedPlace.schema, body, ['name', 'category', 'description', 'icon', 'rating', 'userNote', 'photos', 'isPublic', 'addedToTrip'], create)
      }
      else if (scope === 'approvals') fields(body, { reason: string, revision: v => number(v) && Number.isInteger(v) }, ['revision'])
      else if (scope === 'lgu') {
        const resource = lguResources[parts[0]]
        if (resource) modelInput(resource.model.schema, body, resource.fields, create)
      } else if (scope === 'knowledge' || scope === 'geofences' || scope === 'transitRoutes') {
        const model = scope === 'knowledge' ? catalog[parts[0]] : scope === 'geofences' ? Geofence : TransitRoute
        if (model) modelInput(model.schema, body, [...new Set(Object.keys(model.schema.paths).map(p => p.split('.')[0]))].filter(k => !serverFields.includes(k)), create)
      } else if (scope === 'planner' || scope === 'ai') {
        if (req.path === '/settings') fields(body, { itineraryNarrative: bool, translation: bool })
        else if (req.path === '/itinerary') {
          fields(body, { origin: v => !!v && typeof v === 'object', destinations: Array.isArray, dates: v => !!v && typeof v === 'object', startTime: string, days: number, budget: number, travelers: number, preferences: Array.isArray, transportModes: Array.isArray, pace: string, lodging: v => !!v && typeof v === 'object', foodPerPersonPerDay: number, useSavedPlaces: bool, returnToOrigin: bool, excludedPlaceIds: Array.isArray })
          validateRequest({ ...body, origin: { areaId: 'dagupan' } })
        } else if (parts[0] === 'planner') fields(body, parts[2] === 'save' ? { acceptIncomplete: bool } : {})
        else if (req.path === '/itinerary/model') fields(body, { destination: string, budget: v => string(v) || number(v), days: number, preferences: v => Array.isArray(v) && v.length <= 20 && v.every(string) }, ['destination', 'budget', 'days'])
        else if (req.path === '/translate') fields(body, { text: string, from: string, to: string }, ['text', 'from', 'to'])
        else if (req.path === '/speech') fields(body, { text: string, language: string }, ['text'])
        else if (req.path === '/transcribe') fields(body, { audio: v => typeof v === 'string' && v.length <= 14000000, mimeType: string }, ['audio'])
      }
      next()
    } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' }) }
  }
}
