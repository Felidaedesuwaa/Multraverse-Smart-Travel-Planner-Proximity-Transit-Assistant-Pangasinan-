import areas from '../data/plannerAreas.json'

// Backend's existing 48-area catalog is also the authority for account scopes.
// scripts/check-lgu-municipalities.cjs verifies parity with the frontend reference.
export const lguMunicipalityNames = areas.map(area => area.name)
export const isLGUMunicipality = (value: unknown): value is string => typeof value === 'string' && lguMunicipalityNames.includes(value)
export function normalizeLGUMunicipality(value: unknown) {
  if (typeof value !== 'string') return value
  const normalized = value.trim().replace(/^city of\s+/i, '').replace(/\s+city$/i, '').replace(/-/g, ' ')
  return lguMunicipalityNames.find(name => name.toLowerCase() === normalized.toLowerCase()) || value.trim()
}
