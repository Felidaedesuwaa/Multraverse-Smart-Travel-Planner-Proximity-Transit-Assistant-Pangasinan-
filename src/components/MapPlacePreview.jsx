import { useAppTheme } from "../theme/useAppTheme";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ArrowUpRight, Bookmark, Camera, ChevronLeft, ChevronRight, MapPin, Star, X } from "lucide-react-native";
import { colors } from "../theme/colors";
import photosByArea from "../data/pangasinanPhotos.json";
import { photoAssets } from "../data/pangasinanPhotoAssets";
import { placesForArea, summarizeRatings } from "../utils/mapPlaces";
import { api } from "../lib/api";

function CarouselPhoto({ photo, areaName, number, width }) {
  const { themeStyle, themeColor } = useAppTheme();

  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  return <View style={themeStyle({ width, height: "100%", overflow: "hidden" })}>
    {!failed ? <Image source={photoAssets[photo.uri] || { uri: photo.uri }} accessibilityLabel={`Photo ${number} of ${areaName}`} resizeMode="cover" style={themeStyle({ width: "100%", height: "100%" })} onLoadEnd={() => setLoading(false)} onError={() => { setFailed(true); setLoading(false); }} /> : <View style={themeStyle(styles.photoFallback)}><Camera size={38} color={themeColor(colors.slate, "color")} /><Text style={themeStyle(styles.muted)}>Photo unavailable. Try the next image.</Text></View>}
    {loading && !failed && <ActivityIndicator style={themeStyle(StyleSheet.absoluteFill)} color={themeColor(colors.oceanBlue, "color")} />}
  </View>;
}

function PhotoCarousel({ area }) {
  const { themeStyle, themeColor } = useAppTheme();

  const photos = photosByArea[area.id] || [];
  const [index, setIndex] = useState(0);
  const [frameWidth, setFrameWidth] = useState(0);
  const carousel = useRef(null);
  const photo = photos[index];
  const goTo = next => { setIndex(next); carousel.current?.scrollTo({ x: next * frameWidth, animated: true }); };
  const move = direction => goTo((index + direction + photos.length) % photos.length);
  useEffect(() => { setIndex(0); carousel.current?.scrollTo({ x: 0, animated: false }); }, [frameWidth]);

  return (
    <View>
      <View style={themeStyle(styles.photoFrame)} onLayout={event => setFrameWidth(event.nativeEvent.layout.width)}>
        {frameWidth > 0 && <ScrollView ref={carousel} horizontal pagingEnabled nestedScrollEnabled showsHorizontalScrollIndicator={false} style={themeStyle(StyleSheet.absoluteFill)} onMomentumScrollEnd={event => setIndex(Math.min(photos.length - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / frameWidth))))}>
          {photos.map((item, i) => <CarouselPhoto key={item.uri} photo={item} areaName={area.name} number={i + 1} width={frameWidth} />)}
        </ScrollView>}
        {!photos.length && <View style={themeStyle(styles.photoFallback)}><Camera size={38} color={themeColor(colors.slate, "color")} /><Text style={themeStyle(styles.muted)}>Photos are not available for this area yet.</Text></View>}
        <View style={themeStyle(styles.photoBadge)}><Camera size={13} color={themeColor(colors.white, "color")} /><Text style={themeStyle(styles.photoBadgeText)}>{photo ? `${index + 1} / ${photos.length}` : "Area preview"}</Text></View>
        {photos.length > 1 && <>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous photo" style={themeStyle([styles.photoArrow, { left: 14 }])} onPress={() => move(-1)}><ChevronLeft size={22} color={themeColor(colors.oceanBlue, "color")} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Next photo" style={themeStyle([styles.photoArrow, { right: 14 }])} onPress={() => move(1)}><ChevronRight size={22} color={themeColor(colors.oceanBlue, "color")} /></Pressable>
        </>}
      </View>
      {photos.length > 1 && <View style={themeStyle(styles.dots)}>{photos.map((item, i) => <Pressable key={item.uri} accessibilityRole="button" accessibilityLabel={`Show photo ${i + 1}`} accessibilityState={{ selected: i === index }} onPress={() => goTo(i)} style={themeStyle(styles.dotTarget)}><View style={themeStyle([styles.dot, i === index && styles.activeDot])} /></Pressable>)}</View>}
      {photo && <Pressable accessibilityRole="link" accessibilityLabel="View photo credit and license" onPress={() => Linking.openURL(photo.source)} style={themeStyle(styles.credit)}><Text numberOfLines={2} style={themeStyle(styles.creditText)}>{photo.credit || "Wikimedia Commons"} · {photo.license} ↗</Text></Pressable>}
    </View>
  );
}

