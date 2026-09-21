export type LocationSuggestion = { id: string; label: string }

// Keep only short, distinct address labels that fit the profile location field.
export function locationSuggestions(data: unknown): LocationSuggestion[] {
  const features = (data as { features?: unknown[] } | null)?.features
  if (!Array.isArray(features)) throw new Error('Invalid location response')
  const labels = new Set<string>()
  const results: LocationSuggestion[] = []
  for (const feature of features) {
    const p = (feature as { properties?: Record<string, unknown> } | null)?.properties
    if (!p) continue
    const parts = [p.name, p.city, p.county, p.state, p.country]
      .filter((value): value is string => typeof value === 'string' && !!value.trim())
      .map(value => value.trim())
    const label = [...new Set(parts)].join(', ')
    if (!label || label.length > 120 || labels.has(label.toLowerCase())) continue
    labels.add(label.toLowerCase())
    results.push({ id: `photon:${p.osm_type}:${p.osm_id}:${results.length}`, label })
    if (results.length === 6) break
  }
  return results
}

const cache = new Map<string, { expires: number; results: LocationSuggestion[] }>()
const pending = new Map<string, Promise<LocationSuggestion[]>>()
let windowStart = 0
let requests = 0

export async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  const key = query.toLowerCase()
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) return cached.results
  const active = pending.get(key)
  if (active) return active
  if (Date.now() - windowStart >= 60000) { windowStart = Date.now(); requests = 0 }
  // Bound traffic to the public Photon service; the UI retains local suggestions.
  if (requests >= 60 || pending.size >= 4) throw new Error('Location search is busy')
  requests++
  const task = (async () => {
    const url = new URL(process.env.PHOTON_URL || 'https://photon.komoot.io/api/')
    // Local Pangasinan matches are ranked first by the client. Keep the online
    // search global so a city name does not resolve to an unrelated nearby road.
    url.search = new URLSearchParams({ q: query, limit: '6', lang: 'en' }).toString()
    const response = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error('Location search unavailable')
    const results = locationSuggestions(await response.json())
    if (cache.size >= 256) cache.delete(cache.keys().next().value!)
    cache.set(key, { results, expires: Date.now() + 24 * 60 * 60 * 1000 })
    return results
  })()
  pending.set(key, task)
  try { return await task } finally { pending.delete(key) }
}
