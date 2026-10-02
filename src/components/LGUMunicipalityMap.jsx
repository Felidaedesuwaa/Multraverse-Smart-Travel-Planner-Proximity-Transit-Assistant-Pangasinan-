import { useEffect, useMemo, useRef, useState } from 'react'
import { Linking, PanResponder, Platform, Pressable, Text, View } from 'react-native'
import { LocateFixed, MapPin, Minus, Plus, RotateCcw } from 'lucide-react-native'
import Svg, { Circle, ClipPath, Defs, G, Image, Path } from 'react-native-svg'
import * as Location from 'expo-location'
import geometry from '../data/pangasinanMap.json'
import { boundaryBounds, boundaryRings, constrainCenter, containsLocation, fitZoom, projectLocation } from '../utils/lguMap'
import { useAppTheme } from '../theme/useAppTheme'
import Card from './Card'

const HEIGHT = 300
const tileTemplate = process.env.EXPO_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export default function LGUMunicipalityMap({ municipality }) {
  const { palette, text, surface } = useAppTheme()
  const area = geometry.areas.find(item => item.id === municipality.id)
  const rings = useMemo(() => area ? boundaryRings(area.d) : [], [area])
  const bounds = useMemo(() => rings.length ? boundaryBounds(rings) : null, [rings])
  const [width, setWidth] = useState(360)
  const minimumZoom = bounds ? fitZoom(bounds, width, HEIGHT) : 8
  const home = useMemo(() => bounds ? [(bounds.left + bounds.right) / 2, (bounds.top + bounds.bottom) / 2] : projectLocation(municipality.center), [bounds, municipality])
  const [center, setCenter] = useState(home), [zoom, setZoom] = useState(minimumZoom)
  const [gps, setGps] = useState(null), [locating, setLocating] = useState(false)
  const [message, setMessage] = useState('Drag to explore your LGU. Use GPS to locate yourself within its boundary.')
  const [tileError, setTileError] = useState(false)
  const requestId = useRef(0)
  useEffect(() => {
    setCenter(home); setZoom(minimumZoom); setGps(null); setTileError(false); setLocating(false)
    setMessage('Drag to explore your LGU. Use GPS to locate yourself within its boundary.')
    return () => { requestId.current += 1 }
  }, [home, minimumZoom])
  const scale = 256 * 2 ** zoom
  const current = useRef(null), dragStart = useRef(null)
  current.current = { center, scale, bounds }
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 5,
    onPanResponderGrant: () => { dragStart.current = current.current },
    onPanResponderMove: (_, g) => {
      const start = dragStart.current
      if (start?.bounds) setCenter(constrainCenter([start.center[0] - g.dx / start.scale, start.center[1] - g.dy / start.scale], start.bounds))
    },
  }), [])
  const left = center[0] * scale - width / 2, top = center[1] * scale - HEIGHT / 2
  const path = rings.map(ring => 'M' + ring.map(p => `${p[0] * scale - left},${p[1] * scale - top}`).join('L') + 'Z').join('')
  const tiles = []
  if (bounds) for (let x = Math.max(Math.floor(left / 256), Math.floor(bounds.left * scale / 256)); x <= Math.min(Math.floor((left + width) / 256), Math.floor(bounds.right * scale / 256)); x++) {
    for (let y = Math.max(Math.floor(top / 256), Math.floor(bounds.top * scale / 256)); y <= Math.min(Math.floor((top + HEIGHT) / 256), Math.floor(bounds.bottom * scale / 256)); y++) {
      const uri = tileTemplate.replace('{z}', zoom).replace('{x}', x).replace('{y}', y)
      tiles.push(<Image key={`${zoom}/${x}/${y}`} x={x * 256 - left} y={y * 256 - top} width={256} height={256} href={Platform.OS === 'web' ? uri : { uri, headers: { 'User-Agent': 'Multraverse/1.0 (com.jolly18.multraverse)' } }} onError={() => setTileError(true)} />)
    }
  }
  async function locate() {
    const id = ++requestId.current
    let timer
    setLocating(true); setMessage('Getting your GPS location…')
    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== 'granted') throw new Error('Location permission was denied. Enable it in your device or browser settings to use GPS.')
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('GPS timed out. Check location services and try again.')), 20000) }),
      ])
      if (id !== requestId.current) return
      const point = projectLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
      if (!containsLocation(rings, point)) {
        setGps(null); setMessage(`Your location is outside ${municipality.name}. The map stays within your assigned LGU.`)
        return
      }
      setGps(point); setCenter(point); setZoom(Math.max(minimumZoom, 16))
      setMessage(`Your location in ${municipality.name}${position.coords.accuracy != null ? ` (accuracy about ${Math.round(position.coords.accuracy)} m)` : ''}.`)
    } catch (error) {
      if (id === requestId.current) setMessage(error.message || 'Unable to get GPS. Check location services and try again.')
    } finally {
      clearTimeout(timer)
      if (id === requestId.current) setLocating(false)
    }
  }
  function control(label, Icon, onPress, disabled = false) {
    return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, backgroundColor: surface, opacity: disabled ? 0.45 : 1 }}><Icon size={16} color={text} /><Text style={{ color: text, fontFamily: 'DMSans', fontSize: 12 }}>{label}</Text></Pressable>
  }
  return <Card style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><MapPin size={18} color={text} /><Text style={{ flex: 1, color: text, fontFamily: 'Poppins', fontSize: 16, fontWeight: '600' }}>{municipality.name} {municipality.kind.toLowerCase()} map</Text></View>
    <View onLayout={event => setWidth(Math.max(1, event.nativeEvent.layout.width))} {...pan.panHandlers} style={{ height: HEIGHT, overflow: 'hidden', borderRadius: 12, backgroundColor: surface, ...(Platform.OS === 'web' ? { touchAction: 'none', cursor: 'grab' } : {}) }}>
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} accessibilityLabel={`Interactive map of ${municipality.name} only`}>
        <Defs><ClipPath id={`lgu-${municipality.id}`}><Path d={path} clipRule="evenodd" /></ClipPath></Defs>
        <Path d={path} fill={palette.brand} fillOpacity={0.12} fillRule="evenodd" />
        <G clipPath={`url(#lgu-${municipality.id})`}>
          {tiles}
          {gps && <Circle cx={gps[0] * scale - left} cy={gps[1] * scale - top} r={8} fill="#2563eb" stroke="#fff" strokeWidth={3} />}
        </G>
        <Path d={path} fill="none" stroke={palette.brand} strokeWidth={2} />
      </Svg>
    </View>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {control('Zoom out', Minus, () => setZoom(value => Math.max(minimumZoom, value - 1)), zoom <= minimumZoom)}
      {control('Zoom in', Plus, () => setZoom(value => Math.min(18, value + 1)), zoom >= 18)}
      {control('Reset view', RotateCcw, () => { setCenter(home); setZoom(minimumZoom); setTileError(false) })}
      {control(locating ? 'Locating…' : 'Use GPS', LocateFixed, locate, locating || !bounds)}
    </View>
    <Text accessibilityLiveRegion="polite" style={{ color: text, fontFamily: 'DMSans', fontSize: 12 }}>{bounds ? message : 'Boundary unavailable for this LGU.'}</Text>
    {tileError && <Text style={{ color: text, fontSize: 12 }}>Street tiles could not load. Check your internet connection. The LGU boundary is still available.</Text>}
    <Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}><Text style={{ color: text, fontSize: 11 }}>© OpenStreetMap contributors</Text></Pressable>
  </Card>
}
