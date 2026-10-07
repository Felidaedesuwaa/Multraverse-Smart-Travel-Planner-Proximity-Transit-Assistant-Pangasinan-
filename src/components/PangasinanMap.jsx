import { FeedbackPressable } from "./WorkspaceMotion";
import { useAppTheme } from "../theme/useAppTheme";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Compass, MapPin, Search } from "lucide-react-native";
import Svg, { Circle, G, Path, Polyline, Text as SvgText } from "react-native-svg";
import FullscreenMap from "./FullscreenMap";
import useMapGestures from "../hooks/useMapGestures";
import geometry from "../data/pangasinanMap.json";
import { colors } from "../theme/colors";
import MapPlacePreview from "./MapPlacePreview";
import MapHoverPreview from "./MapHoverPreview";
import { useMapPlaces } from "../hooks/useMapPlaces";
import { useNavigation } from "@react-navigation/native";

const featured = ["alaminos", "bolinao", "lingayen", "dagupan", "manaoag", "san-carlos", "urdaneta"];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function PangasinanMap({ mode = "explore", selectedIds = [], onToggle, routeStops = [] }) {
  const { themeStyle, themeColor, mapColors } = useAppTheme();
  const navigation = useNavigation();

  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewRequested, setPreviewRequested] = useState(false);
  const previewPlaces = useMapPlaces(previewRequested);
  const [query, setQuery] = useState("");
  const [camera, setCamera] = useState({ x: geometry.width / 2, y: geometry.height / 2, zoom: 1 });
  const { zoom } = camera;
  const [fullscreen, setFullscreen] = useState(false);
  const pendingSelection = useRef(null);
  const [frameWidth, setFrameWidth] = useState(800);
  const [size, setSize] = useState({ width: 800, height: 540 });
  const [reduceMotion, setReduceMotion] = useState(false);
  const pop = useRef(new Animated.Value(0)).current;
  const { panHandlers, surfaceRef, dragging } = useMapGestures({ camera, setCamera, size, geometry, maxZoom: 8 });
  const selecting = mode === "select";
  const active = selecting ? hovered : hovered || selected || preview;
  const routePoints = routeStops.map((stop, index) => { const area = geometry.areas.find(a => a.id === stop.areaId); return area ? { ...stop, point: [area.center[0] + (index % 3) * 7, area.center[1] + Math.floor(index / 3) * 3], index } : null; }).filter(Boolean);
  const floatingPreview = size.width >= 700;
  const dismissPreview = () => { setPreview(null); setHovered(null); };
  const hover = area => {
    setHovered(area);
    if (!selecting && Platform.OS === "web" && !dragging.current) { setPreview(area); setPreviewRequested(true); }
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
    const animation = Animated.timing(pop, { toValue: 1, duration: reduceMotion ? 0 : 180, useNativeDriver: Platform.OS !== "web" });
    animation.start();
    return () => animation.stop();
  }, [preview?.id, pop, reduceMotion]);

  const select = area => {
    if (dragging.current) return;
    dismissPreview();
    if (selecting) { onToggle?.(area.id); return; }
    // iOS must finish dismissing the fullscreen modal before presenting details.
    if (fullscreen && Platform.OS === 'ios') pendingSelection.current = area;
    else setSelected(area);
    setFullscreen(false);
  };
  const vx = camera.x - geometry.width / zoom / 2;
  const vy = camera.y - geometry.height / zoom / 2;
  const previewCard = Platform.OS === "web" && preview && !selected ? <Animated.View testID="map-preview-dock" style={[floatingPreview ? styles.previewDock : styles.previewBelow, { opacity: pop }]}>
    <MapHoverPreview key={preview.id} area={preview} {...previewPlaces} onExplore={() => select(preview)} onChoose={() => navigation.navigate("AIItinerary", { areaId: preview.id, placeName: preview.name, fromMap: true })} onDismiss={dismissPreview} />
  </Animated.View> : null;

  return (
    <View onLayout={event => setFrameWidth(event.nativeEvent.layout.width)} style={themeStyle(styles.card)} {...(Platform.OS === "web" ? { onMouseLeave: dismissPreview } : {})}>
      <View style={themeStyle(styles.toolbar)}>
        <View style={themeStyle(styles.search)}>
          <Search size={18} color={themeColor(colors.textMuted, "color")} />
          <TextInput accessibilityLabel="Search Pangasinan cities and municipalities" placeholder="Find a city or municipality" placeholderTextColor={themeColor(colors.textMuted, "color")} value={query} onChangeText={text => { setQuery(text); dismissPreview(); }} style={themeStyle(styles.searchInput)} />
        </View>
        <View style={themeStyle(styles.areaCount)}><MapPin size={15} color={themeColor(colors.palmGreen, "color")} /><Text style={themeStyle(styles.countText)}>48 places to explore</Text></View>
      </View>
      <FullscreenMap fullscreen={fullscreen} onFullscreenChange={setFullscreen} onDismiss={() => { if (pendingSelection.current) { setSelected(pendingSelection.current); pendingSelection.current = null; } }} height={clamp(frameWidth * geometry.height / geometry.width, 350, 650)} style={[themeStyle(styles.map), { backgroundColor: mapColors.water }]} onLayout={event => { const { width, height } = event.nativeEvent.layout; if (width > 0 && height > 0) setSize({ width, height }); }}>
        <View testID="interactive-map-frame" ref={surfaceRef} focusable style={[StyleSheet.absoluteFillObject, Platform.OS === "web" && { touchAction: "none" }]} {...panHandlers} accessibilityLabel="Interactive Pangasinan map. Pinch or scroll to zoom, drag to pan. Keyboard: plus and minus to zoom, arrows to pan, zero to reset.">
          <Svg width="100%" height="100%" viewBox={`${vx} ${vy} ${geometry.width / zoom} ${geometry.height / zoom}`} preserveAspectRatio="xMidYMid meet">
            <SvgText x="400" y="140" textAnchor="middle" fill={mapColors.gulf} fontSize="18" fontStyle="italic">Lingayen Gulf</SvgText>
            {/* SVG requires an explicit null onPress on web to preserve onClick and skip native responder handlers. */}
            {geometry.areas.map((area, i) => (
              <Path key={area.id} testID={`map-area-${area.id}`} d={area.d} fill={selectedIds.includes(area.id) ? mapColors.active : query && !matches.includes(area) ? mapColors.muted : mapColors.regions[i % 4]}
                fillRule="evenodd" stroke={mapColors.border} strokeWidth={1.2 / zoom} strokeLinejoin="round" onPress={Platform.OS === "web" ? null : () => select(area)}
                {...(Platform.OS === "web" ? { onClick: () => select(area), onMouseEnter: () => hover(area), onMouseLeave: () => setHovered(null), style: { cursor: "pointer" } } : {})} />
            ))}
            {routePoints.length > 1 && <Polyline points={routePoints.map(s => s.point.join(",")).join(" ")} fill="none" stroke={mapColors.route} strokeWidth={3 / zoom} strokeDasharray="6 4" pointerEvents="none" />}
            {routePoints.map(stop => <G key={`${stop.placeId}-${stop.index}`} pointerEvents="none"><Circle cx={stop.point[0]} cy={stop.point[1]} r={10 / zoom} fill={mapColors.route} /><SvgText x={stop.point[0]} y={stop.point[1] + 4 / zoom} fontSize={11 / zoom} textAnchor="middle" fill={mapColors.routeText}>{stop.index + 1}</SvgText></G>)}
            {active && <G pointerEvents="none">
              <Path d={active.d} fill={themeColor("#173F50", "fill")} opacity={0.18} transform="translate(0 5)" />
              <Path d={active.d} fill={mapColors.active} stroke={mapColors.activeBorder} strokeWidth={2 / zoom} fillRule="evenodd" transform="translate(0 -3)" />
            </G>}
            {geometry.areas.filter(area => featured.includes(area.id) || zoom >= 2.5).map(area => (
              <SvgText key={area.id} x={area.center[0]} y={area.center[1]} textAnchor="middle" fontFamily={Platform.OS === "web" ? "sans-serif" : undefined} fontSize={zoom >= 2.5 ? 10 : 12} fontWeight="600" fill={active?.id === area.id ? mapColors.activeLabel : query && !matches.includes(area) ? mapColors.mutedLabel : mapColors.label} pointerEvents="none">{area.name}</SvgText>
            ))}
          </Svg>
        </View>
        <View pointerEvents="none" style={themeStyle(styles.compass)}><Compass size={24} color={themeColor(colors.oceanBlue, "color")} /><Text style={themeStyle(styles.north)}>N</Text></View>
        {floatingPreview && previewCard}
        <View pointerEvents="none" style={themeStyle(styles.mapHint)}><Text style={themeStyle(styles.caption)}>{selecting ? "Pinch to zoom, drag to move, and select areas below" : "Pinch or scroll to zoom, drag to move, tap an area to explore"}</Text></View>
      </FullscreenMap>
      {routeStops.length > 0 && <Text style={themeStyle({ padding: 14, color: colors.textMuted, fontFamily: "DMSans" })}>Schematic stop order at area centers; markers are not attraction coordinates and lines are not road directions.</Text>}
      {!floatingPreview && previewCard}
      <View style={themeStyle(styles.directory)}>
        <View style={themeStyle(styles.directoryHeading)}><Text style={themeStyle(styles.sectionTitle)}>{query ? `${matches.length} matching areas` : "Explore by area"}</Text><Text style={themeStyle(styles.caption)}>Cities & municipalities</Text></View>
        <ScrollView style={themeStyle(styles.areaList)} nestedScrollEnabled contentContainerStyle={themeStyle(styles.chips)}>
          {matches.map(area => <FeedbackPressable key={area.id} accessibilityRole="button" accessibilityLabel={`${selecting ? "Select" : "Explore"} ${area.name}`} accessibilityState={{ selected: selectedIds.includes(area.id) }} onPress={() => select(area)} onHoverIn={() => hover(area)} onHoverOut={() => setHovered(null)} onFocus={() => hover(area)} onBlur={() => setHovered(null)} style={themeStyle(({ pressed }) => [styles.chip, (pressed || active?.id === area.id || selectedIds.includes(area.id)) && styles.activeChip])}><Text style={themeStyle([styles.chipLabel, (active?.id === area.id || selectedIds.includes(area.id)) && styles.activeChipLabel])}>{area.name}</Text></FeedbackPressable>)}
          {!matches.length && <Text style={themeStyle(styles.caption)}>No matching area. Try another name.</Text>}
        </ScrollView>
      </View>
      <FeedbackPressable accessibilityRole="link" onPress={() => Linking.openURL("https://github.com/faeldon/philippines-json-maps")}><Text style={themeStyle(styles.attribution)}>Map: Philippines JSON Maps · 2023 boundaries · MIT</Text></FeedbackPressable>
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
