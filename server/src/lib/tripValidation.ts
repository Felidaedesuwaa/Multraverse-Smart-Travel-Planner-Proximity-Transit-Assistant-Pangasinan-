export function tripFieldErrors(body: Record<string, unknown>, create = true) {
  const errors: Record<string, string> = {}
  for (const [key, label, max] of [['title', 'Trip title', 100], ['location', 'Destination', 120]] as const) {
    if (!create && !(key in body)) continue
    const value = body[key]
    if (typeof value !== 'string' || value.trim().length < 2 || value.trim().length > max ||
      !/\p{L}/u.test(value) || /[<>\x00-\x1f\x7f]/.test(value)) errors[key] = `${label} must contain letters and be 2 to ${max} characters, without markup.`
  }
  if (create || 'date' in body) {
    const value = body.date
    const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null
    if (!date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || (value as string) < '1900-01-01' || (value as string) > '2100-12-31') errors.date = 'Enter a real date in YYYY-MM-DD format, for example 2027-01-15.'
  }
  if ('budget' in body && (typeof body.budget !== 'number' || !Number.isFinite(body.budget) || body.budget < 0 || body.budget > 1000000)) errors.budget = 'Budget must be between PHP 0 and PHP 1,000,000 (or its equivalent).'
  return errors
}
