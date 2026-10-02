// Recover geographic coordinates from the bundled SVG, then use Web Mercator tiles.
export function projectLocation({ lat, lng }) {
  const r = lat * Math.PI / 180
  return [(lng + 180) / 360, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2]
}
export function boundaryRings(path) {
  return path.split('Z').filter(Boolean).map(ring => {
    const n = ring.match(/-?\d+(?:\.\d+)?/g).map(Number), points = []
    for (let i = 0; i < n.length; i += 2) points.push(projectLocation({ lng: ((n[i] - 40) / 817.448349655742 + 115.11081980143565) / 0.9612616959383189, lat: -((n[i + 1] - 40) / 817.448349655742 - 16.443622150000063) }))
    return points
  })
}
export function boundaryBounds(rings) {
  const points = rings.flat()
  return { left: Math.min(...points.map(p => p[0])), right: Math.max(...points.map(p => p[0])), top: Math.min(...points.map(p => p[1])), bottom: Math.max(...points.map(p => p[1])) }
}
export function containsLocation(rings, point) {
  let inside = false
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j]
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside
  }
  return inside
}
export function fitZoom(bounds, width, height) {
  return Math.min(18, Math.max(8, Math.floor(Math.log2(Math.min(width / (bounds.right - bounds.left), height / (bounds.bottom - bounds.top)) / (256 * 1.15)))))
}
export function constrainCenter(point, bounds) {
  return [Math.max(bounds.left, Math.min(bounds.right, point[0])), Math.max(bounds.top, Math.min(bounds.bottom, point[1]))]
}
