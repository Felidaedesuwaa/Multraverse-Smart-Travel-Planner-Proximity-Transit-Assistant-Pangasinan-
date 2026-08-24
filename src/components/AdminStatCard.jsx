import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import Card from "./Card";
import WovenDivider from "./WovenDivider";

export default function AdminStatCard({
  label,
  value,
  delta,
  icon,
  iconBg,
  dividerColor,
}) {
  return (
    <Card style={{ flex: 1 }}>
      <WovenDivider color={dividerColor ?? colors.sunsetCoral} count={20} />
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>{label.toUpperCase()}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
        <View style={[styles.icon, { backgroundColor: iconBg }]}>
          {icon}
        </View>
      </View>
      <Text style={styles.delta}>{delta}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  label: { fontFamily: "DMSans", fontSize: 11, fontWeight: "600", letterSpacing: 0.5, color: colors.textMuted, marginBottom: 8 },
  value: { fontFamily: "Poppins", fontSize: 26, fontWeight: "700", color: colors.textPrimary },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  delta: { fontFamily: "DMSans", fontSize: 12, color: colors.textMuted, marginTop: 8 },
});
