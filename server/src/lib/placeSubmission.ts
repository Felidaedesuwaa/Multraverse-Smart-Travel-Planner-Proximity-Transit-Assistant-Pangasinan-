export function placeSubmissionError(body: Record<string, unknown>, create: boolean): string | null {
  for (const [field, label, max] of [
    ['name', 'Place name', 120], ['description', 'Description', 2000],
    ['location', 'Address', 300], ['category', 'Category', 120], ['openHours', 'Opening hours', 120],
  ] as const) {
    const value = body[field]
    if (value === undefined && !create) continue
    const required = field !== 'openHours'
    if (value === undefined && !required) continue
    if (typeof value !== 'string' || (required && !value.trim())) return `${label} is required.`
    if (value.trim().length > max) return `${label} must be at most ${max} characters.`
    if (field === 'name' && value.trim().length < 2) return 'Place name must contain at least 2 characters.'
    if (/[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) return `${label} must contain plain text without markup or control characters.`
  }
  const fee = body.entryFee
  if (fee !== undefined && fee !== null && (typeof fee !== 'number' || !Number.isFinite(fee) || fee < 0 || fee > 1000000 || Math.abs(fee * 100 - Math.round(fee * 100)) > 0.000001)) return 'Entry fee must be between PHP 0 and PHP 1,000,000, with up to 2 decimal places.'
  return null
}
