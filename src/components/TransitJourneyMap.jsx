import { useRef, useState } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import map from '../data/pangasinanMap.json';
const projectLocation = p => [
  (p.lng * 0.9612616959383189 - 115.11081980143565) * 817.448349655742 + 40,
  (16.443622150000063 - p.lat) * 817.448349655742 + 40,
];

const unproject = (x, y) => ({
  lng: ((x - 40) / 817.448349655742 + 115.11081980143565) / 0.9612616959383189,
  lat: 16.443622150000063 - (y - 40) / 817.448349655742,
});

export default function TransitJourneyMap({ origin, destination, pinMode, onPick }) {
  const [size, setSize] = useState({ width: 800, height: 420 });
  const [camera, setCamera] = useState({ x: map.width / 2, y: map.height / 2, zoom: 1 });
  const gesture = useRef(null);
  const scale = Math.min(size.width / map.width, size.height / map.height) * camera.zoom;
  const vw = size.width / scale, vh = size.height / scale;
  const vx = camera.x - vw / 2, vy = camera.y - vh / 2;
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: event => {
      gesture.current = { ...camera, scale, xTap: event.nativeEvent.locationX, yTap: event.nativeEvent.locationY };
    },
    onPanResponderMove: (_event, state) => {
      const start = gesture.current;
      if (!start || Math.hypot(state.dx, state.dy) < 6) return;
      setCamera({ ...start, x: start.x - state.dx / start.scale, y: start.y - state.dy / start.scale });
    },
    onPanResponderRelease: (_event, state) => {
      const start = gesture.current;
      if (start && Math.hypot(state.dx, state.dy) < 6) {
        onPick(unproject(start.x + (start.xTap - size.width / 2) / start.scale, start.y + (start.yTap - size.height / 2) / start.scale));
      }
      gesture.current = null;
    },
    onPanResponderTerminate: () => { gesture.current = null; },
  });
  const points = [origin, destination].map(p => p ? projectLocation(p) : null);
  function fitJourney() {
    const available = points.filter(Boolean);
    if (!available.length) { setCamera({ x: map.width / 2, y: map.height / 2, zoom: 1 }); return; }
    const xs = available.map(p => p[0]), ys = available.map(p => p[1]);
    const spanX = Math.max(...xs) - Math.min(...xs), spanY = Math.max(...ys) - Math.min(...ys);
    const baseScale = Math.min(size.width / map.width, size.height / map.height);
    setCamera({ x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2,
      zoom: Math.max(1, Math.min(16, Math.min(size.width / (spanX + 100), size.height / (spanY + 100)) / baseScale)) });
  }
  return <View style={{ gap: 8 }}>
    <Text style={{ color: '#103E53' }}>Tap to place {pinMode === 'destination' ? 'B · Destination' : 'A · Your location'}. Drag to explore.</Text>
    <View style={{ height: 420, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E4F0F3' }}>
      <View {...responder.panHandlers} onLayout={e => { const { width, height } = e.nativeEvent.layout; if (width > 0 && height > 0) setSize({ width, height }); }} style={{ flex: 1, touchAction: 'none' }} accessibilityLabel="Interactive journey map: tap to place a pin, drag to pan">
        <Svg pointerEvents="none" width="100%" height="100%" viewBox={`${vx} ${vy} ${vw} ${vh}`}>
          {map.areas.map(a => <G key={a.id}><Path d={a.d} fill="#F4F6EB" stroke="#8CAFAA" strokeWidth={0.8 / camera.zoom} /><SvgText x={a.center[0]} y={a.center[1]} fontSize={8 / Math.sqrt(camera.zoom)} textAnchor="middle" fill="#345760">{a.name}</SvgText></G>)}
          {points[0] && points[1] && <Line x1={points[0][0]} y1={points[0][1]} x2={points[1][0]} y2={points[1][1]} stroke="#103E53" strokeDasharray={`${6 / scale} ${4 / scale}`} strokeWidth={2 / scale} />}
          {points.map((p, i) => p && <G key={i}><Circle cx={p[0]} cy={p[1]} r={13 / scale} fill={i ? '#EE7058' : '#22835D'} stroke="white" strokeWidth={2 / scale} /><SvgText x={p[0]} y={p[1] + 4 / scale} fontSize={12 / scale} fontWeight="bold" textAnchor="middle" fill="white">{i ? 'B' : 'A'}</SvgText></G>)}
        </Svg>
      </View>
      <View style={{ position: 'absolute', right: 10, top: 10, gap: 6 }}>
        {[['+', 'Zoom in', () => setCamera(c => ({ ...c, zoom: Math.min(32, c.zoom * 1.5) }))], ['−', 'Zoom out', () => setCamera(c => ({ ...c, zoom: Math.max(1, c.zoom / 1.5) }))], ['Fit pins', 'Show both pins', fitJourney]].map(([label, name, action]) => <Pressable key={name} accessibilityRole="button" accessibilityLabel={name} onPress={action} style={{ backgroundColor: 'white', padding: 12, borderRadius: 8 }}><Text style={{ color: '#103E53' }}>{label}</Text></Pressable>)}
      </View>
    </View>
    <Text style={{ color: '#758994', fontSize: 12 }}>A = your location · B = destination. Select A or B above to replace its pin. The dotted line shows the connection between pins.</Text>
  </View>;
}
