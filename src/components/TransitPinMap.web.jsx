import { createElement, useEffect, useRef, useState } from 'react';
import TransitJourneyMap from './TransitJourneyMap';
import FullscreenMap from './FullscreenMap';

let loading;
function loadMaps(key) {
  if (globalThis.google?.maps) return Promise.resolve(globalThis.google.maps);
  loading ||= new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Google Maps did not load. Check the browser map key and connection.')), 15000);
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=multraverseMapReady`;
    globalThis.multraverseMapReady = () => { clearTimeout(timer); resolve(globalThis.google.maps); };
    script.onerror = () => { clearTimeout(timer); loading = null; reject(new Error('Google Maps could not load.')); };
    document.head.appendChild(script);
  });
  return loading;
}

export default function TransitPinMap({ origin, destination, pinMode, onPick, onMovePin }) {
  const node = useRef(null), instance = useRef(null), markers = useRef([]), pick = useRef(onPick);
  const [error, setError] = useState(''), [ready, setReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const viewport = useRef(null), lastPins = useRef('');
  const move = useRef(onMovePin);
  move.current = onMovePin;
  pick.current = onPick;
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  useEffect(() => {
    if (!key) return;
    let active = true, listener;
    setReady(false);
    loadMaps(key).then(maps => {
      if (!active) return;
      instance.current = new maps.Map(node.current, {
        center: viewport.current?.center || { lat: 15.98, lng: 120.3 }, zoom: viewport.current?.zoom || 10,
        restriction: { latLngBounds: { north: 16.65, south: 15.55, east: 120.95, west: 119.7 }, strictBounds: true },
        streetViewControl: false, mapTypeControl: false, zoomControl: false,
        fullscreenControl: false, gestureHandling: 'greedy', keyboardShortcuts: true,
      });
      listener = instance.current.addListener('click', event => {
        if (event.latLng) pick.current(event.latLng.toJSON());
      });
      setError(''); setReady(true);
    }).catch(e => { if (active) setError(e.message); });
    return () => {
      active = false;
      if (instance.current) viewport.current = { center: instance.current.getCenter()?.toJSON(), zoom: instance.current.getZoom() };
      listener?.remove(); markers.current.forEach(m => m.setMap(null)); instance.current = null;
    };
  }, [key, fullscreen]);
  // Reconcile pins after the asynchronous map initialization as well as edits.
  useEffect(() => {
    let active = true;
    if (!key || !ready) return;
    loadMaps(key).then(maps => {
      if (!active || !instance.current) return;
      markers.current.forEach(m => m.setMap(null));
      markers.current = [origin, destination].map((point, i) => {
        if (!point) return null;
        const marker = new maps.Marker({ map: instance.current, position: { lat: point.lat, lng: point.lng }, label: i ? 'B' : 'A', title: i ? 'Destination' : 'Your location', draggable: true });
        marker.addListener('dragend', event => {
          if (event.latLng) {
            marker.setPosition({ lat: point.lat, lng: point.lng });
            move.current?.(i ? 'destination' : 'origin', event.latLng.toJSON());
          }
        });
        return marker;
      }).filter(Boolean);
      const pins = JSON.stringify([origin, destination]);
      if (lastPins.current === pins) return;
      lastPins.current = pins;
      if (origin && destination) {
        const bounds = new maps.LatLngBounds();
        bounds.extend(origin); bounds.extend(destination); instance.current.fitBounds(bounds, 60);
      } else if (origin || destination) instance.current.panTo(origin || destination);
    }).catch(() => {});
    return () => { active = false; };
  }, [key, ready, origin, destination, fullscreen]);
  if (!key || error) return <TransitJourneyMap origin={origin} destination={destination} pinMode={pinMode} onPick={onPick} />;
  return <FullscreenMap fullscreen={fullscreen} onFullscreenChange={setFullscreen} height={420} style={{ borderRadius: 16 }}>
    {createElement('div', { ref: node, role: 'region', 'aria-label': 'Google Maps: click to pin your current location or destination, pinch to zoom and drag to pan', style: { width: '100%', height: '100%' } })}
  </FullscreenMap>;
}
