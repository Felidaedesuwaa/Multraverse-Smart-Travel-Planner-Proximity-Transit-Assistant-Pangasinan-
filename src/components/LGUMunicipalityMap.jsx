import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { MapPin, Minus, Plus, RotateCcw } from 'lucide-react-native'
import Svg, { Path } from 'react-native-svg'
import geometry from '../data/pangasinanMap.json'
import { getLGUMapViewport } from '../data/lguMunicipalities'
import { useAppTheme } from '../theme/useAppTheme'
import Card from './Card'

// One component for every LGU; no public catalog queries or cross-LGU editing.
export default function LGUMunicipalityMap({ municipality }) {
  const { palette, text, surface } = useAppTheme()
  const [zoom, setZoom] = useState(municipality.defaultZoom)
  return <Card style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><MapPin size={18} color={text} /><Text style={{ flex: 1, color: text, fontFamily: 'Poppins', fontSize: 16, fontWeight: '600' }}>{municipality.name} municipal area</Text></View>
    <Svg width="100%" height={240} viewBox={getLGUMapViewport(municipality, zoom)} accessibilityLabel={`Map centered on ${municipality.name}`}>
      {geometry.areas.map(area => <Path key={area.id} d={area.d} fill={area.id === municipality.id ? palette.brand : surface} stroke={text} strokeWidth={0.6} />)}
    </Svg>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, backgroundColor: surface }} accessibilityRole="button" accessibilityLabel="Zoom out" onPress={() => setZoom(value => Math.max(8, value - 1))}><Minus size={16} color={text} /><Text style={{ color: text, fontFamily: 'DMSans', fontSize: 12 }}>Zoom out</Text></Pressable>
      <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, backgroundColor: surface }} accessibilityRole="button" accessibilityLabel="Zoom in" onPress={() => setZoom(value => Math.min(16, value + 1))}><Plus size={16} color={text} /><Text style={{ color: text, fontFamily: 'DMSans', fontSize: 12 }}>Zoom in</Text></Pressable>
      <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, backgroundColor: surface }} accessibilityRole="button" onPress={() => setZoom(municipality.defaultZoom)}><RotateCcw size={16} color={text} /><Text style={{ color: text, fontFamily: 'DMSans', fontSize: 12 }}>Reset view</Text></Pressable>
    </View>
  </Card>
}
