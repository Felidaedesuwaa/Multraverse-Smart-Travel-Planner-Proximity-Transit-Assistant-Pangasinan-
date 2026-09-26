import { Model } from 'mongoose'
import { Geofence, LocalFood, Place, RoutePrice, TransitRoute } from '../models'

export const lguResources: Record<string, { model: Model<any>; fields: string[] }> = {
  places: { model: Place, fields: ['name', 'description', 'location', 'category', 'entryFee', 'areaId', 'coordinates', 'visitMinutes', 'bestTime', 'feeBasis', 'accessibility', 'tags', 'sourceUrl', 'openingMinutes', 'closingMinutes', 'closedWeekdays', 'openHours', 'tips', 'highlights'] },
  geofences: { model: Geofence, fields: ['location', 'zone', 'radius', 'coord', 'coordinates', 'radiusMeters', 'advisory', 'x', 'y', 'active'] },
  foods: { model: LocalFood, fields: ['name', 'description', 'avgPrice', 'where', 'category'] },
  'route-prices': { model: RoutePrice, fields: ['from', 'to', 'vehicle', 'price', 'duration', 'notes', 'fromAreaId', 'toAreaId', 'transitRouteId', 'durationMinutes', 'fareBasis', 'capacity', 'sourceUrl'] },
  'transit-routes': { model: TransitRoute, fields: ['name', 'type', 'stops', 'frequency', 'status', 'areaIds', 'stopNames', 'firstDeparture', 'lastDeparture', 'sourceUrl'] },
}

export function resourceInput(body: unknown, fields: string[]) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Provide an object with resource fields')
  const input = body as Record<string, unknown>
  const unknown = Object.keys(input).filter(key => !fields.includes(key))
  if (unknown.length) throw new Error(`Fields cannot be edited: ${unknown.join(', ')}`)
  if (!Object.keys(input).length) throw new Error('Provide at least one field')
  // Reject MongoDB operators even inside nested coordinates/arrays.
  const check = (value: unknown): void => {
    if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) throw new Error('Invalid field name')
      check(child)
    }
  }
  check(input)
  return input
}
