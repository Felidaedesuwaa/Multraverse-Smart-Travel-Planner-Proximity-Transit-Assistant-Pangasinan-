const assert = require('node:assert/strict');
const { automaticItineraryInput } = require('../dist/lib/automaticItinerary');
const { itineraryCatalog, transportModes } = require('../dist/data/itineraryCatalog');
const { validateItinerary, buildGroundedItinerary } = require('../dist/lib/groundedItinerary');
for (const area of itineraryCatalog) {
  for (const transportMode of transportModes) {
    for (const travelers of [1, 2, 30]) {
      const request = automaticItineraryInput({ areaId: area.id, travelers, transportMode });
      assert.deepEqual(validateItinerary(request), request);
      const plan = buildGroundedItinerary(request, new Set());
      assert.equal(plan.request.travelers, travelers);
      assert.equal(plan.request.budget, 2000 * travelers);
      assert.ok(plan.stops.every(stop => !stop.entryId || area.entries.some(entry => entry.id === stop.entryId)));
    }
  }
}
for (const invalid of [null, {}, { areaId: 'outside' }, ...[0, 31, 1.5, '2', true].map(travelers => ({ areaId: itineraryCatalog[0].id, travelers, transportMode: 'Bus' })), { areaId: itineraryCatalog[0].id, travelers: 2, transportMode: 'Plane' }, { areaId: itineraryCatalog[0].id, travelers: 2, transportMode: 'Bus', budget: 1 }]) {
  assert.throws(() => automaticItineraryInput(invalid));
}
console.log('Automatic planner: all areas, transport modes, group sizes, catalog grounding and invalid inputs passed.');
