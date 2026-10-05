import MoneyAmount from "./MoneyAmount";
import { useAppTheme } from "../theme/useAppTheme";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import WovenDivider from "./WovenDivider";

export default function BudgetOverview({ entries, settings }) {
  const { themeStyle } = useAppTheme();

  const total = entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const hasBudget = settings?.monthlyBudget != null;
  const monthlyBudget = Number(settings?.monthlyBudget) || 0;
  const remaining = monthlyBudget - total;
  const overBudget = hasBudget && remaining < 0;
  const max = Math.max(...entries.map((entry) => entry.amount), 1);

  return (
    <View style={themeStyle(styles.card)}>
      <WovenDivider />
      <Text style={themeStyle(styles.eyebrow)}>Total spent</Text>
      <View style={themeStyle(styles.totalRow)}>
        <Text style={themeStyle(styles.total)}><MoneyAmount value={total} /></Text>
        <Text style={themeStyle([styles.status, overBudget && { color: colors.sunsetCoral, backgroundColor: colors.coralLight }])}>{!hasBudget ? "Budget not set" : overBudget ? "Over budget" : "On budget"}</Text>
      </View>

      <View style={themeStyle(styles.summary)}>
        <View style={themeStyle(styles.entryHeader)}>
          <Text style={themeStyle(styles.entryLabel)}>Monthly budget</Text>
          <Text style={themeStyle(styles.amount)}>{hasBudget ? <MoneyAmount value={monthlyBudget} /> : "Not set"}</Text>
        </View>
        <View style={themeStyle(styles.entryHeader)}>
          <Text style={themeStyle(styles.entryLabel)}>{overBudget ? "Over budget by" : "Remaining"}</Text>
          <Text style={themeStyle(styles.amount)}>{hasBudget ? <MoneyAmount value={Math.abs(remaining)} /> : "Not set"}</Text>
        </View>
      </View>
      <View style={themeStyle(styles.entries)}>
        {entries.length === 0 ? (
          <Text style={themeStyle(styles.empty)}>No expenses yet</Text>
        ) : entries.map((entry) => (
          <View key={entry._id ?? entry.id ?? entry.label}>
            <View style={themeStyle(styles.entryHeader)}>
              <View style={themeStyle(styles.entryLabelRow)}>
                <View style={themeStyle([styles.dot, { backgroundColor: entry.color }])} />
                <Text style={themeStyle(styles.entryLabel)}>{entry.label}</Text>
              </View>
              <Text style={themeStyle(styles.amount)}><MoneyAmount value={entry.amount} /></Text>
            </View>
            <View style={themeStyle(styles.track)}>
              <View style={themeStyle([styles.progress, { width: `${(entry.amount / max) * 100}%`, backgroundColor: entry.color }])} />
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
  totalRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 4, marginBottom: 16 },
  total: { ...typography.number, fontSize: 26, color: colors.white },
  status: { fontFamily: "DMSans", fontSize: 11, fontWeight: "600", color: colors.palmGreen, backgroundColor: colors.palmGreenLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  summary: { gap: 8, marginBottom: 16 },
  entries: { gap: 12 },
  empty: { fontFamily: "DMSans", fontSize: 13, color: "#C9DAE3" },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  entryLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  entryLabel: { fontFamily: "DMSans", fontSize: 13, color: "#C9DAE3", flexShrink: 1 },
  amount: { ...typography.number, fontSize: 13, color: colors.white },
  track: { height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  progress: { height: "100%", borderRadius: 999 },
});
