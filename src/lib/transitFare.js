import policy from '../data/transitFarePolicy.json';

export function estimateTraditionalJeepneyFare(distanceKm) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return null;
  const fare = policy.traditional_jeepney;
  return Math.round((fare.base_fare + Math.max(0, distanceKm - fare.base_distance_km) * fare.succeeding_rate_per_km) * 100) / 100;
}
