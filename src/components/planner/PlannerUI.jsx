import { FeedbackPressable } from "../WorkspaceMotion";
import { useEffect, useRef } from "react";
import { Platform, Text, TextInput, View } from "react-native";
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
  fieldRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 10 },
};
export function PlannerButton({ children, onPress, disabled = false, icon: Icon, selected = false }) {
  const { themeStyle, themeColor } = useAppTheme();
  return <FeedbackPressable lift accessibilityRole="button" accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress} style={themeStyle({ minHeight: 44, maxWidth: "100%", paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: selected ? colors.oceanBlue : colors.border, borderRadius: 10, backgroundColor: selected ? colors.oceanBlue : colors.warmSand, flexDirection: "row", alignItems: "center", gap: 8, opacity: disabled ? 0.45 : 1 })}>{Icon && <Icon size={17} color={themeColor(selected ? colors.white : colors.oceanBlue)} />}<Text style={themeStyle({ ...plannerStyles.body, flexShrink: 1, color: selected ? colors.white : colors.oceanBlue })}>{children}</Text></FeedbackPressable>;
}
export function PlannerField({ label, value, onChange, money = false, numeric = false, placeholder, error, onBlur, highlight = false, focusAttempt = 0, onInvalidFocus }) {
  const { themeStyle, themeColor } = useAppTheme();
  const input = useRef(null);
  const focusHandler = useRef(onInvalidFocus);
  focusHandler.current = onInvalidFocus;
  useEffect(() => {
    if (!focusAttempt) return;
    const frame = requestAnimationFrame(() => {
      input.current?.focus();
      focusHandler.current?.(input.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusAttempt]);
  const emphasized = !!error && highlight;
  const props = { ref: input, placeholder, onBlur, accessibilityHint: error || placeholder, ...(Platform.OS === "web" ? { "aria-invalid": !!error } : {}), value: String(value ?? ""), onChangeText: onChange, accessibilityLabel: label, style: themeStyle([plannerStyles.input, error && { borderColor: colors.sunsetCoral }, emphasized && { borderWidth: 2, padding: 11, backgroundColor: colors.coralLight }]), placeholderTextColor: themeColor(colors.textMuted) };
  return <View style={{ minWidth: 160, maxWidth: "100%", flexBasis: 220, flexGrow: 1, flexShrink: 1, gap: 6 }}><Text style={themeStyle(plannerStyles.body)}>{label}</Text>{money ? <MoneyInput {...props} /> : <TextInput {...props} keyboardType={numeric ? "number-pad" : "default"} />}{!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={themeStyle({ ...plannerStyles.body, alignSelf: "stretch", flexShrink: 1, fontSize: 12, lineHeight: 18, color: colors.sunsetCoral })}>{error}</Text>}</View>;
}
