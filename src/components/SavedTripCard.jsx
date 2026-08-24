import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import StatusBadge from "./StatusBadge";

export default function SavedTripCard({
  title,
  status,
  date,
  progress,
}) {
  const barColor = status === "completed" ? colors.palmGreen : colors.sunsetCoral;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <StatusBadge status={status} />
      </View>
      <Text style={styles.date}>{date}</Text>
      <View style={styles.track}>
        <View style={[styles.progress, { width: `${progress}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 14, marginBottom: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  title: { flex: 1, fontFamily: "DMSans", fontSize: 13, fontWeight: "600", color: colors.white },
  date: { fontFamily: "DMSans", fontSize: 11, color: "#8FB0C2", marginBottom: 8 },
  track: { height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  progress: { height: "100%", borderRadius: 999 },
});
