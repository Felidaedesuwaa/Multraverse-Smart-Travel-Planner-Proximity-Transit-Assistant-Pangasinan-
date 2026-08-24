import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";

export default function AdminHeaderButton({
  icon,
  label,
  filled,
  fillColor,
  onClick,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress || onClick}
      style={[styles.button, filled ? { backgroundColor: fillColor || colors.sunsetCoral } : styles.outline]}
    >
      {icon}
      <Text style={[styles.label, { color: filled ? colors.white : colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  outline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  label: { fontFamily: "DMSans", fontSize: 13, fontWeight: "600" },
});
