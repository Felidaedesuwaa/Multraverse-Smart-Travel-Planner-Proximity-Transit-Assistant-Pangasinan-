import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

/** A shared, compact hero used by every AI tool. */
export default function AIToolHeader({ eyebrow = "MULTRAVERSE AI TOOLS", title, subtitle, badges = [], Icon, compact = false }) {
  return <View style={[styles.hero, compact && styles.heroCompact]}>
    <View style={styles.content}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {!!badges.length && <View style={styles.badges}>{badges.map((badge, index) => <View key={badge.label} style={styles.badge}><View style={[styles.dot, { backgroundColor: badge.color || (index ? "#F59E0B" : "#22C55E") }]} /><Text style={styles.badgeText}>{badge.label}</Text></View>)}</View>}
    </View>
    {Icon && <View style={[styles.icon, compact && styles.iconCompact]}><Icon size={compact ? 24 : 30} color={colors.white} /></View>}
  </View>;
}

const styles = StyleSheet.create({
  hero: { backgroundColor: "#0B3C5D", borderRadius: 20, padding: 28, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 18 },
  heroCompact: { padding: 18, borderRadius: 16, gap: 12 },
  content: { flex: 1, minWidth: 0 },
  eyebrow: { color: "#7BB8D4", fontFamily: "DMSans", fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 6 },
  title: { color: colors.white, fontFamily: "Poppins", fontSize: 28, fontWeight: "800", marginBottom: 8 },
  subtitle: { color: "#A8CCE0", fontFamily: "DMSans", fontSize: 14, lineHeight: 20, maxWidth: 560, marginBottom: 16 },
  badges: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { color: "#C8E1EE", fontFamily: "DMSans", fontSize: 12, fontWeight: "600" },
  icon: { width: 64, height: 64, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  iconCompact: { width: 48, height: 48, borderRadius: 13 },
});
