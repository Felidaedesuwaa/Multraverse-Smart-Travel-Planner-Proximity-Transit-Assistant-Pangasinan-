import { useAppTheme } from "../theme/useAppTheme";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Compass } from "lucide-react-native";
import { colors } from "../theme/colors";
import PangasinanMap from "../components/PangasinanMap";

export default function UserDashboard() {
  const { themeStyle, themeColor } = useAppTheme();

  const { width } = useWindowDimensions();
  const compact = width < 768;
  return (
    <ScrollView contentContainerStyle={themeStyle([styles.screen, compact && { padding: 16 }])} nestedScrollEnabled>
      <View style={themeStyle(styles.header)}>
        <View style={themeStyle(styles.eyebrowRow)}><Compass size={16} color={themeColor(colors.sunsetCoral, "color")} /><Text style={themeStyle(styles.eyebrow)}>YOUR NEXT ADVENTURE</Text></View>
        <Text style={themeStyle([styles.title, compact && { fontSize: 27 }])}>Discover Pangasinan</Text>
        <Text style={themeStyle(styles.subtitle)}>One province. A world of places to explore.</Text>
      </View>
      <PangasinanMap />
      <Text style={themeStyle(styles.note)}>Explore the map and photo previews offline. Connect to see the latest traveler ratings.</Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: { flexGrow: 1, padding: 28, backgroundColor: colors.warmSand },
  header: { gap: 10, marginBottom: 24 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyebrow: { color: colors.sunsetCoral, fontWeight: "700", fontSize: 11, letterSpacing: 1.5 },
  title: { fontSize: 34, fontWeight: "700", color: colors.oceanBlue },
  subtitle: { fontSize: 14, lineHeight: 22, color: colors.textMuted },
  note: { marginTop: 14, fontSize: 11, lineHeight: 18, color: colors.textMuted },
});
