export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function mapScale(camera, size, geometry) {
  return Math.min(size.width / geometry.width, size.height / geometry.height) * camera.zoom;
}

export function constrainCamera(camera, geometry, maxZoom = 32) {
  const zoom = clamp(camera.zoom, 1, maxZoom);
  const halfWidth = geometry.width / (2 * zoom), halfHeight = geometry.height / (2 * zoom);
  return { zoom, x: clamp(camera.x, halfWidth, geometry.width - halfWidth), y: clamp(camera.y, halfHeight, geometry.height - halfHeight) };
}

// Preserve the map point under the fingers as their midpoint and distance change.
export function moveMapCamera(camera, from, to, size, geometry, maxZoom) {
  const zoom = clamp(camera.zoom * (from.distance > 0 && to.distance > 0 ? to.distance / from.distance : 1), 1, maxZoom);
  const before = mapScale(camera, size, geometry), after = mapScale({ zoom }, size, geometry);
  return constrainCamera({ zoom,
    x: camera.x + (from.x - size.width / 2) / before - (to.x - size.width / 2) / after,
    y: camera.y + (from.y - size.height / 2) / before - (to.y - size.height / 2) / after,
  }, geometry, maxZoom);
}
