import guides from './cityGuides.json'
import areas from './plannerAreas.json'
import dagupanLodging from './dagupanLodging.json'
import alaminosLodging from './alaminosLodging.json'
import sanCarlosLodging from './san-carlosLodging.json'
import urdanetaLodging from './urdanetaLodging.json'
import { createHash } from 'node:crypto'

// Only source-backed guides enter this planner. The broader LGU registry is not coverage.
const supported = new Set(['dagupan', 'alaminos', 'san-carlos', 'urdaneta', 'bolinao', 'lingayen', 'manaoag'])
export const canonicalArea = (id: string) => id === 'sancarlos' ? 'san-carlos' : id
export const entryId = (area: string, tag: string, name: string) => createHash('sha256').update(`${area}:${tag}:${name}`).digest('hex').slice(0, 24)
export type Entry = { id: string; name: string; tag: 'Attraction' | 'Food' | 'Lodging'; category: string; source: string; price: null; tier: string; amenities: string[]; lodgingDetails?: typeof dagupanLodging.hotels[number] & { overnight_supported?: boolean; rate_note?: string } }
export const itineraryCatalog = guides.filter(g => supported.has(g.area_id)).map(g => {
  const area = areas.find(a => a.id === g.area_id)!
  const entries: Entry[] = [
    ...g.attractions.map(a => ({ name: a.name, tag: 'Attraction' as const, category: a.category, page: a.source_page })),
    ...g.local_foods.map(f => ({ name: f.name, tag: 'Food' as const, category: 'Local food', page: f.source_page })),
    ...g.hotels.map(h => ({ name: h.name, tag: 'Lodging' as const, category: 'Accommodation', page: h.source_page })),
  ].map(e => ({ id: entryId(g.area_id, e.tag, e.name), name: e.name, tag: e.tag, category: e.category,
    source: `${g.source_file}, page ${e.page}`, price: null, tier: 'Source-listed; rate unconfirmed', amenities: [] }))
  const lodgingGuide = [dagupanLodging, alaminosLodging, sanCarlosLodging, urdanetaLodging].find(source => source.area_id === g.area_id)
  if (lodgingGuide) {
    for (const entry of entries.filter(e => e.tag === 'Lodging')) {
      const hotel = lodgingGuide.hotels.find(h => ('catalog_name' in h ? h.catalog_name : h.name) === entry.name)
      if (hotel) Object.assign(entry, { name: hotel.name, lodgingDetails: hotel, tier: hotel.tier, amenities: hotel.amenities,
        category: hotel.accommodation_type, source: `${hotel.source_file}, page ${hotel.source_page}` })
    }
  }
  return { id: area.id, name: area.name, group: area.kind === 'City' ? 'Cities' : 'Municipalities', entries,
    famousPlaces: entries.filter(e => e.tag === 'Attraction').map(e => e.name), foods: entries.filter(e => e.tag === 'Food').map(e => e.name),
    lodging: entries.filter(e => e.tag === 'Lodging') }
})

export const tripTypes = ['Beach & Sea', 'Nature', 'Waterfalls', 'Adventure', 'Relaxing', 'Pilgrimage', 'History & Culture', 'Food Trip', 'Farm Experience', 'Scenic / Photography', 'Family Trip', 'Couple Trip', 'Barkada Trip', 'Shopping & Pasalubong', 'Festivals & Events']
export const activities = ['Swimming', 'Boating', 'Kayaking', 'Bamboo / Craft Experience', 'Farm Visit', 'Beach Relaxation', 'Outdoor Exploration', 'Photography', 'Local Food', 'Church / Pilgrimage', 'Resort / Staycation']
export const preferences = ['Budget-friendly', 'Island hopping', 'Accessible routes', 'Photography spots', 'Cultural sites']
export const transportModes = ['Bus', 'Jeepney', 'Tricycle', 'Van', 'Own Vehicle']
