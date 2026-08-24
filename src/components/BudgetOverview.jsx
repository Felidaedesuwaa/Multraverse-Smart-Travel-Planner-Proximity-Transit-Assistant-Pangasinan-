import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import WovenDivider from "./WovenDivider";

export default function BudgetOverview({ entries }) {
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const max = Math.max(...entries.map((entry) => entry.amount), 1);

  return (
    <View style={styles.card}>
      <WovenDivider />
      <Text style={styles.eyebrow}>Total spent</Text>
      <View style={styles.totalRow}>
        <Text style={styles.total}>₱{total.toLocaleString()}</Text>
        <Text style={styles.status}>On budget</Text>
      </View>

      <View style={styles.entries}>
        {entries.length === 0 ? (
          <Text style={styles.empty}>No expenses yet</Text>
        ) : entries.map((entry) => (
          <View key={entry.label}>
            <View style={styles.entryHeader}>
              <View style={styles.entryLabelRow}>
                <View style={[styles.dot, { backgroundColor: entry.color }]} />
                <Text style={styles.entryLabel}>{entry.label}</Text>
              </View>
              <Text style={styles.amount}>₱{entry.amount}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.progress, { width: `${(entry.amount / max) * 100}%`, backgroundColor: entry.color }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 16 },
  eyebrow: { fontFamily: "DMSans", fontSize: 12, color: "#8FB0C2" },
  totalRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4, marginBottom: 16 },
  total: { fontFamily: "Poppins", fontSize: 26, fontWeight: "700", color: colors.white },
  status: { fontFamily: "DMSans", fontSize: 11, fontWeight: "600", color: colors.palmGreen, backgroundColor: colors.palmGreenLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  entries: { gap: 12 },
  empty: { fontFamily: "DMSans", fontSize: 13, color: "#C9DAE3" },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  entryLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  entryLabel: { fontFamily: "DMSans", fontSize: 13, color: "#C9DAE3", flexShrink: 1 },
  amount: { fontFamily: "DMSans", fontSize: 13, color: colors.white },
  track: { height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  progress: { height: "100%", borderRadius: 999 },
});
