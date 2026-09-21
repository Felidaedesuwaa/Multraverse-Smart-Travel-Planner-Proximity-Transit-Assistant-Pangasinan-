import { useAppTheme } from "../theme/useAppTheme";
import { Pressable, StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

export default function ToggleSwitch({
  checked,
  onChange,
  accessibilityLabel,
}) {
  const { themeStyle } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked }}
      aria-checked={checked}
      onPress={() => onChange(!checked)}
      style={themeStyle([styles.track, { backgroundColor: checked ? colors.sunsetCoral : "#D9D9D9" }])}
    >
      <View style={[styles.thumb, { transform: [{ translateX: checked ? 20 : 0 }] }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 44, height: 24, borderRadius: 12, padding: 3, justifyContent: "center", flexShrink: 0 },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
});
