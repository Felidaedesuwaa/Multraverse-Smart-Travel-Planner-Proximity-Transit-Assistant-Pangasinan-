import { Pressable, Text, TextInput, View } from "react-native";
import { useAppTheme } from "../../theme/useAppTheme";
import { colors } from "../../theme/colors";
import MoneyInput from "../MoneyInput";

export const plannerStyles = {
  page: { padding: 20, paddingBottom: 48, gap: 22, backgroundColor: colors.warmSand },
  card: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 16 },
  title: { fontFamily: "Poppins", fontSize: 28, fontWeight: "700", color: colors.oceanBlue },
  heading: { fontFamily: "Poppins", fontSize: 19, fontWeight: "600", color: colors.oceanBlue },
  body: { fontFamily: "DMSans", fontSize: 14, lineHeight: 22, color: colors.textPrimary },
  input: { minHeight: 46, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, fontFamily: "DMSans", fontSize: 14, color: colors.textPrimary, backgroundColor: colors.white },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
};
export function PlannerButton({ children, onPress, disabled = false, icon: Icon, selected = false }) {
  const { themeStyle, themeColor } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress} style={themeStyle({ minHeight: 44, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: selected ? colors.oceanBlue : colors.border, borderRadius: 10, backgroundColor: selected ? colors.oceanBlue : colors.warmSand, flexDirection: "row", alignItems: "center", gap: 8, opacity: disabled ? 0.45 : 1 })}>{Icon && <Icon size={17} color={themeColor(selected ? colors.white : colors.oceanBlue)} />}<Text style={themeStyle({ ...plannerStyles.body, color: selected ? colors.white : colors.oceanBlue })}>{children}</Text></Pressable>;
}
export function PlannerField({ label, value, onChange, money = false, numeric = false }) {
  const { themeStyle, themeColor } = useAppTheme();
  const props = { value: String(value), onChangeText: onChange, accessibilityLabel: label, style: themeStyle(plannerStyles.input), placeholderTextColor: themeColor(colors.textMuted) };
  return <View style={{ minWidth: 160, flex: 1, gap: 6 }}><Text style={themeStyle(plannerStyles.body)}>{label}</Text>{money ? <MoneyInput {...props} /> : <TextInput {...props} keyboardType={numeric ? "number-pad" : "default"} />}</View>;
}
