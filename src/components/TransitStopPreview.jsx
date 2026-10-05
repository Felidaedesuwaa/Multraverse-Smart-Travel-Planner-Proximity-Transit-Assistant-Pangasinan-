import { View, Text } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import map from '../data/pangasinanMap.json';
import { useAppTheme } from '../theme/useAppTheme';

export default function TransitStopPreview({ stop }) {
  const { themeColor } = useAppTheme();
  // The same geographic transform as the bundled municipality boundaries.
  const x = 40 + (stop.lng * 0.9612616959383189 - 115.11081980143565) * 817.448349655742;
  const y = 40 + (16.443622150000063 - stop.lat) * 817.448349655742;
  const area = map.areas.find(a => a.id === stop.areaId);
  const locationLabel = stop.coordinateType ? 'GPS reference waypoint' : 'Stop location';
  return <View accessibilityLabel={`${locationLabel}: ${stop.name}, ${area?.name}. Latitude ${stop.lat}, longitude ${stop.lng}`}>
    <Svg width="100%" height={150} viewBox={`${x - 80} ${y - 60} 160 120`}>
      {map.areas.map(a => <Path key={a.id} d={a.d} fill={a.id === stop.areaId ? themeColor('#D8ECE5', 'backgroundColor') : themeColor('#EDF2F5', 'backgroundColor')} stroke="#758994" strokeWidth={0.5} />)}
      <Circle cx={x} cy={y} r={4} fill="#EE7058" stroke="#fff" strokeWidth={1.5} />
    </Svg>
    <Text style={{ fontSize: 12, color: themeColor('#758994', 'color') }}>{area?.name} · {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)} · {locationLabel}</Text>
  </View>;
}
