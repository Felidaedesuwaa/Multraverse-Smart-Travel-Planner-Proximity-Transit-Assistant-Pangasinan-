import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Anchor, Building2, Church, Landmark, Minus, Plus, Trees, Waves } from "lucide-react-native";
import Svg, { Path, Polyline } from "react-native-svg";
import { colors } from "../theme/colors";
import { placeDetails, places, routeChainCoral, routeChainNavy } from "../data/places";

const iconMap = { waves: Waves, trees: Trees, anchor: Anchor, landmark: Landmark, church: Church, building: Building2 };

function coordsFor(ids) {
  return ids
    .map((id) => places.find((place) => place.id === id))
    .filter(Boolean)
    .map((place) => `${place.x},${place.y}`)
    .join(" ");
}

export default function PangasinanMap() {
  const [selected, setSelected] = useState("alaminos");
  const detail = selected ? placeDetails[selected] : null;

  return (
    <View style={styles.map}>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Path d="M 8 40 C 6 25, 20 10, 40 8 C 55 6, 65 12, 62 22 C 78 18, 95 30, 92 48 C 95 65, 80 82, 60 85 C 45 92, 20 88, 12 70 C 4 60, 6 50, 8 40 Z" fill={colors.islandGreen} />
        <Path d="M 30 12 C 45 14, 60 20, 68 30 C 55 32, 40 30, 30 24 C 26 20, 27 15, 30 12 Z" fill={colors.oceanBlueLight} />
        <Polyline points={coordsFor(routeChainCoral)} fill="none" stroke={colors.sunsetCoral} strokeWidth={0.4} strokeDasharray="1.2 1.2" />
        <Polyline points={coordsFor(routeChainNavy)} fill="none" stroke={colors.oceanBlue} strokeWidth={0.4} strokeDasharray="1.2 1.2" />
      </Svg>

      <Text style={styles.waterLabel}>Lingayen Gulf</Text>
      <View style={styles.userPin}><View style={styles.userDot} /><Text style={styles.userLabel}>You</Text></View>

      {places.map((place) => {
        const Icon = iconMap[place.icon];
        const isSelected = selected === place.id;
        return (
          <Pressable key={place.id} accessibilityRole="button" accessibilityLabel={`Select ${place.name}`} onPress={() => setSelected(place.id)} style={[styles.placePin, { left: `${place.x}%`, top: `${place.y}%` }]}>
            <View style={[styles.placeIcon, { borderColor: isSelected ? colors.sunsetCoral : colors.oceanBlue }]}><Icon size={20} color={colors.oceanBlue} /></View>
            <Text style={[styles.placeLabel, { backgroundColor: isSelected ? colors.sunsetCoral : colors.oceanBlue }]} numberOfLines={1}>{place.name}</Text>
          </Pressable>
        );
      })}

      <View style={styles.zoomControls}>
        {[Plus, Minus].map((Icon, index) => <Pressable key={index} accessibilityRole="button" style={styles.zoomButton}><Icon size={16} color={colors.oceanBlue} /></Pressable>)}
      </View>

      {detail && (
        <View style={styles.detailCard}>
          <Text style={styles.detailEyebrow}>SELECTED LOCATION</Text>
          <Text style={styles.detailName}>{detail.name}</Text>
          <Text style={styles.detailAddress}>{detail.address}</Text>
          <View style={styles.tagList}>{detail.tags.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>
          <Pressable style={styles.addButton}><Text style={styles.addButtonLabel}>Add to Itinerary</Text></Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { position: "relative", width: "100%", height: 620, borderRadius: 18, overflow: "hidden", backgroundColor: colors.oceanBlueLight, borderWidth: 1, borderColor: colors.border },
  waterLabel: { position: "absolute", left: "38%", top: "16%", fontFamily: "DMSans", fontSize: 13, color: "#5A7A8C" },
  userPin: { position: "absolute", left: "42%", top: "58%", alignItems: "center" },
  userDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.sunsetCoral, borderWidth: 3, borderColor: colors.white, shadowColor: colors.sunsetCoral, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3 },
  userLabel: { marginTop: 4, fontFamily: "DMSans", fontSize: 11, fontWeight: "600", color: colors.oceanBlue },
  placePin: { position: "absolute", width: 100, marginLeft: -50, marginTop: -22, alignItems: "center" },
  placeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 2, alignItems: "center", justifyContent: "center", shadowColor: colors.oceanBlue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 3 },
  placeLabel: { marginTop: 6, color: colors.white, fontFamily: "DMSans", fontSize: 11, fontWeight: "600", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, maxWidth: 100 },
  zoomControls: { position: "absolute", top: 16, right: 16, gap: 8 },
  zoomButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 2 },
  detailCard: { position: "absolute", right: 20, bottom: 20, width: 260, backgroundColor: colors.white, borderRadius: 14, padding: 16, shadowColor: colors.oceanBlue, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 5 },
  detailEyebrow: { fontFamily: "DMSans", fontSize: 11, letterSpacing: 1, color: colors.textMuted, marginBottom: 4 },
  detailName: { fontFamily: "Poppins", fontWeight: "700", fontSize: 17, color: colors.oceanBlue },
  detailAddress: { fontFamily: "DMSans", fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  tagList: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  tag: { fontFamily: "DMSans", fontSize: 11, backgroundColor: colors.oceanBlueLight, color: colors.oceanBlue, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  addButton: { backgroundColor: colors.sunsetCoral, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  addButtonLabel: { color: colors.white, fontFamily: "DMSans", fontWeight: "600", fontSize: 13 },
});
