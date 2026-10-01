// Offline: validates the real planner and guide import without database writes.
require('ts-node/register')
const assert = require('node:assert/strict')
const { cityGuides, cityGuidePlaces, cityGuideFoods } = require('../src/lib/cityGuides')
const { buildPlan } = require('../src/lib/planner')

async function main() {
  const guide = cityGuides.find(g => g.area_id === 'dagupan')
  assert.deepEqual(cityGuides.map(g => g.area_id).sort(), ['alaminos', 'bolinao', 'dagupan', 'lingayen', 'manaoag', 'san-carlos', 'urdaneta'])
  const places = guide.attractions.map((a, index) => ({ _id: (index + 1).toString(16).padStart(24, '0'),
    name: index === 0 ? 'Tondaligan Beach' : a.name, municipality: 'Dagupan', location: 'Dagupan',
    category: 'Old category', description: 'Old source description' }))
  const hotel = { _id: 'a'.repeat(24), name: 'Star Plaza Hotel', municipality: 'Dagupan' }
  const unrelated = { _id: 'b'.repeat(24), name: 'Tondol Beach', municipality: 'Anda' }
  const projected = cityGuidePlaces([...places, hotel, unrelated])
  assert.equal(projected.length, 10)
  assert.ok(projected.includes(unrelated))
  assert.ok(!projected.some(p => p.name === hotel.name))
  assert.equal(projected[0]._id, places[0]._id, 'Existing ID must survive alias matching')
  assert.equal(projected[0].description, guide.attractions[0].description)
  const foods = cityGuideFoods([{ name: 'Old food', where: 'Dagupan', avgPrice: 999 }], ['dagupan'])
  assert.equal(foods.length, 6)
  assert.ok(foods.every(f => f.avgPrice === null))
  const request = { origin: { areaId: 'dagupan' }, destinations: [{ areaId: 'dagupan', placeIds: [] }],
    dates: { start: '2027-01-04' }, startTime: '08:00', days: 1, budget: 2000, travelers: 1,
    preferences: [], transportModes: ['bus'], pace: 'balanced', lodging: { preference: 'none', nightlyBudget: 0, rooms: 1 },
    foodPerPersonPerDay: 100, useSavedPlaces: false, returnToOrigin: false, excludedPlaceIds: [] }
  const plan = buildPlan(request, { places: projected, foods, fares: [], routes: [], saved: [], geofences: [] })
  assert.equal(plan.days[0].stops.length, 3)
  for (const stop of plan.days[0].stops) {
    assert.equal(stop.areaId, 'dagupan')
    assert.ok(guide.attractions.some(a => a.name === stop.place))
    assert.ok(stop.notes.some(note => note.includes('Dagupan_City_Tourism_Guide.pdf')))
    assert.equal(stop.entryCost, null)
    assert.notEqual(stop.activity, 'Old source description')
  }
  assert.equal(plan.localFoods.length, 6)
  assert.equal(plan.costs.complete, false)
  const alaminos = cityGuides.find(g => g.area_id === 'alaminos')
  const islandPlaces = cityGuidePlaces(alaminos.attractions.map((a, index) => ({
    _id: (index + 100).toString(16).padStart(24, '0'), name: a.aliases[0] || a.name,
    municipality: 'Alaminos', location: 'Alaminos', description: 'Old source', entryFee: null,
  })))
  assert.equal(islandPlaces.length, 8)
  const islandPlan = buildPlan({ ...request, origin: { areaId: 'alaminos' },
    destinations: [{ areaId: 'alaminos', placeIds: [] }], days: 2 },
    { places: islandPlaces, foods: cityGuideFoods([], ['alaminos']), fares: [], routes: [], saved: [], geofences: [] })
  assert.equal(islandPlan.days[0].stops[0].place, 'Lucap Wharf & Lucap Baywalk')
  for (const stop of islandPlan.days.flatMap(d => d.stops)) {
    assert.equal(stop.areaId, 'alaminos')
    assert.equal(stop.entryCost, null)
    assert.equal(stop.transit.cost, null)
    assert.ok(stop.notes.some(note => note.includes('2026-09') && note.includes('reference only')))
  }
  assert.equal(islandPlan.localFoods.length, 4)
  assert.equal(islandPlan.fareGuide.length, 0, 'Historical boat rates must not become verified route fares')
  assert.equal(islandPlan.costs.complete, false)
  const urdaneta = cityGuides.find(g => g.area_id === 'urdaneta')
  const inland = cityGuidePlaces(urdaneta.attractions.map((a, index) => ({
    _id: (index + 200).toString(16).padStart(24, '0'), name: a.aliases[0] || a.name,
    municipality: 'Urdaneta', location: 'Urdaneta', entryFee: null,
  })))
  assert.equal(inland.length, 11)
  const inlandPlan = buildPlan({ ...request, origin: { areaId: 'urdaneta' },
    destinations: [{ areaId: 'urdaneta', placeIds: [] }] },
    { places: inland, foods: cityGuideFoods([], ['urdaneta']), fares: [], routes: [], saved: [], geofences: [] })
  assert.equal(inlandPlan.days[0].stops[0].place, 'Urdaneta City Public Market')
  assert.equal(cityGuideFoods([], ['urdaneta']).length, 10)
  for (const stop of inlandPlan.days[0].stops) {
    assert.equal(stop.areaId, 'urdaneta')
    assert.equal(stop.entryCost, null)
    assert.ok(stop.notes.some(n => n.includes('permission') && n.includes('Publication date not stated')))
  }
  console.log('PASS: Urdaneta selection, aliases, unknown date/costs and farmland access guidance.')
  const sanCarlos = cityGuides.find(g => g.area_id === 'san-carlos')
  const scPlaces = cityGuidePlaces([...sanCarlos.attractions.map((a, index) => ({
    _id: (index + 300).toString(16).padStart(24, '0'), name: a.aliases[0] || a.name,
    municipality: 'San Carlos', location: 'San Carlos', entryFee: null,
  })), { name: 'Kabaleyan Cove Resort', municipality: 'San Carlos' }])
  assert.equal(scPlaces.length, 9)
  const scPlan = buildPlan({ ...request, origin: { areaId: 'san-carlos' },
    destinations: [{ areaId: 'san-carlos', placeIds: [] }] },
    { places: scPlaces, foods: cityGuideFoods([], ['san-carlos']), fares: [], routes: [], saved: [], geofences: [] })
  assert.equal(scPlan.days[0].stops[0].place, 'City Plaza')
  assert.equal(scPlan.localFoods.length, 6)
  for (const stop of scPlan.days[0].stops) {
    assert.equal(stop.areaId, 'san-carlos')
    assert.equal(stop.entryCost, null)
    assert.ok(stop.notes.some(n => n.includes('San_Carlos_City_Tourism_Guide.pdf') && n.includes('permission')))
  }
  console.log('PASS: San Carlos guide priority, city-only attractions, local food and access notes.')
  for (const [areaId, count, foodCount] of [['bolinao', 9, 5], ['manaoag', 9, 6], ['lingayen', 12, 6]]) {
    const municipal = cityGuides.find(g => g.area_id === areaId)
    const candidates = municipal.attractions.map((a, i) => ({ _id: (i + 400).toString(16).padStart(24, '0'),
      name: a.aliases[0] || a.name, municipality: municipal.name, location: municipal.name, entryFee: null }))
    const projected = cityGuidePlaces([...candidates, { name: municipal.hotels[0].name, municipality: municipal.name }])
    assert.equal(projected.length, count)
    assert.equal(projected[0]._id, candidates[0]._id)
    const municipalPlan = buildPlan({ ...request, origin: { areaId }, destinations: [{ areaId, placeIds: [] }] },
      { places: projected, foods: cityGuideFoods([], [areaId]), fares: [], routes: [], saved: [], geofences: [] })
    assert.equal(municipalPlan.days[0].stops[0].place, municipal.itinerary_attraction_order[0])
    assert.equal(municipalPlan.localFoods.length, foodCount)
    for (const stop of municipalPlan.days[0].stops) {
      assert.equal(stop.areaId, areaId)
      assert.equal(stop.entryCost, null)
      assert.ok(stop.notes.some(n => n.includes(municipal.source_file) && n.includes(municipal.access_note)))
    }
  }
  console.log('PASS: Bolinao, Manaoag and Lingayen guide priority, aliases, food and source access notes.')
  console.log('PASS: city-only Dagupan planner, PDF descriptions/provenance, preserved IDs, unknown costs, food selection and unchanged other LGUs.')
  console.log('PASS: Alaminos guide priority, source month, city-only stops and reference rates excluded from verified costs.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
