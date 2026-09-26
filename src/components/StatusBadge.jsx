import { useAppTheme } from "../theme/useAppTheme";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

const statusStyles = {
  superadmin: { bg: colors.oceanBlueLight, text: colors.oceanBlue },
  admin: { bg: colors.oceanBlueLight, text: colors.oceanBlue },
  lgu: { bg: colors.palmGreenLight, text: colors.palmGreen },
  pending: { bg: colors.coralLight, text: colors.sunsetCoral },
  approved: { bg: colors.palmGreenLight, text: colors.palmGreen },
  rejected: { bg: colors.coralLight, text: colors.sunsetCoral },
  upcoming: { bg: colors.coralLight, text: colors.sunsetCoral },
  completed: { bg: colors.palmGreenLight, text: colors.palmGreen },
  active: { bg: colors.palmGreenLight, text: colors.palmGreen },
  inactive: { bg: "#EFEFEF", text: colors.textMuted },
  suspended: { bg: colors.coralLight, text: colors.sunsetCoral },
};

export default function StatusBadge({ status }) {
  const { themeStyle } = useAppTheme();

  const statusStyle = statusStyles[status] || statusStyles.inactive;
  return (
    <View style={themeStyle([styles.badge, { backgroundColor: statusStyle.bg }])}>
      <Text style={themeStyle([styles.label, { color: statusStyle.text }])}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  label: { fontFamily: "DMSans", fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
});
