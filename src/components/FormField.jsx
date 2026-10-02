import { FeedbackPressable } from "./WorkspaceMotion";
import { forwardRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";
import { colors } from "../theme/colors";
import NameInput from './NameInput';

export default forwardRef(function FormField({ label, error, hint, password, lettersOnly = false, ...props }, ref) {
  const { themeStyle, themeColor } = useAppTheme();
  const [hidden, setHidden] = useState(true);
  const Input = lettersOnly ? NameInput : TextInput;
  return <View style={styles.field}>
    <Text style={themeStyle(styles.label)}>{label}</Text>
    <View style={themeStyle([styles.row, error && styles.invalid])}>
      <Input {...props} ref={ref} accessibilityLabel={label} accessibilityHint={error || hint} aria-invalid={!!error} secureTextEntry={password && hidden} placeholderTextColor={themeColor(colors.textMuted)} style={themeStyle(styles.input)} />
      {password && <FeedbackPressable accessibilityRole="button" accessibilityLabel={hidden ? `Show ${label}` : `Hide ${label}`} onPress={() => setHidden(!hidden)} style={styles.toggle}><Text style={themeStyle(styles.toggleText)}>{hidden ? "Show" : "Hide"}</Text></FeedbackPressable>}
    </View>
    {!!hint && <Text style={themeStyle(styles.hint)}>{hint}</Text>}
    {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={themeStyle(styles.error)}>{error}</Text>}
  </View>;
});
const styles = StyleSheet.create({
  field: { gap: 6, minWidth: 0 }, label: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  row: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.warmSand },
  input: { flex: 1, minWidth: 0, minHeight: 48, padding: 12, fontSize: 15, color: colors.textPrimary },
  invalid: { borderColor: colors.sunsetCoral, borderWidth: 2 },
  hint: { fontSize: 12, lineHeight: 18, color: colors.textMuted }, error: { fontSize: 12, lineHeight: 18, color: colors.sunsetCoral },
  toggle: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }, toggleText: { fontSize: 12, color: colors.oceanBlue },
});
