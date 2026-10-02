const assert = require('node:assert/strict')
const fs = require('node:fs')
;(async () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/utils/lguMap.js'), 'utf8')
  const { boundaryRings, boundaryBounds, fitZoom, projectLocation, containsLocation, constrainCenter } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
  const geometry = require('../src/data/pangasinanMap.json')
  for (const area of geometry.areas) {
    const rings = boundaryRings(area.d), bounds = boundaryBounds(rings)
    assert.ok(rings.flat().every(p => p.every(Number.isFinite)), area.name)
    for (const width of [320, 600, 1200]) {
      const zoom = fitZoom(bounds, width, 300), scale = 256 * 2 ** zoom
      assert.ok((bounds.right - bounds.left) * scale <= width, `${area.name} fits width`)
      assert.ok((bounds.bottom - bounds.top) * scale <= 300, `${area.name} fits height`)
    }
    assert.deepEqual(constrainCenter([-1, -1], bounds), [bounds.left, bounds.top])
    assert.deepEqual(constrainCenter([2, 2], bounds), [bounds.right, bounds.bottom])
    assert.equal(containsLocation(rings, projectLocation({ lat: 14.5995, lng: 120.9842 })), false, `${area.name} rejects Manila GPS`)
  }
  const dagupan = boundaryRings(geometry.areas.find(area => area.id === 'dagupan').d)
  assert.equal(containsLocation(dagupan, projectLocation({ lat: 16.043, lng: 120.334 })), true, 'Dagupan city center accepts GPS')
  assert.equal(containsLocation(dagupan, projectLocation({ lat: 16.155, lng: 119.98 })), false, 'Dagupan rejects Alaminos GPS')
  const square = [[[0, 0], [1, 0], [1, 1], [0, 1]]]
  assert.equal(containsLocation(square, [0.5, 0.5]), true)
  assert.equal(containsLocation([...square, [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]]], [0.5, 0.5]), false, 'Polygon holes exclude GPS')
  console.log('PASS all 48 Mercator boundaries, responsive fit, pan limits, GPS scope and polygon holes')
})().catch(error => { console.error(error); process.exitCode = 1 })
