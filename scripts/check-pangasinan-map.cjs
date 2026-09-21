const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const geometry = require('../src/data/pangasinanMap.json');
const photos = require('../src/data/pangasinanPhotos.json');

(async () => {
  const { placesForArea, summarizeRatings } = await import('../src/utils/mapPlaces.js');
  assert.equal(geometry.areas.length, 48);
  assert.equal(new Set(geometry.areas.map(area => area.id)).size, 48);
  for (const area of geometry.areas) {
    assert.ok(area.d.startsWith('M') && area.d.endsWith('Z'), area.id);
    assert.ok(area.center[0] >= 0 && area.center[0] <= geometry.width, area.id);
    assert.ok(area.center[1] >= 0 && area.center[1] <= geometry.height, area.id);
    assert.ok(photos[area.id].length >= 2, `${area.id} needs at least two photos`);
    assert.equal(new Set(photos[area.id].map(photo => photo.source)).size, photos[area.id].length, `Duplicate photo in ${area.id}`);
    for (const photo of photos[area.id]) {
      assert.ok(photo.credit && photo.license && photo.source.startsWith('https://commons.wikimedia.org/'));
    }
  }
  const records = [
    { id: 'a', name: 'Hundred Islands National Park', rating: 4 },
    { id: 'b', name: 'Alaminos waterfront', rating: 5 },
    { id: 'b', name: 'Alaminos waterfront', rating: 5 },
    { id: 'c', name: 'Alaminos museum', rating: 0 },
    { id: 'd', name: 'Bolinao beach', rating: 1 },
    { id: 'e', name: 'Alaminos invalid', rating: 6 },
  ];
  assert.deepEqual(summarizeRatings(placesForArea({ id: 'alaminos', name: 'Alaminos' }, records)), { average: 4.5, count: 2 });
  assert.deepEqual(summarizeRatings([]), { average: null, count: 0 });
  assert.equal(placesForArea({ id: 'anda', name: 'Anda' }, [{ name: 'Mapandan' }]).length, 0);
  const assets = fs.readFileSync(path.join(__dirname, '../src/data/pangasinanPhotoAssets.js'), 'utf8');
  for (const photo of Object.values(photos).flat()) assert.ok(assets.includes(JSON.stringify(photo.uri)), `Unbundled photo: ${photo.title}`);
  for (const match of assets.matchAll(/require\('([^']+)'\)/g)) assert.ok(fs.existsSync(path.resolve(__dirname, '../src/data', match[1])), `Missing image: ${match[1]}`);
  console.log('PASS: 48 regions; unique credited carousel photos; bundled assets; area matching; deduplicated ratings and unrated states.');
})().catch(error => { console.error(error); process.exitCode = 1; });
