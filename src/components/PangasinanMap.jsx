import { useAppTheme } from "../theme/useAppTheme";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Linking, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Compass, MapPin, Maximize2, Minus, Plus, Search } from "lucide-react-native";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import geometry from "../data/pangasinanMap.json";
import { colors } from "../theme/colors";
import MapPlacePreview from "./MapPlacePreview";
import MapHoverPreview from "./MapHoverPreview";
import { useMapPlaces } from "../hooks/useMapPlaces";

const featured = ["alaminos", "bolinao", "lingayen", "dagupan", "manaoag", "san-carlos", "urdaneta"];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function PangasinanMap() {
  const { themeStyle, themeColor, mapColors } = useAppTheme();

  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewRequested, setPreviewRequested] = useState(false);
  const previewPlaces = useMapPlaces(previewRequested);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 800, height: 540 });
  const [reduceMotion, setReduceMotion] = useState(false);
  const pop = useRef(new Animated.Value(0)).current;
  const viewport = useRef({ zoom, pan, size });
  viewport.current = { zoom, pan, size };
  const startPan = useRef(pan);
  const dragging = useRef(false);
  const active = hovered || selected || preview;
  const floatingPreview = size.width >= 700;
  const dismissPreview = () => { setPreview(null); setHovered(null); };
  const hover = area => {
    setHovered(area);
    if (Platform.OS === "web" && !dragging.current) { setPreview(area); setPreviewRequested(true); }
  };
  const matches = useMemo(() => geometry.areas.filter(area => area.name.toLowerCase().includes(query.trim().toLowerCase())), [query]);

  useEffect(() => {
    if (Platform.OS !== "web" || !preview) return;
    const onEscape = event => { if (event.key === "Escape") { setPreview(null); setHovered(null); } };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [preview]);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => listener.remove();
  }, []);
  useEffect(() => {
    pop.setValue(0);
    const animation = Animated.timing(pop, { toValue: 1, duration: reduceMotion ? 0 : 180, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [preview?.id, pop, reduceMotion]);

  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => viewport.current.zoom > 1 && (Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6),
    onPanResponderGrant: () => { startPan.current = viewport.current.pan; dragging.current = true; },
    onPanResponderMove: (_, gesture) => {
      const current = viewport.current;
      const units = Math.max(geometry.width / current.size.width, geometry.height / current.size.height) / current.zoom;
      const limitX = geometry.width * (1 - 1 / current.zoom) / 2;
      const limitY = geometry.height * (1 - 1 / current.zoom) / 2;
      setPan({ x: clamp(startPan.current.x - gesture.dx * units, -limitX, limitX), y: clamp(startPan.current.y - gesture.dy * units, -limitY, limitY) });
    },
    onPanResponderRelease: () => { setTimeout(() => { dragging.current = false; }, 80); },
    onPanResponderTerminate: () => { dragging.current = false; },
  }), []);
  const changeZoom = delta => {
    const next = clamp(zoom + delta, 1, 4);
    setZoom(next);
    setPan(current => ({ x: clamp(current.x, -geometry.width * (1 - 1 / next) / 2, geometry.width * (1 - 1 / next) / 2), y: clamp(current.y, -geometry.height * (1 - 1 / next) / 2, geometry.height * (1 - 1 / next) / 2) }));
  };
  const select = area => { if (!dragging.current) { dismissPreview(); setSelected(area); } };
  const vx = (geometry.width - geometry.width / zoom) / 2 + pan.x;
  const vy = (geometry.height - geometry.height / zoom) / 2 + pan.y;
  const previewCard = Platform.OS === "web" && preview && !selected ? <Animated.View testID="map-preview-dock" style={[floatingPreview ? styles.previewDock : styles.previewBelow, { opacity: pop }]}>
    <MapHoverPreview key={preview.id} area={preview} {...previewPlaces} onExplore={() => select(preview)} onDismiss={dismissPreview} />
  </Animated.View> : null;

  return (
    <View style={themeStyle(styles.card)} {...(Platform.OS === "web" ? { onMouseLeave: dismissPreview } : {})}>
      <View style={themeStyle(styles.toolbar)}>
        <View style={themeStyle(styles.search)}>
          <Search size={18} color={themeColor(colors.textMuted, "color")} />
          <TextInput accessibilityLabel="Search Pangasinan cities and municipalities" placeholder="Find a city or municipality" placeholderTextColor={themeColor(colors.textMuted, "color")} value={query} onChangeText={text => { setQuery(text); dismissPreview(); }} style={themeStyle(styles.searchInput)} />
        </View>
        <View style={themeStyle(styles.areaCount)}><MapPin size={15} color={themeColor(colors.palmGreen, "color")} /><Text style={themeStyle(styles.countText)}>48 places to explore</Text></View>
      </View>
      <View testID="interactive-map-frame" style={[themeStyle(styles.map), { backgroundColor: mapColors.water, height: clamp(size.width * geometry.height / geometry.width, 350, 650) }]} onLayout={event => setSize(event.nativeEvent.layout)}>
        <View style={themeStyle(StyleSheet.absoluteFill)} {...responder.panHandlers}>
          <Svg width="100%" height="100%" viewBox={`${vx} ${vy} ${geometry.width / zoom} ${geometry.height / zoom}`} preserveAspectRatio="xMidYMid meet">
            <SvgText x="400" y="140" textAnchor="middle" fill={mapColors.gulf} fontSize="18" fontStyle="italic">Lingayen Gulf</SvgText>
            {geometry.areas.map((area, i) => (
              <Path key={area.id} testID={`map-area-${area.id}`} d={area.d} fill={query && !matches.includes(area) ? mapColors.muted : mapColors.regions[i % 4]}
                fillRule="evenodd" stroke={mapColors.border} strokeWidth={1.2 / zoom} strokeLinejoin="round" onPress={() => select(area)}
                {...(Platform.OS === "web" ? { onMouseEnter: () => hover(area), onMouseLeave: () => setHovered(null), style: { cursor: "pointer" } } : {})} />
            ))}
            {active && <G pointerEvents="none">
              <Path d={active.d} fill={themeColor("#173F50", "fill")} opacity={0.18} transform="translate(0 5)" />
              <Path d={active.d} fill={colors.sunsetCoral} stroke={mapColors.activeBorder} strokeWidth={2 / zoom} fillRule="evenodd" transform="translate(0 -3)" />
            </G>}
            {geometry.areas.filter(area => featured.includes(area.id) || zoom >= 2.5).map(area => (
              <SvgText key={area.id} x={area.center[0]} y={area.center[1]} textAnchor="middle" fontFamily={Platform.OS === "web" ? "sans-serif" : undefined} fontSize={zoom >= 2.5 ? 10 : 12} fontWeight="600" fill={active?.id === area.id ? mapColors.activeLabel : query && !matches.includes(area) ? mapColors.mutedLabel : mapColors.label} pointerEvents="none">{area.name}</SvgText>
            ))}
          </Svg>
        </View>
        <View pointerEvents="none" style={themeStyle(styles.compass)}><Compass size={24} color={themeColor(colors.oceanBlue, "color")} /><Text style={themeStyle(styles.north)}>N</Text></View>
        <View style={themeStyle(styles.controls)}>
          <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" disabled={zoom === 4} style={themeStyle([styles.control, zoom === 4 && styles.disabled])} onPress={() => changeZoom(0.5)}><Plus size={20} color={themeColor(colors.oceanBlue, "color")} /></Pressable>
          <Text style={themeStyle(styles.zoomText)}>{Math.round(zoom * 100)}%</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" disabled={zoom === 1} style={themeStyle([styles.control, zoom === 1 && styles.disabled])} onPress={() => changeZoom(-0.5)}><Minus size={20} color={themeColor(colors.oceanBlue, "color")} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Reset map view" style={themeStyle(styles.control)} onPress={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><Maximize2 size={18} color={themeColor(colors.oceanBlue, "color")} /></Pressable>
        </View>
        {floatingPreview && previewCard}
        <View pointerEvents="none" style={themeStyle(styles.mapHint)}><Text style={themeStyle(styles.caption)}>{zoom > 1 ? "Drag to move · tap an area to explore" : Platform.OS === "web" ? "Hover to discover · click to explore" : "Tap an area to explore · + to zoom"}</Text></View>
      </View>
      {!floatingPreview && previewCard}
      <View style={themeStyle(styles.directory)}>
        <View style={themeStyle(styles.directoryHeading)}><Text style={themeStyle(styles.sectionTitle)}>{query ? `${matches.length} matching areas` : "Explore by area"}</Text><Text style={themeStyle(styles.caption)}>Cities & municipalities</Text></View>
        <ScrollView style={themeStyle(styles.areaList)} nestedScrollEnabled contentContainerStyle={themeStyle(styles.chips)}>
          {matches.map(area => <Pressable key={area.id} accessibilityRole="button" accessibilityLabel={`Explore ${area.name}`} onPress={() => select(area)} onHoverIn={() => hover(area)} onHoverOut={() => setHovered(null)} onFocus={() => hover(area)} onBlur={() => setHovered(null)} style={themeStyle(({ pressed }) => [styles.chip, (pressed || active?.id === area.id) && styles.activeChip])}><Text style={themeStyle([styles.chipLabel, active?.id === area.id && styles.activeChipLabel])}>{area.name}</Text></Pressable>)}
          {!matches.length && <Text style={themeStyle(styles.caption)}>No matching area. Try another name.</Text>}
        </ScrollView>
      </View>
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL("https://github.com/faeldon/philippines-json-maps")}><Text style={themeStyle(styles.attribution)}>Map: Philippines JSON Maps · 2023 boundaries · MIT</Text></Pressable>
      {selected && <MapPlacePreview key={selected.id} area={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  toolbar: { padding: 18, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 14 },
  search: { flex: 1, minWidth: 220, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F5F6F2", borderRadius: 12, paddingHorizontal: 14 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 46, color: colors.oceanBlue, fontSize: 14 },
  areaCount: { flexDirection: "row", gap: 6, alignItems: "center" },
  countText: { color: colors.palmGreen, fontSize: 12, fontWeight: "600" },
  map: { position: "relative", width: "100%", backgroundColor: "#EDF4F6", overflow: "hidden" },
  compass: { position: "absolute", top: 20, left: 20, alignItems: "center", gap: 4 },
  north: { fontSize: 10, color: colors.oceanBlue, fontWeight: "700" },
  controls: { position: "absolute", top: 16, right: 16, borderRadius: 12, backgroundColor: colors.white, padding: 3, elevation: 3, shadowColor: colors.oceanBlue, shadowOpacity: 0.1, shadowRadius: 10 },
  control: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.35 },
  zoomText: { textAlign: "center", color: colors.textMuted, fontSize: 10 },
  previewDock: { position: "absolute", bottom: 40, left: 16, width: 300 },
  previewBelow: { margin: 12 },
  caption: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  mapHint: { position: "absolute", bottom: 12, left: 16, right: 16, alignItems: "center" },
  directory: { padding: 18, gap: 12 },
  directoryHeading: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.oceanBlue },
  areaList: { maxHeight: 160 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 4 },
  chip: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.warmSand },
  activeChip: { backgroundColor: colors.coralLight, borderColor: colors.sunsetCoral },
  chipLabel: { color: colors.oceanBlue, fontSize: 13 },
  activeChipLabel: { color: colors.sunsetCoral, fontWeight: "700" },
  attribution: { padding: 14, paddingTop: 0, textAlign: "right", color: colors.textMuted, fontSize: 10 },
});
