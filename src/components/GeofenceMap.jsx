import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import map from '../data/pangasinanMap.json';
import { useAppTheme } from '../theme/useAppTheme';

const project = p => [(p.lng * 0.9612616959383189 - 115.11081980143565) * 817.448349655742 + 40, (16.443622150000063 - p.lat) * 817.448349655742 + 40];
export default function GeofenceMap({ zones, selected, onPick }) {
  const { palette } = useAppTheme();
  const [size, setSize] = useState({ width: 800, height: 420 });
  const [zoom, setZoom] = useState(1);
  const centre = selected ? project(selected) : [map.width / 2, map.height / 2];
  const vw = map.width / zoom, vh = map.height / zoom;
  const vx = Math.max(0, Math.min(map.width - vw, centre[0] - vw / 2)), vy = Math.max(0, Math.min(map.height - vh, centre[1] - vh / 2));
  const scale = Math.min(size.width / vw, size.height / vh);
  function pick(e) {
    const { locationX, locationY } = e.nativeEvent;
    const x = vx + (locationX - (size.width - vw * scale) / 2) / scale;
    const y = vy + (locationY - (size.height - vh * scale) / 2) / scale;
    onPick({ lng: ((x - 40) / 817.448349655742 + 115.11081980143565) / 0.9612616959383189, lat: 16.443622150000063 - (y - 40) / 817.448349655742 });
  }
  return <View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}><Text style={{ color: palette.ink, fontFamily: 'Poppins', fontSize: 19 }}>Geofence Map Overview</Text><Text style={{ color: palette.ink, backgroundColor: palette.tint, borderRadius: 20, padding: 8, fontSize: 12 }}>Pangasinan Province</Text></View>
    <View onLayout={e => setSize(e.nativeEvent.layout)} style={{ height: 420, backgroundColor: '#e4f0f3', borderRadius: 16, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox={`${vx} ${vy} ${vw} ${vh}`} onPress={pick}>
        {map.areas.map(a => <G key={a.id}><Path d={a.d} fill="#f4f6eb" stroke="#8cafaa" strokeWidth={0.8} /><SvgText x={a.center[0]} y={a.center[1]} fontSize={8} textAnchor="middle" fill="#345760">{a.name}</SvgText></G>)}
        {zones.filter(z => z.monitorable).map(z => { const [x, y] = project(z.coordinates); const r = z.radiusMeters / 111195 * 817.448349655742; return <G key={z.id}><Circle cx={x} cy={y} r={r} fill={z.active ? '#20987955' : '#8898a455'} stroke={z.active ? '#208565' : '#8898a4'} strokeWidth={1.5 / zoom} /><Circle cx={x} cy={y} r={3 / zoom} fill="#103e53" /></G>; })}
        {selected && <Circle cx={project(selected)[0]} cy={project(selected)[1]} r={5 / zoom} fill="#ff735d" stroke="white" strokeWidth={2 / zoom} />}
      </Svg>
      <View style={{ position: 'absolute', right: 12, top: 12, gap: 6 }}>{[['+', 'Zoom in', () => setZoom(z => Math.min(32, z * 2))], ['−', 'Zoom out', () => setZoom(z => Math.max(1, z / 2))], ['Reset', 'Reset map', () => setZoom(1)]].map(([label, accessible, action]) => <Pressable key={accessible} accessibilityRole="button" accessibilityLabel={accessible} onPress={action} style={{ backgroundColor: palette.surface, padding: 10, borderRadius: 10 }}><Text style={{ color: palette.ink }}>{label}</Text></Pressable>)}</View>
    </View>
    <Text style={{ color: palette.muted, fontSize: 12, marginTop: 8 }}>Click the map to choose a centre. Green circles are active; grey circles are inactive. The full radius is checked before saving.</Text>
  </View>;
}
