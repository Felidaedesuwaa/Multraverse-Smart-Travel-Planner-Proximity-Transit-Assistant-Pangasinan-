const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { fareTables } = require('../server/dist/lib/itineraryCosts')
const { validateItinerary } = require('../server/dist/lib/groundedItinerary')
const { itineraryCatalog, tripTypes, activities } = require('../server/dist/data/itineraryCatalog')

async function main() {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/itineraryValidation.js'), 'utf8')
  const { itineraryErrors } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)
  const form = { areaId: 'dagupan', tripTypes: ['Nature'], activities: ['Photography'], travelerType: 'couple', travelStyle: 'balanced', date: today, travelers: 2, budget: '4000', days: 1, lodgingId: null, startTime: '07:00', mealBudget: '300', hotelRooms: 1, transportModes: ['Bus'], preferences: [], returnToOrigin: true, fareInputs: [{ mode: 'Bus', rides: 2, tableId: 'bus-ordinary', km: 10 }] }
  const options = { catalog: itineraryCatalog, hotelRooms: 1, budgetTier: 'standard', today, fareTables }
  assert.deepEqual(itineraryErrors(form, options), {})
  assert.equal(validateItinerary(form).budget, 4000)
  for (const mode of ['Bus', 'Jeepney']) {
    const legacy = { ...form, transportModes: [mode], fareInputs: [{ mode, rides: 2, allowance: 30 }] }
    assert.throws(() => validateItinerary(legacy), /supplied fare matrix/)
    assert.match(itineraryErrors(legacy, options)[`fare-${mode}`], /supplied matrix/)
  }
  const ownVehicle = { ...form, transportModes: ['Own Vehicle'], fareInputs: [{ mode: 'Own Vehicle', rides: 2, allowance: 100 }] }
  assert.deepEqual(itineraryErrors(ownVehicle, options), {})
  assert.equal(validateItinerary(ownVehicle).fareInputs[0].allowance, 100)
  const blank = { ...form, areaId: '', tripTypes: [], activities: [], travelerType: '', travelStyle: '', budget: '', lodgingId: '' }
  const first = itineraryErrors(blank, { ...options, budgetTier: '', step: 1 })
  assert.deepEqual(Object.keys(first).sort(), ['activities', 'areaId', 'travelStyle', 'travelerType', 'tripTypes'])
  const second = itineraryErrors({ ...form, budget: '', lodgingId: '' }, { ...options, budgetTier: '', step: 2 })
  assert(second.budget && second.lodgingId)
  assert(!itineraryErrors({ ...form, lodgingId: null }, { ...options, step: 2 }).lodgingId)
  for (const [key, value, message] of [
    ['tripTypes', [], /at least one/], ['activities', [], /at least one/],
    ['tripTypes', tripTypes.slice(0, 4), /up to 3/], ['activities', activities.slice(0, 4), /up to 3/],
    ['travelerType', '', /traveling with/], ['travelStyle', '', /travel style/],
    ['budget', '', /trip budget/], ['budget', -1, /from 1/],
    ['date', '2000-01-01', /today or a future/], ['date', '2026-02-30', /valid travel date/],
    ['travelers', '', /travelers/], ['travelers', 2.5, /whole number/], ['travelers', 31, /whole number/],
    ['days', 8, /whole number/], ['lodgingId', '', /hotel or select no lodging/],
    ['startTime', '', /start time/], ['startTime', '25:00', /start time/],
    ['mealBudget', '', /meal allowance/], ['mealBudget', 0, /from 1/],
    ['transportModes', [], /at least one/], ['fareInputs', [], /fare or travel allowance/],
    ['fareInputs', [{ ...form.fareInputs[0], rides: '' }], /total rides/],
    ['fareInputs', [{ ...form.fareInputs[0], rides: 2.5 }], /total rides/],
    ['fareInputs', [{ ...form.fareInputs[0], km: -5 }], /distance/],
    ['fareInputs', [{ ...form.fareInputs[0], km: 7 }], /listed distance/],
    ['fareInputs', [{ ...form.fareInputs[0], tableId: 'jeepney' }], /fare table/],
  ]) {
    assert.throws(() => validateItinerary({ ...form, [key]: value }), message, `API must reject ${key}: ${JSON.stringify(value)}`)
    assert(Object.keys(itineraryErrors({ ...form, [key]: value }, options)).length, `UI must reject ${key}: ${JSON.stringify(value)}`)
  }
  const hotel = itineraryCatalog.find(a => a.id === 'dagupan').lodging[0]
  for (const rooms of ['', 0, 1.5, 31]) {
    assert(itineraryErrors({ ...form, days: 2, lodgingId: hotel.id }, { ...options, hotelRooms: rooms }).hotelRooms)
    assert.throws(() => validateItinerary({ ...form, days: 2, lodgingId: hotel.id, hotelRooms: rooms }), /rooms/)
  }
  assert.throws(() => validateItinerary({ ...form, travelers: 1 }), /Couple travel/)
  assert.throws(() => validateItinerary({ ...form, travelerType: 'solo' }), /Solo travel/)
  assert.throws(() => validateItinerary({ ...form, lodgingId: hotel.id }), /day trip/)
  assert.equal(validateItinerary({ ...form, tripTypes: tripTypes.slice(0, 3), activities: activities.slice(0, 3) }).tripTypes.length, 3)
  console.log('PASS: required steps, explicit no-lodging choice, 3-selection limits, valid dates, numeric ranges, group sizes, room counts and travel estimates in UI and API.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
