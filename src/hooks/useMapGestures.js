import { useCallback, useMemo, useRef } from 'react';
import { PanResponder, Platform } from 'react-native';
import { constrainCamera, mapScale, moveMapCamera } from '../utils/mapCamera';

export default function useMapGestures({ camera, setCamera, size, geometry, maxZoom = 32, onTap }) {
  const latest = useRef(null), session = useRef(null), surface = useRef(null), cleanup = useRef(null);
  const dragging = useRef(false);
  latest.current = { camera, setCamera, size, geometry, maxZoom, onTap };
  const update = next => {
    latest.current.camera = next;
    latest.current.setCamera(next);
  };
  const sample = (event, state = {}) => {
    const native = event.nativeEvent;
    const touches = native.touches?.length ? Array.from(native.touches) : [native];
    const first = touches[0], second = touches[1];
    const pageX = first.pageX ?? state.moveX ?? 0, pageY = first.pageY ?? state.moveY ?? 0;
    const origin = session.current?.origin || {
      x: pageX - (native.locationX ?? latest.current.size.width / 2),
      y: pageY - (native.locationY ?? latest.current.size.height / 2),
    };
    const centerX = second ? (pageX + second.pageX) / 2 : pageX;
    const centerY = second ? (pageY + second.pageY) / 2 : pageY;
    return { x: centerX - origin.x, y: centerY - origin.y, count: touches.length,
      distance: second ? Math.hypot(pageX - second.pageX, pageY - second.pageY) : 0, origin };
  };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: event => !!latest.current.onTap || event.nativeEvent.touches?.length > 1,
    onMoveShouldSetPanResponder: (event, state) => event.nativeEvent.touches?.length > 1 || Math.hypot(state.dx, state.dy) > 4,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event, state) => {
      const rect = surface.current?.getBoundingClientRect?.();
      session.current = rect ? { origin: { x: rect.left + window.scrollX, y: rect.top + window.scrollY } } : null;
      const point = sample(event, state);
      session.current = { origin: point.origin, point, camera: latest.current.camera, moved: point.count > 1 || Math.hypot(state?.dx || 0, state?.dy || 0) > 4 };
      // Native SVG children can report target-relative coordinates. Measure the
      // containing surface to anchor the gesture in the same space as the map.
      const captured = session.current;
      if (Platform.OS !== 'web') surface.current?.measureInWindow?.((x, y) => {
        if (session.current !== captured) return;
        captured.point = { ...captured.point, x: captured.point.x + captured.origin.x - x, y: captured.point.y + captured.origin.y - y };
        captured.origin = { x, y };
      });
      dragging.current = session.current.moved;
    },
    onPanResponderMove: (event, state) => {
      const start = session.current;
      if (!start) return;
      const point = sample(event, state);
      if (point.count > 1 || Math.hypot(state.dx, state.dy) > 4) { start.moved = true; dragging.current = true; }
      if (start.point.count !== point.count) { start.point = point; start.camera = latest.current.camera; return; }
      const { size: frame, geometry: bounds, maxZoom: limit } = latest.current;
      update(moveMapCamera(start.camera, start.point, point, frame, bounds, limit));
    },
    onPanResponderRelease: () => {
      const start = session.current;
      if (start && !start.moved && latest.current.onTap) {
        const { camera: current, size: frame, geometry: bounds } = latest.current;
        const scale = mapScale(current, frame, bounds);
        latest.current.onTap({ x: current.x + (start.point.x - frame.width / 2) / scale, y: current.y + (start.point.y - frame.height / 2) / scale });
      }
      session.current = null;
      // SVG clicks can arrive just after the responder release on the web.
      setTimeout(() => { if (!session.current) dragging.current = false; }, 80);
    },
    onPanResponderTerminate: () => { session.current = null; dragging.current = false; },
  }), []);
  const surfaceRef = useCallback(node => {
    cleanup.current?.(); surface.current = node;
    if (Platform.OS !== 'web' || !node?.addEventListener) return;
    const wheel = event => {
      event.preventDefault();
      const current = latest.current, rect = node.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top, distance: 1 };
      const next = { ...point, distance: Math.exp(-event.deltaY * 0.002) };
      update(moveMapCamera(current.camera, point, next, current.size, current.geometry, current.maxZoom));
    };
    const keydown = event => {
      const current = latest.current;
      const scale = mapScale(current.camera, current.size, current.geometry);
      const directions = { ArrowLeft: [-40, 0], ArrowRight: [40, 0], ArrowUp: [0, -40], ArrowDown: [0, 40] };
      if (directions[event.key]) {
        event.preventDefault();
        const [dx, dy] = directions[event.key];
        update(constrainCamera({ ...current.camera, x: current.camera.x + dx / scale, y: current.camera.y + dy / scale }, current.geometry, current.maxZoom));
      } else if (['+', '=', '-', '0'].includes(event.key)) {
        event.preventDefault();
        update(constrainCamera(event.key === '0' ? { x: current.geometry.width / 2, y: current.geometry.height / 2, zoom: 1 } : { ...current.camera, zoom: current.camera.zoom * (event.key === '-' ? 1 / 1.25 : 1.25) }, current.geometry, current.maxZoom));
      }
    };
    node.addEventListener('wheel', wheel, { passive: false }); node.addEventListener('keydown', keydown);
    cleanup.current = () => { node.removeEventListener('wheel', wheel); node.removeEventListener('keydown', keydown); };
  }, []);
  return { panHandlers: responder.panHandlers, surfaceRef, dragging };
}
