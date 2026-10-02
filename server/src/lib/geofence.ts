import map from '../../../src/data/pangasinanMap.json'
import { transitMunicipality } from './transitBoundary'

export type Point = { lat: number; lng: number }
export function meters(a: Point, b: Point) {
  const r = (v: number) => v * Math.PI / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2
  return 12742000 * Math.asin(Math.sqrt(Math.min(1, h)))
}
// Shared municipal edges cancel, leaving the provincial perimeter and islands.
const edges = new Map<string, { a: Point; b: Point; count: number }>()
for (const area of map.areas) for (const part of area.d.split('Z').filter(Boolean)) {
  const n = (part.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)
  const points: Point[] = []
  for (let i = 0; i < n.length; i += 2) points.push({ lng: ((n[i] - 40) / 817.448349655742 + 115.11081980143565) / 0.9612616959383189, lat: 16.443622150000063 - (n[i + 1] - 40) / 817.448349655742 })
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length]
    if (a.lat === b.lat && a.lng === b.lng) continue
    const key = [JSON.stringify(a), JSON.stringify(b)].sort().join('|')
    const prior = edges.get(key)
    if (prior) prior.count++; else edges.set(key, { a, b, count: 1 })
  }
}
export function validateFence(value: any) {
  const p = value.coordinates, radius = value.radiusMeters
  if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng) || !Number.isFinite(radius) || radius < 10 || radius > 10000) throw new Error('Provide valid coordinates and a radius from 10 to 10,000 metres.')
  const municipality = transitMunicipality(p.lat, p.lng)
  if (!municipality) throw new Error('The geofence centre must be inside Pangasinan.')
  const sx = 111195 * Math.cos(p.lat * Math.PI / 180), sy = 111195
  for (const { a, b, count } of edges.values()) {
    if (count !== 1) continue
    const ax = (a.lng - p.lng) * sx, ay = (a.lat - p.lat) * sy
    const bx = (b.lng - p.lng) * sx, by = (b.lat - p.lat) * sy
    const dx = bx - ax, dy = by - ay
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)))
    if (Math.hypot(ax + t * dx, ay + t * dy) <= radius + 25) throw new Error('The entire geofence radius must stay inside Pangasinan. Reduce the radius or move the centre.')
  }
  return map.areas.find(area => area.id === municipality)!.name
}
export function transition(previous: any, distance: number, accuracy: number, radius: number, dwellSeconds: number, now: number) {
  const state = { inside: false, enteredAt: 0, dwelled: false, ...previous }
  let event: string | undefined
  if (distance + accuracy <= radius) {
    if (!state.inside) { state.inside = true; state.enteredAt = now; state.dwelled = false; event = 'entry' }
    else if (!state.dwelled && now - state.enteredAt >= dwellSeconds * 1000) { state.dwelled = true; event = 'dwell' }
  } else if (distance - accuracy > radius && state.inside) {
    state.inside = false; state.enteredAt = 0; state.dwelled = false; event = 'exit'
  } else if (state.inside && !state.dwelled) {
    // An uncertain edge fix cannot establish continuous time inside the zone.
    state.enteredAt = now
  }
  return { state, event }
}
