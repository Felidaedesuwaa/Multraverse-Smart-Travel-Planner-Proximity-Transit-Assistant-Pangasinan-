const assert = require('node:assert/strict')
const { placeSubmissionError } = require('../dist/lib/placeSubmission')
const valid = { name: 'Sual Heritage Park', description: 'A local park.\nOpen to travelers.', location: 'Poblacion, Sual', category: 'Nature Park', openHours: '8:00 AM - 5:00 PM', entryFee: 75.50 }
assert.equal(placeSubmissionError(valid, true), null)
for (const field of ['name', 'description', 'location', 'category']) {
  assert.ok(placeSubmissionError({ ...valid, [field]: '  ' }, true))
}
for (const entryFee of [-1, Infinity, NaN, '50', 1000001, 5.123]) assert.ok(placeSubmissionError({ ...valid, entryFee }, true))
for (const entryFee of [0, 75.50, 1000000, null]) assert.equal(placeSubmissionError({ ...valid, entryFee }, true), null)
assert.ok(placeSubmissionError({ ...valid, description: '<script>alert(1)</script>' }, true))
assert.ok(placeSubmissionError({ ...valid, location: 'a'.repeat(301) }, true))
assert.equal(placeSubmissionError({ entryFee: 50 }, false), null)
assert.equal(placeSubmissionError({ openHours: '' }, false), null)
console.log('PASS required place fields, plain text, multiline descriptions, lengths, fee bounds/precision and partial edits')