export default function MapPlacePreview({ area, onClose }) {
  const { themeStyle, themeColor } = useAppTheme();

  const { width, height } = useWindowDimensions();
  const navigation = useNavigation();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    setLoading(true);
    setError(false);
    // Bound the wait so a disconnected API does not leave an endless spinner.
    const timeout = setTimeout(() => controller.abort(), 12000);
    api.getPublicPlaces({ signal: controller.signal }).then(data => { if (!disposed) setPlaces(placesForArea(area, Array.isArray(data) ? data : [])); }).catch(() => { if (!disposed) setError(true); }).finally(() => { clearTimeout(timeout); if (!disposed) setLoading(false); });
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [area, attempt]);
  const rating = summarizeRatings(places);
  const openSaved = () => { onClose(); navigation.navigate("SavedPlaces"); };
  const planTrip = () => { onClose(); navigation.navigate("AIItinerary", { areaId: area.id, placeName: area.name, fromMap: true }); };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={themeStyle(styles.overlay)}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close area preview" style={themeStyle(StyleSheet.absoluteFill)} onPress={onClose} />
        <View accessibilityViewIsModal style={themeStyle([styles.modal, { width: Math.min(560, width - 24), maxHeight: height - 90 }])}>
          <View style={themeStyle(styles.modalHeader)}><Text style={themeStyle(styles.eyebrow)}>EXPLORE PANGASINAN</Text><Pressable accessibilityRole="button" accessibilityLabel="Close area preview" onPress={onClose} style={themeStyle(styles.close)}><X size={22} color={themeColor(colors.oceanBlue, "color")} /></Pressable></View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <PhotoCarousel area={area} />
            <View style={themeStyle(styles.body)}>
              <View style={themeStyle(styles.titleRow)}><View style={themeStyle({ flex: 1 })}><Text style={themeStyle(styles.title)}>{area.name}</Text><View style={themeStyle(styles.location)}><MapPin size={14} color={themeColor(colors.textMuted, "color")} /><Text style={themeStyle(styles.muted)}>Pangasinan, Philippines</Text></View></View><Text style={themeStyle(styles.category)}>{area.kind}</Text></View>
              <View style={themeStyle(styles.ratingBox)}>
                <View style={themeStyle(styles.stars)}>{[1, 2, 3, 4, 5].map(star => <Star key={star} size={22} color={themeColor(rating.average && star <= Math.round(rating.average) ? "#E8A33D" : "#CBD4DA", "color")} fill={themeColor(rating.average && star <= Math.round(rating.average) ? "#E8A33D" : "transparent", "fill")} />)}</View>
                {loading ? <ActivityIndicator color={themeColor(colors.oceanBlue, "color")} /> : <Text style={themeStyle(styles.ratingValue)}>{error ? "Ratings unavailable" : rating.average ? `${rating.average.toFixed(1)} / 5` : "Not yet rated"}</Text>}
                <Text style={themeStyle(styles.muted)}>{loading ? "Loading traveler ratings…" : error ? "Connect to the server to see traveler ratings." : rating.count ? `${rating.count} public saved-place ${rating.count === 1 ? "rating" : "ratings"} in this area` : "Be the first to share your experience in Saved Places."}</Text>
                {error && <Pressable accessibilityRole="button" onPress={() => setAttempt(value => value + 1)}><Text style={themeStyle(styles.retry)}>Retry ratings</Text></Pressable>}
              </View>
              <Text style={themeStyle(styles.sectionTitle)}>A closer look at {area.name}</Text>
              <Text style={themeStyle(styles.description)}>Explore this {area.kind.toLowerCase()} through local photos and places shared by other travelers. Save your favorites and add your own experience in Saved Places.</Text>
              {!loading && !error && places.length > 0 && <View style={themeStyle(styles.sharedPlaces)}><Text style={themeStyle(styles.sectionTitle)}>Places shared by travelers</Text>{places.slice(0, 5).map((place, i) => <View key={place.id || place._id || i} style={themeStyle(styles.sharedPlace)}><View style={themeStyle({ flex: 1 })}><Text style={themeStyle(styles.placeName)}>{place.name}</Text><Text style={themeStyle(styles.muted)}>{place.category}</Text></View>{place.rating > 0 && <View style={themeStyle(styles.location)}><Star size={14} color={themeColor(colors.gold, "color")} fill={themeColor(colors.gold, "fill")} /><Text style={themeStyle(styles.placeName)}>{Number(place.rating).toFixed(1)}</Text></View>}</View>)}</View>}
              <Pressable accessibilityRole="button" accessibilityLabel={`Choose ${area.name} to explore`} onPress={planTrip} style={themeStyle(styles.primary)}><MapPin size={18} color={themeColor(colors.white, "color")} /><Text style={themeStyle(styles.primaryLabel)}>Choose this place to explore</Text><ArrowUpRight size={18} color={themeColor(colors.white, "color")} /></Pressable>
              <Pressable accessibilityRole="button" onPress={openSaved} style={themeStyle(styles.secondary)}><Bookmark size={18} color={themeColor(colors.oceanBlue, "color")} /><Text style={themeStyle(styles.secondaryLabel)}>View Saved Places</Text></Pressable>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(8,35,51,0.6)" },
  modal: { backgroundColor: colors.white, borderRadius: 24, overflow: "hidden", elevation: 12, shadowColor: "#082C44", shadowOpacity: 0.25, shadowRadius: 30 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 22, paddingRight: 8, minHeight: 56 },
  eyebrow: { fontSize: 11, letterSpacing: 1.6, fontWeight: "700", color: colors.textMuted },
  close: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  photoFrame: { width: "100%", aspectRatio: 1.65, backgroundColor: colors.oceanBlueLight, justifyContent: "center", overflow: "hidden" },
  photoFallback: { padding: 32, alignItems: "center", gap: 12 },
  photoBadge: { position: "absolute", bottom: 14, right: 16, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: "rgba(8,35,51,0.75)" },
  photoBadgeText: { color: colors.white, fontSize: 12, fontWeight: "600" },
  photoArrow: { position: "absolute", width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.94)" },
  dots: { flexDirection: "row", justifyContent: "center", paddingTop: 4 },
  dotTarget: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#D1DCE5" },
  activeDot: { width: 22, backgroundColor: colors.sunsetCoral },
  credit: { paddingHorizontal: 22, paddingTop: 6 },
  creditText: { fontSize: 10, color: colors.textMuted, lineHeight: 15 },
  body: { padding: 22, gap: 18 },
  titleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 },
  title: { fontSize: 28, fontWeight: "700", color: colors.oceanBlue, marginBottom: 6 },
  location: { flexDirection: "row", alignItems: "center", gap: 5 },
  muted: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  category: { backgroundColor: colors.palmGreenLight, color: colors.palmGreen, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, fontWeight: "600" },
  ratingBox: { padding: 18, backgroundColor: "#FFF8EB", borderRadius: 16, gap: 9 },
  stars: { flexDirection: "row", gap: 4 },
  ratingValue: { fontWeight: "700", fontSize: 18, color: colors.oceanBlue },
  retry: { color: colors.sunsetCoral, paddingVertical: 10, fontWeight: "600" },
  sectionTitle: { fontWeight: "700", fontSize: 16, color: colors.oceanBlue },
  description: { fontSize: 14, lineHeight: 23, color: colors.textMuted },
  sharedPlaces: { gap: 12 },
  sharedPlace: { borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  placeName: { fontSize: 14, fontWeight: "600", color: colors.oceanBlue },
  primary: { backgroundColor: colors.sunsetCoral, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 50, borderRadius: 12 },
  primaryLabel: { fontSize: 14, fontWeight: "700", color: colors.white },
  secondary: { borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 50, borderRadius: 12 },
  secondaryLabel: { fontSize: 14, fontWeight: "700", color: colors.oceanBlue },
});
