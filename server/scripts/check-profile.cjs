const assert = require('node:assert/strict');
const { profileUpdate, MAX_PHOTO_BYTES } = require('../dist/lib/profile');

assert.deepEqual(profileUpdate({ name: '  Test Traveler  ', location: '  Alaminos  ' }), { name: 'Test Traveler', location: 'Alaminos' });
assert.deepEqual(profileUpdate({ photo: null }), { photo: null });
assert.deepEqual(profileUpdate({ location: '' }), { location: '' });
const avatars = require('../../src/data/profileAvatars.json');
assert.equal(avatars.length, 16);
assert.equal(new Set(avatars.map(avatar => avatar.id)).size, 16);
for (const avatar of avatars) assert.deepEqual(profileUpdate({ photo: avatar.id }), { photo: avatar.id });
for (const photo of ['travel:00', 'travel:17', 'travel:1', 'travel:01\n', 'travel:compass']) assert.throws(() => profileUpdate({ photo }));
for (const body of [null, [], {}, { name: '' }, { name: ' ' }, { name: 123 }, { name: 'x'.repeat(81) }, { location: {} }, { location: 'x'.repeat(121) }, { role: 'ADMIN' }, { email: 'changed@example.com' }, { passwordHash: 'bad' }, { photo: 'https://example.com/picture.jpg' }, { photo: 'data:image/svg+xml;base64,PHN2Zy8+' }, { photo: 'data:image/jpeg;base64,aGVsbG8=' }, { photo: 'x'.repeat(MAX_PHOTO_BYTES * 2) }]) {
  assert.throws(() => profileUpdate(body));
}
console.log('PASS: profile field validation, trimming, explicit photo removal, image size/type checks, and protected account fields.');
