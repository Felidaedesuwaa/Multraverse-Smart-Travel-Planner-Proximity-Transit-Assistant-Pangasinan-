export function aiServiceHeaders(): Record<string, string> {
  const token = process.env.AI_SERVICE_TOKEN
  return { 'Content-Type': 'application/json', ...(token ? { 'X-Service-Token': token } : {}) }
}
