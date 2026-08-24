import { StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

export default function Card({ children, style }) {
  return (
    <View style={[styles.card, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.oceanBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
});
