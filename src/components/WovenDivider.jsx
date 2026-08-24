import { StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

export default function WovenDivider({
  color = colors.sunsetCoral,
  count = 26,
}) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 3,
            height: 9,
            borderRadius: 1,
            backgroundColor: color,
            opacity: i % 3 === 0 ? 1 : 0.3,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", gap: 3, marginBottom: 12 },
});
