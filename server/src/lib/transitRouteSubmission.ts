export function transitRouteSubmissionError(body: Record<string, unknown>, create: boolean): string | null {
  if (create || body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.length > 120 || /[<>\x00-\x1f\x7f]/.test(body.name)) return 'Route name must use plain text and be at most 120 characters.'
    const endpoints = body.name.trim().split(/\s+(?:to|-)\s+/i)
    if (endpoints.length !== 2 || endpoints.some(value => value.trim().length < 2) || endpoints[0].trim().toLowerCase() === endpoints[1].trim().toLowerCase()) return 'Enter both origin and destination, such as Sual to Dagupan.'
  }
  if ((create || body.type !== undefined) && !['BUS', 'JEEPNEY', 'TRICYCLE', 'VAN'].includes(String(body.type))) return 'Select a vehicle type.'
  if (create || body.frequency !== undefined) {
    if (typeof body.frequency !== 'string' || !body.frequency.trim() || body.frequency.length > 120 || /[<>\x00-\x1f\x7f]/.test(body.frequency)) return 'Enter a service frequency using plain text, at most 120 characters.'
  }
  if (body.stops !== undefined && (typeof body.stops !== 'number' || !Number.isInteger(body.stops) || body.stops < 0 || body.stops > 500)) return 'Number of stops must be a whole number between 0 and 500.'
  return null
}
