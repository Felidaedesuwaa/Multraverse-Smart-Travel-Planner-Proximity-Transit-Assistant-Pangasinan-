import { itineraryCatalog, Entry } from '../data/itineraryCatalog'
import { Place, LocalFood } from '../models'

// Use a request-local copy so moderation changes never leak through a global cache.
export async function publishedItineraryCatalog() {
  const [places, foods] = await Promise.all([
    Place.find({ approvalStatus: 'approved', pendingDeletion: { $ne: true } }).lean(),
    LocalFood.find({ approvalStatus: 'approved', pendingDeletion: { $ne: true } }).lean(),
  ])
  return itineraryCatalog.map(area => {
    const entries: Entry[] = area.entries.map(entry => ({ ...entry }))
    for (const [rows, tag] of [[places, 'Attraction'], [foods, 'Food']] as const) {
      for (const row of rows as any[]) {
        if (row.municipality !== area.name) continue
        const existing = entries.find(entry => entry.tag === tag && entry.name.toLowerCase() === row.name.toLowerCase())
        const details = { photo: row.photo || undefined, description: row.description, location: row.location || row.where,
          ...(tag === 'Attraction' ? { entryFee: row.entryFee ?? null, feeBasis: row.feeBasis || 'person' } : { averagePrice: row.avgPrice ?? null }) }
        if (existing) Object.assign(existing, details)
        else entries.push({ id: String(row._id), name: row.name, tag, category: row.category, source: `${area.name} LGU approved entry`, price: null, tier: '', amenities: [], ...details })
      }
    }
    return { ...area, entries, famousPlaces: entries.filter(e => e.tag === 'Attraction').map(e => e.name), foods: entries.filter(e => e.tag === 'Food').map(e => e.name) }
  })
}
