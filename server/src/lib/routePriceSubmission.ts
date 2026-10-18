export function routePriceSubmissionError(body: Record<string, unknown>, create: boolean): string | null {
  for (const [field, label, max] of [
    ['from', 'Origin', 120], ['to', 'Destination', 120], ['vehicle', 'Vehicle', 60], ['duration', 'Duration', 120],
  ] as const) {
    const value = body[field]
    if (value === undefined && !create) continue
    if (typeof value !== 'string' || value.trim().length < 2 || value.trim().length > max) return `${label} must contain 2 to ${max} characters.`
    if (/[<>\x00-\x1f\x7f]/.test(value)) return `${label} must contain plain text without markup or control characters.`
  }
  if (typeof body.from === 'string' && typeof body.to === 'string' && body.from.trim().toLowerCase() === body.to.trim().toLowerCase()) return 'Origin and destination must be different.'
  if (body.duration !== undefined) {
    const duration = String(body.duration).trim().match(/^(?:(\d+)\s*(?:hours?|hrs?|h)\s*)?(?:(\d+)\s*(?:minutes?|mins?|m))?$/i)
    const minutes = duration ? Number(duration[1] || 0) * 60 + Number(duration[2] || 0) : 0
    if (minutes < 1 || minutes > 1440) return 'Enter a duration from 1 minute to 24 hours, such as 30 min or 1 hour 15 min.'
  }
  const price = body.price
  if (price === undefined && !create) return null
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0 || price > 1000000 || Math.abs(price * 100 - Math.round(price * 100)) > 0.000001) return 'Fare must be between PHP 0 and PHP 1,000,000, with up to 2 decimal places.'
  return null
}
