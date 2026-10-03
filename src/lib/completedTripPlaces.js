import { tripDisplayTitle } from './tripTitle';

export function completedTripPlaces(trips) {
  const plans = new Map();
  for (const trip of trips) {
    if (trip.status !== 'COMPLETED' || !trip.plan) continue;
    const name = tripDisplayTitle(trip).split(' | ').filter(part => !/^\d+ days?$/i.test(part.trim()) && !/^\d{4}-\d{2}-\d{2}$/.test(part.trim()) && !/^[A-Za-z]{3,9} \d{1,2}, \d{4}$/.test(part.trim())).join(' | ').trim();
    if (name && !plans.has(name)) plans.set(name, { name });
  }
  return [...plans.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
