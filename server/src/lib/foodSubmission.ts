export function foodSubmissionError(body: Record<string, unknown>, create: boolean): string | null {
  for (const [field, label, max] of [
    ['name', 'Food name', 120], ['description', 'Description', 2000],
    ['where', 'Where to find it', 300], ['category', 'Category', 120],
  ] as const) {
    const value = body[field]
    if (value === undefined && !create) continue
    if (typeof value !== 'string' || !value.trim()) return `${label} is required.`
    if (value.trim().length > max) return `${label} must be at most ${max} characters.`
    if (field === 'name' && value.trim().length < 2) return 'Food name must contain at least 2 characters.'
    if (/[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) return `${label} must contain plain text without markup or control characters.`
  }
  const price = body.avgPrice
  if (price === undefined && !create) return null
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0 || price > 1000000 || Math.abs(price * 100 - Math.round(price * 100)) > 0.000001) return 'Average price must be between PHP 0 and PHP 1,000,000, with up to 2 decimal places.'
  return null
}
