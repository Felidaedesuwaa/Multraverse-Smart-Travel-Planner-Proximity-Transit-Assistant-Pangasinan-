import map from '../data/pangasinanMap.json';
import { boundaryRings, containsLocation, projectLocation } from '../utils/lguMap';

const boundaries = map.areas.map(a => ({ id: a.id, rings: boundaryRings(a.d) }));
export const municipality = c => boundaries.find(a => containsLocation(a.rings, projectLocation({ lat: c.latitude ?? c.lat, lng: c.longitude ?? c.lng })))?.id;
export function distanceMeters(a, b) {
  const rad = x => x * Math.PI / 180;
  const x = Math.sin(rad(b.lat - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.longitude) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
}
export function isArrival(position, target, radius, now = Date.now()) {
  const c = position?.coords;
  return !!c && Number.isFinite(position.timestamp) && now >= position.timestamp && now - position.timestamp < 30000
    && Number.isFinite(c.latitude) && Number.isFinite(c.longitude) && Number.isFinite(c.accuracy)
    && c.accuracy >= 0 && c.accuracy <= Math.min(100, radius / 2)
    && municipality(c) && municipality(target) === target.areaId
    && distanceMeters(c, target) + c.accuracy <= radius;
}
