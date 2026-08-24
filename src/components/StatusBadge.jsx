import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

const statusStyles = {
  upcoming: { bg: colors.coralLight, text: colors.sunsetCoral },
  completed: { bg: colors.palmGreenLight, text: colors.palmGreen },
  active: { bg: colors.palmGreenLight, text: colors.palmGreen },
  inactive: { bg: "#EFEFEF", text: colors.textMuted },
  suspended: { bg: colors.coralLight, text: colors.sunsetCoral },
};

export default function StatusBadge({ status }) {
  const statusStyle = statusStyles[status] || statusStyles.inactive;
  return (
    <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
      <Text style={[styles.label, { color: statusStyle.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  label: { fontFamily: "DMSans", fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
});
