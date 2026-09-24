import { useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowUpRight, Camera, Star, X } from "lucide-react-native";
import { colors } from "../theme/colors";
import { useAppTheme } from "../theme/useAppTheme";
import photosByArea from "../data/pangasinanPhotos.json";
import { photoAssets } from "../data/pangasinanPhotoAssets";
import { placesForArea, summarizeRatings } from "../utils/mapPlaces";

export default function MapHoverPreview({ area, places, loading, error, retry, onExplore, onChoose, onDismiss }) {
  const { themeStyle, themeColor } = useAppTheme();
  const [photoFailed, setPhotoFailed] = useState(false);
  const photos = photosByArea[area.id] || [];
  const photo = photos[0];
  const nearby = placesForArea(area, places);
  const rating = summarizeRatings(nearby);
  return <View testID="map-hover-preview" style={themeStyle(styles.card)}>
    <View style={styles.heading}>
      <Text style={themeStyle(styles.eyebrow)}>AREA PREVIEW</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss map preview" onPress={onDismiss} style={styles.close}><X size={16} color={themeColor(colors.textMuted)} /></Pressable>
    </View>
    <View style={styles.summary}>
      <View style={themeStyle(styles.photo)}>
        {photo && !photoFailed ? <Image source={photoAssets[photo.uri] || { uri: photo.uri }} accessibilityLabel={`Preview of ${area.name}`} resizeMode="cover" style={StyleSheet.absoluteFill} onError={() => setPhotoFailed(true)} /> : <Camera size={28} color={themeColor(colors.textMuted)} />}
      </View>
      <View style={styles.identity}>
        <Text accessibilityRole="header" style={themeStyle(styles.name)}>{area.name}</Text>
        <Text style={themeStyle(styles.caption)}>{area.kind} · Pangasinan</Text>
        <View style={styles.rating}>
          <Star size={16} color={colors.gold} fill={rating.average && !error && !loading ? colors.gold : "transparent"} />
          {loading ? <ActivityIndicator size="small" accessibilityLabel="Loading area ratings" color={themeColor(colors.oceanBlue)} /> : <Text style={themeStyle(styles.ratingValue)}>{error ? "Ratings unavailable" : rating.average ? `${rating.average.toFixed(1)} / 5` : "Not yet rated"}</Text>}
        </View>
        {!loading && !error && rating.count > 0 && <Text style={themeStyle(styles.caption)}>{rating.count} shared-place {rating.count === 1 ? "rating" : "ratings"}</Text>}
      </View>
    </View>
    <Text numberOfLines={2} style={themeStyle(styles.description)}>{error ? "Photos are ready to explore. Reconnect for traveler ratings." : loading ? "Explore local photos while traveler details load." : nearby.length ? `${nearby.length} shared ${nearby.length === 1 ? "place" : "places"} · ${nearby.slice(0, 2).map(place => place.name).join(" · ")}` : "Discover local photos and share your own favorite places."}</Text>
    {photo && !photoFailed && <Pressable accessibilityRole="link" accessibilityLabel={`Photo credit for ${area.name}`} onPress={() => Linking.openURL(photo.source)}><Text numberOfLines={1} style={themeStyle(styles.credit)}>{photo.credit || "Wikimedia Commons"} · {photo.license} ↗</Text></Pressable>}
    {error && <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={themeStyle(styles.retryLabel)}>Retry ratings</Text></Pressable>}
    <Pressable accessibilityRole="button" accessibilityLabel={`Explore ${area.name} details`} onPress={onExplore} style={themeStyle(styles.explore)}>
      <Text style={styles.exploreText}>Explore {area.name}</Text><View style={styles.photoCount}><Camera size={13} color={colors.white} /><Text style={styles.photoCountText}>{photos.length}</Text></View><ArrowUpRight size={16} color={colors.white} />
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`Choose ${area.name} to explore`} onPress={onChoose} style={themeStyle(styles.choose)}><Text style={themeStyle(styles.chooseText)}>Choose this place to explore</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 14, gap: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, shadowColor: "#082C44", shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: -6, marginRight: -6 },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, color: colors.textMuted },
  close: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  summary: { flexDirection: "row", gap: 12, alignItems: "center" },
  photo: { width: 80, height: 90, borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: colors.oceanBlueLight },
  identity: { flex: 1, minWidth: 0, gap: 4 },
  name: { color: colors.oceanBlue, fontSize: 18, fontWeight: "700" },
  caption: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  rating: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  ratingValue: { color: colors.oceanBlue, fontSize: 12, fontWeight: "700", flexShrink: 1 },
  description: { color: colors.textPrimary, fontSize: 12, lineHeight: 18 },
  credit: { fontSize: 9, lineHeight: 14, color: colors.textMuted, textDecorationLine: "underline" },
  explore: { backgroundColor: colors.oceanBlue, minHeight: 44, borderRadius: 9, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 },
  exploreText: { color: colors.white, fontSize: 12, fontWeight: "600", flex: 1 },
  choose: { minHeight: 40, justifyContent: "center", alignItems: "center", borderRadius: 9, borderWidth: 1, borderColor: colors.sunsetCoral },
  chooseText: { color: colors.sunsetCoral, fontSize: 12, fontWeight: "700" },
  photoCount: { flexDirection: "row", gap: 4, alignItems: "center" },
  photoCountText: { fontSize: 11, color: colors.white },
  retry: { alignSelf: "flex-start", minHeight: 32, justifyContent: "center" },
  retryLabel: { color: colors.sunsetCoral, fontSize: 12, fontWeight: "600" },
});
