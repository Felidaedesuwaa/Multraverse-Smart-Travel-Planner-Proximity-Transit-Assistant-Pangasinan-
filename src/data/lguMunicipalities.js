// Single LGU map reference. Centers are geographic bounding-box midpoints, not town halls.
// Derived from the same 2023 Philippines JSON Maps boundaries as pangasinanMap.json.
// Source/license: PANGASINAN_MAP_SOURCES.md and PANGASINAN_MAP_LICENSE.txt.
// Zoom uses the standard 256px tile convention, fitted to a 600 x 300 overview.
export const lguMunicipalities = Object.freeze([
  {"id": "agno", "name": "Agno", "kind": "Municipality", "center": {"lat": 16.098874, "lng": 119.815548}, "defaultZoom": 10},
  {"id": "aguilar", "name": "Aguilar", "kind": "Municipality", "center": {"lat": 15.834152, "lng": 120.212618}, "defaultZoom": 10},
  {"id": "alaminos", "name": "Alaminos", "kind": "City", "center": {"lat": 16.149801, "lng": 119.991937}, "defaultZoom": 10},
  {"id": "alcala", "name": "Alcala", "kind": "Municipality", "center": {"lat": 15.838204, "lng": 120.525301}, "defaultZoom": 12},
  {"id": "anda", "name": "Anda", "kind": "Municipality", "center": {"lat": 16.288098, "lng": 119.971192}, "defaultZoom": 11},
  {"id": "asingan", "name": "Asingan", "kind": "Municipality", "center": {"lat": 15.989788, "lng": 120.661819}, "defaultZoom": 11},
  {"id": "balungao", "name": "Balungao", "kind": "Municipality", "center": {"lat": 15.886805, "lng": 120.697114}, "defaultZoom": 11},
  {"id": "bani", "name": "Bani", "kind": "Municipality", "center": {"lat": 16.211348, "lng": 119.856573}, "defaultZoom": 11},
  {"id": "basista", "name": "Basista", "kind": "Municipality", "center": {"lat": 15.866251, "lng": 120.39995}, "defaultZoom": 12},
  {"id": "bautista", "name": "Bautista", "kind": "Municipality", "center": {"lat": 15.801691, "lng": 120.513805}, "defaultZoom": 12},
  {"id": "bayambang", "name": "Bayambang", "kind": "Municipality", "center": {"lat": 15.787693, "lng": 120.461537}, "defaultZoom": 11},
  {"id": "binalonan", "name": "Binalonan", "kind": "Municipality", "center": {"lat": 16.058295, "lng": 120.594348}, "defaultZoom": 11},
  {"id": "binmaley", "name": "Binmaley", "kind": "Municipality", "center": {"lat": 16.008303, "lng": 120.287775}, "defaultZoom": 11},
  {"id": "bolinao", "name": "Bolinao", "kind": "Municipality", "center": {"lat": 16.338459, "lng": 119.87158}, "defaultZoom": 10},
  {"id": "bugallon", "name": "Bugallon", "kind": "Municipality", "center": {"lat": 15.915003, "lng": 120.180908}, "defaultZoom": 10},
  {"id": "burgos", "name": "Burgos", "kind": "Municipality", "center": {"lat": 16.028723, "lng": 119.83251}, "defaultZoom": 10},
  {"id": "calasiao", "name": "Calasiao", "kind": "Municipality", "center": {"lat": 15.994702, "lng": 120.358919}, "defaultZoom": 11},
  {"id": "dagupan", "name": "Dagupan", "kind": "City", "center": {"lat": 16.060977, "lng": 120.34702}, "defaultZoom": 11},
  {"id": "dasol", "name": "Dasol", "kind": "Municipality", "center": {"lat": 15.948411, "lng": 119.884669}, "defaultZoom": 11},
  {"id": "infanta", "name": "Infanta", "kind": "Municipality", "center": {"lat": 15.866452, "lng": 119.993003}, "defaultZoom": 11},
  {"id": "labrador", "name": "Labrador", "kind": "Municipality", "center": {"lat": 15.994914, "lng": 120.11508}, "defaultZoom": 11},
  {"id": "laoac", "name": "Laoac", "kind": "Municipality", "center": {"lat": 16.042499, "lng": 120.541808}, "defaultZoom": 11},
  {"id": "lingayen", "name": "Lingayen", "kind": "Municipality", "center": {"lat": 15.991712, "lng": 120.21691}, "defaultZoom": 11},
  {"id": "mabini", "name": "Mabini", "kind": "Municipality", "center": {"lat": 16.020156, "lng": 119.98383}, "defaultZoom": 10},
  {"id": "malasiqui", "name": "Malasiqui", "kind": "Municipality", "center": {"lat": 15.90561, "lng": 120.456067}, "defaultZoom": 11},
  {"id": "manaoag", "name": "Manaoag", "kind": "Municipality", "center": {"lat": 16.032569, "lng": 120.504488}, "defaultZoom": 11},
  {"id": "mangaldan", "name": "Mangaldan", "kind": "Municipality", "center": {"lat": 16.063419, "lng": 120.401124}, "defaultZoom": 11},
  {"id": "mangatarem", "name": "Mangatarem", "kind": "Municipality", "center": {"lat": 15.738229, "lng": 120.28323}, "defaultZoom": 10},
  {"id": "mapandan", "name": "Mapandan", "kind": "Municipality", "center": {"lat": 16.017254, "lng": 120.453272}, "defaultZoom": 12},
  {"id": "natividad", "name": "Natividad", "kind": "Municipality", "center": {"lat": 16.055158, "lng": 120.836837}, "defaultZoom": 11},
  {"id": "pozorrubio", "name": "Pozorrubio", "kind": "Municipality", "center": {"lat": 16.1141, "lng": 120.531966}, "defaultZoom": 12},
  {"id": "rosales", "name": "Rosales", "kind": "Municipality", "center": {"lat": 15.873896, "lng": 120.638105}, "defaultZoom": 11},
  {"id": "san-carlos", "name": "San Carlos", "kind": "City", "center": {"lat": 15.901084, "lng": 120.321091}, "defaultZoom": 11},
  {"id": "san-fabian", "name": "San Fabian", "kind": "Municipality", "center": {"lat": 16.147912, "lng": 120.428188}, "defaultZoom": 11},
  {"id": "san-jacinto", "name": "San Jacinto", "kind": "Municipality", "center": {"lat": 16.092233, "lng": 120.456155}, "defaultZoom": 11},
  {"id": "san-manuel", "name": "San Manuel", "kind": "Municipality", "center": {"lat": 16.107785, "lng": 120.668181}, "defaultZoom": 10},
  {"id": "san-nicolas", "name": "San Nicolas", "kind": "Municipality", "center": {"lat": 16.119622, "lng": 120.77797}, "defaultZoom": 11},
  {"id": "san-quintin", "name": "San Quintin", "kind": "Municipality", "center": {"lat": 15.98172, "lng": 120.813554}, "defaultZoom": 11},
  {"id": "santa-barbara", "name": "Santa Barbara", "kind": "Municipality", "center": {"lat": 15.988642, "lng": 120.434853}, "defaultZoom": 11},
  {"id": "santa-maria", "name": "Santa Maria", "kind": "Municipality", "center": {"lat": 15.959756, "lng": 120.698541}, "defaultZoom": 12},
  {"id": "santo-tomas", "name": "Santo Tomas", "kind": "Municipality", "center": {"lat": 15.864352, "lng": 120.576714}, "defaultZoom": 12},
  {"id": "sison", "name": "Sison", "kind": "Municipality", "center": {"lat": 16.162042, "lng": 120.55284}, "defaultZoom": 11},
  {"id": "sual", "name": "Sual", "kind": "Municipality", "center": {"lat": 16.090779, "lng": 120.060286}, "defaultZoom": 11},
  {"id": "tayug", "name": "Tayug", "kind": "Municipality", "center": {"lat": 16.010186, "lng": 120.74329}, "defaultZoom": 12},
  {"id": "umingan", "name": "Umingan", "kind": "Municipality", "center": {"lat": 15.894306, "lng": 120.816223}, "defaultZoom": 10},
  {"id": "urbiztondo", "name": "Urbiztondo", "kind": "Municipality", "center": {"lat": 15.823191, "lng": 120.348775}, "defaultZoom": 12},
  {"id": "urdaneta", "name": "Urdaneta", "kind": "City", "center": {"lat": 15.975054, "lng": 120.560779}, "defaultZoom": 11},
  {"id": "villasis", "name": "Villasis", "kind": "Municipality", "center": {"lat": 15.900485, "lng": 120.574244}, "defaultZoom": 11},
].map(area => Object.freeze({ ...area, center: Object.freeze(area.center) })))

const normalize = value => typeof value === 'string' ? value.trim().toLowerCase().replace(/^city of\s+/, '').replace(/\s+city$/, '').replace(/[\s-]+/g, ' ') : ''
const byName = new Map(lguMunicipalities.map(area => [normalize(area.name), area]))

// An invalid/missing account scope must never silently fall back to another LGU.
export const getLGUMunicipality = value => byName.get(normalize(value)) || null

// Projection must match scripts/build-pangasinan-map.cjs and the bundled SVG.
const projection = { minX: 115.11081980143565, minY: -16.443622150000063, scale: 817.448349655742, cos: 0.9612616959383189 }
export function getLGUMapViewport(municipality, zoom = municipality.defaultZoom) {
  const { center } = municipality
  const x = 40 + (center.lng * projection.cos - projection.minX) * projection.scale
  const y = 40 + (-center.lat - projection.minY) * projection.scale
  const unitsPerPixel = projection.scale * projection.cos * 360 / (256 * 2 ** zoom)
  const width = 600 * unitsPerPixel
  const height = 300 * unitsPerPixel
  return `${x - width / 2} ${y - height / 2} ${width} ${height}`
}
