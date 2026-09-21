import { useAppTheme } from "../theme/useAppTheme";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

export default function AdminPage({ title, subtitle, actions, children }) {
  const { themeStyle } = useAppTheme();

  return <ScrollView contentContainerStyle={themeStyle(adminStyles.screen)}><View style={themeStyle(adminStyles.header)}><View><Text style={themeStyle(adminStyles.title)}>{title}</Text>{subtitle ? <Text style={themeStyle(adminStyles.subtitle)}>{subtitle}</Text> : null}</View>{actions ? <View style={themeStyle(adminStyles.actions)}>{actions}</View> : null}</View>{children}</ScrollView>;
}
export const adminStyles = StyleSheet.create({ screen: { flexGrow: 1, padding: 28, backgroundColor: colors.warmSand }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }, title: { fontFamily: "Poppins", fontSize: 26, fontWeight: "700", color: colors.oceanBlue }, subtitle: { marginTop: 4, fontFamily: "DMSans", fontSize: 13, color: colors.textMuted }, actions: { flexDirection: "row", gap: 10 } });
