import { isArrival } from './transitGeometry';

// Explicitly simulated coordinates, never published or saved as route data.
export const TEST_STOP = { name: 'Demo stop (simulation only)', lat: 16.043, lng: 120.334, areaId: 'dagupan' };
export function testPosition(arrived, radius, timestamp = Date.now()) {
  return { timestamp, coords: { latitude: TEST_STOP.lat + (arrived ? 0 : (radius + 1000) / 111000), longitude: TEST_STOP.lng, accuracy: 5 } };
}
export const testHasArrived = (arrived, radius) => isArrival(testPosition(arrived, radius), TEST_STOP, radius);
