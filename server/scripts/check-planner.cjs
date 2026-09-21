const assert = require('node:assert/strict');
const { buildPlan, validateRequest, transit, distance } = require('../dist/lib/planner');
const areas = require('../src/data/plannerAreas.json');
const mapAreas = require('../../src/data/pangasinanMap.json').areas;
assert.deepEqual(areas.map(a => a.id), mapAreas.map(a => a.id));
assert.equal(areas.length, 48);
const id = n => String(n).padStart(24, '0');
const request = () => ({ origin: { areaId: 'dagupan' }, destinations: [{ areaId: 'alaminos', placeIds: [] }, { areaId: 'bolinao', placeIds: [] }], dates: { start: '2027-01-04' }, startTime: '08:00', days: 2, budget: 5000, travelers: 3, preferences: [], transportModes: ['bus'], pace: 'balanced', lodging: { preference: 'budget', nightlyBudget: 800, rooms: 1 }, foodPerPersonPerDay: 200, useSavedPlaces: true, returnToOrigin: false, excludedPlaceIds: [] });
const places = [
  { _id: id(1), name: 'Fixture A', municipality: 'Alaminos', location: 'A', description: 'A database description.', entryFee: 100, verifiedAt: '2026-09-01', visitMinutes: 60, coordinates: { lat: 16.1, lng: 120 }, accessibility: 'verified' },
  { _id: id(2), name: 'Fixture B', municipality: 'Bolinao', location: 'B', description: 'Another database description.', entryFee: null, visitMinutes: 60 },
];
const fares = [
  { _id: id(10), fromAreaId: 'dagupan', toAreaId: 'alaminos', transitRouteId: id(20), vehicle: 'bus', price: 100, fareBasis: 'person', durationMinutes: 60, verifiedAt: '2026-09-01' },
  { _id: id(11), fromAreaId: 'alaminos', toAreaId: 'bolinao', transitRouteId: id(21), vehicle: 'bus', price: 200, fareBasis: 'vehicle', capacity: 2, durationMinutes: 60, verifiedAt: '2026-09-01' },
];
const routes = fares.map(f => ({ _id: f.transitRouteId, status: 'ACTIVE', areaIds: [f.fromAreaId, f.toAreaId] }));
const data = { places, fares, routes, foods: [], saved: [], geofences: [] };
validateRequest(request());
for (const change of [{ budget: NaN }, { budget: -1 }, { travelers: 1.5 }, { days: 8 }, { dates: { start: '2027-02-30' } }, { startTime: '25:00' }, { transportModes: ['teleport'] }, { preferences: ['invent'] }, { destinations: [] }, { origin: { areaId: 'outside' } }]) assert.throws(() => validateRequest({ ...request(), ...change }));
assert.throws(() => validateRequest(null));
assert.throws(() => validateRequest({ ...request(), destinations: [{ areaId: 'alaminos', placeIds: [] }, { areaId: 'alaminos', placeIds: [] }] }));
const plan = buildPlan(request(), data);
assert.deepEqual(plan.days.flatMap(d => d.stops).map(s => s.placeId), [id(1), id(2)]);
assert.deepEqual(plan.costs.categories, { food: 1200, lodging: 800, entry: 300, transport: 700 });
assert.equal(plan.costs.knownTotal, 3000);
assert.equal(plan.costs.status, 'incomplete');
assert.equal(plan.days.flatMap(d => d.stops)[1].entryCost, null);
assert.equal(transit('dagupan', 'bolinao', request(), data).steps.length, 2);
assert.equal(transit('bolinao', 'dagupan', request(), data).cost, null, 'Do not infer reverse service');
assert.equal(transit('dagupan', 'bolinao', request(), { ...data, routes: [] }).cost, null);
assert.equal(transit('dagupan', 'alaminos', { ...request(), transportModes: ['van'] }, data).cost, null);
assert.equal(buildPlan({ ...request(), budget: 100 }, data).costs.status, 'over-budget');
assert.equal(buildPlan({ ...request(), budget: 2200 }, data).days.flatMap(d => d.stops).length, 0);
const accessible = buildPlan({ ...request(), preferences: ['Accessible routes'] }, data);
assert.deepEqual(accessible.days.flatMap(d => d.stops).map(s => s.placeId), [id(1)]);
assert.equal(buildPlan({ ...request(), destinations: [{ areaId: 'anda', placeIds: [] }] }, data).costs.status, 'empty');
assert.throws(() => buildPlan({ ...request(), destinations: [{ areaId: 'alaminos', placeIds: [id(2)] }] }, data));
const durationData = { ...data, places: [{ ...places[0], _id: id(0), visitMinutes: 800 }, ...places] };
assert.ok(buildPlan(request(), durationData).days.flatMap(d => d.stops).length > 0);
const excluded = buildPlan({ ...request(), excludedPlaceIds: [id(1)] }, data);
assert.ok(!excluded.days.flatMap(d => d.stops).some(s => s.placeId === id(1)));
assert.ok(distance({ lat: 16, lng: 120 }, { lat: 16, lng: 120.1 }) > 10);
console.log('PASS: 48-area coverage, validation, group/vehicle cost math, multi-hop directed transit, unknown costs, budget overruns, accessibility, exclusions and database-only fallback.');

const simpleRequest = { ...request(), days: 1, destinations: [{ areaId: 'bolinao', placeIds: [id(2)] }], preferences: [] };
const simple = buildPlan(simpleRequest, { ...data, fares: [
  ...fares,
  { _id: id(30), from: 'Dagupan', to: 'Bolinao', vehicle: 'Bus', price: 130, duration: '3 hours' },
  { _id: id(31), from: 'Dagupan', to: 'Manaoag', vehicle: 'Bus', price: 50, duration: '1 hour' },
], foods: [
  { name: 'Seafood', description: 'Fixture food', where: 'Bolinao restaurants', avgPrice: 250 },
  { name: 'Other-town food', where: 'Manaoag', avgPrice: 40 },
] });
assert.deepEqual(simple.days.flatMap(day => day.stops).map(stop => stop.placeId), [id(2)], 'Only chosen attractions are scheduled');
assert.deepEqual(simple.localFoods.map(food => food.name), ['Seafood'], 'Relevant food is included even without a preference toggle');
assert.equal(simple.localFoods[0].listedAveragePrice, 250);
assert.equal(simple.fareGuide.find(fare => fare.sourceId === id(30)).price, 130);
assert.ok(!simple.fareGuide.some(fare => fare.sourceId === id(31)));
assert.equal(simple.fareGuide.find(fare => fare.sourceId === id(30)).basis, 'unspecified');
assert.equal(Object.values(simple.allocation).reduce((sum, amount) => sum + amount, 0), simpleRequest.budget);
console.log('PASS: chosen places only, automatic local food, legacy fare guide with explicit price basis, and balanced suggested allocations.');
