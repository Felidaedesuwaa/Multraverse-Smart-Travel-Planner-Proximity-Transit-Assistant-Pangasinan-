import map from '../../../src/data/pangasinanMap.json'

export function transitMunicipality(lat: number, lng: number): string | undefined {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined
  const x = (lng * 0.9612616959383189 - 115.11081980143565) * 817.448349655742 + 40
  const y = (16.443622150000063 - lat) * 817.448349655742 + 40
  return map.areas.find(area => {
    let inside = false
    for (const part of area.d.split('Z').filter(Boolean)) {
      const numbers = (part.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)
      const points: number[][] = []
      for (let i = 0; i < numbers.length; i += 2) points.push([numbers[i], numbers[i + 1]])
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i], b = points[j]
        if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside
      }
    }
    return inside
  })?.id
}
