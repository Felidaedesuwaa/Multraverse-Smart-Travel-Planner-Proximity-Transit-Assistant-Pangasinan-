import guides from '../data/cityGuides.json'

const normalize = (value: string) => value.normalize('NFKC').toLowerCase().replace(/’/g, "'").replace(/[^a-z0-9]+/g, ' ').trim()
export const cityGuides = guides
export const cityGuideFor = (place: any) => guides.find(g => g.area_id === place.areaId || normalize(g.name.replace(/ city$/i, '')) === normalize(String(place.municipality || '').replace(/ city$/i, '')))
export function cityGuideAttraction(guide: typeof guides[number], name: string) {
  return guide.attractions.find(a => [a.name, ...a.aliases].some(n => normalize(n) === normalize(name)))
}

/** City-specific guides take precedence for itinerary attractions, not hotels. */
export function cityGuidePlaces(places: any[]) {
  const seen = new Set<string>()
  return places.flatMap(place => {
    const guide = cityGuideFor(place)
    if (!guide) return [place]
    const attraction = cityGuideAttraction(guide, place.name)
    if (!attraction) return []
    const key = `${guide.area_id}:${attraction.name}`
    if (seen.has(key)) return []
    seen.add(key)
    return [{ ...place, name: attraction.name, description: attraction.description, category: attraction.category,
      sourceUrl: guide.source_url, areaId: guide.area_id,
      guideOrder: guide.itinerary_attraction_order.indexOf(attraction.name),
      guideSourceNote: `Source: ${guide.source_file}, page ${attraction.source_page}. ${guide.source_date ? `Guide date: ${guide.source_date}.` : 'Publication date not stated.'} Operating details unverified.${'rate_warning' in guide ? ` ${guide.rate_warning}` : ''}${'access_note' in guide ? ` ${guide.access_note}` : ''}` }]
  })
}

export function cityGuideFoods(foods: any[], areaIds: string[]) {
  const selected = guides.filter(g => areaIds.includes(g.area_id))
  return [...selected.flatMap(g => g.local_foods.map(food => ({ name: food.name,
    description: `${food.description} Source: ${g.source_file}, page ${food.source_page}.`,
    where: g.name, municipality: g.name.replace(/ city$/i, ''), category: 'Local food', avgPrice: null }))),
    ...foods.filter(food => !selected.some(g => normalize(String(food.municipality || food.where)).includes(normalize(g.name.replace(/ city$/i, '')))))]
}
