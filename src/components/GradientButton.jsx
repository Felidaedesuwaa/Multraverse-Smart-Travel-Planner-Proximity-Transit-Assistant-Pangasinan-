import { FeedbackPressable } from "./WorkspaceMotion";
import { useAppTheme } from "../theme/useAppTheme";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme/colors";

export default function GradientButton({ label, loading, disabled, onPress, onClick, style }) {
  const { themeStyle, themeColor } = useAppTheme();

  const isDisabled = disabled || loading;
  return (
    <FeedbackPressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!isDisabled, busy: !!loading }} disabled={isDisabled} onPress={onPress || onClick} style={themeStyle([styles.pressable, style])}>
      <LinearGradient
        colors={(isDisabled ? ["#B8B8B8", "#9E9E9E"] : [colors.sunsetCoral, "#F2A63E"]).map(value => themeColor(value, "backgroundColor"))}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={themeStyle(styles.gradient)}
      >
        {loading ? <ActivityIndicator color={themeColor(colors.white, "color")} /> : <Text style={themeStyle(styles.label)}>{label}</Text>}
      </LinearGradient>
    </FeedbackPressable>
  );
}

const styles = StyleSheet.create({
  pressable: { width: "100%", height: 54, borderRadius: 16, overflow: "hidden" },
  gradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { color: colors.white, fontFamily: "Poppins", fontWeight: "600", fontSize: 16 },
});
