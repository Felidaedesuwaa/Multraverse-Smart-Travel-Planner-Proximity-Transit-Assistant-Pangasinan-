import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
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
    <Text style={{ color: text, fontFamily: 'Poppins' }}>{municipality.name} municipal area</Text>
    <Svg width="100%" height={240} viewBox={getLGUMapViewport(municipality, zoom)} accessibilityLabel={`Map centered on ${municipality.name}`}>
      {geometry.areas.map(area => <Path key={area.id} d={area.d} fill={area.id === municipality.id ? palette.brand : surface} stroke={text} strokeWidth={0.6} />)}
    </Svg>
    <View style={{ flexDirection: 'row', gap: 20 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" onPress={() => setZoom(value => Math.max(8, value - 1))}><Text style={{ color: text }}>Zoom out</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" onPress={() => setZoom(value => Math.min(16, value + 1))}><Text style={{ color: text }}>Zoom in</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setZoom(municipality.defaultZoom)}><Text style={{ color: text }}>Reset view</Text></Pressable>
    </View>
  </Card>
}
