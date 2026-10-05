import { useAppTheme } from "../theme/useAppTheme";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import StatusBadge from "./StatusBadge";

export default function SavedTripCard({
  title,
  status,
  date,
  progress,
  variant,
}) {
  const { themeStyle, palette } = useAppTheme();
  const dashboard = variant === "dashboard";

  const barColor = status === "completed" ? colors.palmGreen : colors.sunsetCoral;
  return (
    <View style={[themeStyle(styles.card), dashboard && styles.dashboardCard, dashboard && { backgroundColor: palette.surface }]}>
      <View style={themeStyle(styles.header)}>
        <Text style={[themeStyle(styles.title), dashboard && styles.dashboardTitle, dashboard && { color: palette.ink }]}>{title}</Text>
        <StatusBadge status={status} />
      </View>
      <Text style={[themeStyle(styles.date), dashboard && styles.dashboardDate, dashboard && { color: palette.muted }]}>{date}</Text>
      <View style={[themeStyle(styles.track), dashboard && styles.dashboardTrack, dashboard && { backgroundColor: palette.line }]}>
        <View style={themeStyle([styles.progress, { width: `${progress}%`, backgroundColor: barColor }])} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dashboardCard: { borderRadius: 22, padding: 20, marginBottom: 0 },
  dashboardTitle: { fontSize: 16, lineHeight: 24, fontWeight: "500" },
  dashboardDate: { fontSize: 13, lineHeight: 20, marginTop: 4, marginBottom: 14 },
  dashboardTrack: { height: 5 },
  card: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 14, marginBottom: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  title: { flex: 1, fontFamily: "DMSans", fontSize: 13, fontWeight: "600", color: colors.white },
  date: { fontFamily: "DMSans", fontSize: 11, color: "#8FB0C2", marginBottom: 8 },
  track: { height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  progress: { height: "100%", borderRadius: 999 },
});
