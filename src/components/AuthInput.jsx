import { useAppTheme } from "../theme/useAppTheme";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { colors } from "../theme/colors";

export default function AuthInput({ label, error, isPassword, value, onChangeText, onChange, placeholder, ...props }) {
  const { themeStyle, themeColor } = useAppTheme();

  const [hidden, setHidden] = useState(isPassword);

  return (
    <View style={themeStyle(styles.wrapper)}>
      <Text style={themeStyle(styles.label)}>{label}</Text>
      <View style={themeStyle([styles.inputRow, { borderColor: error ? colors.sunsetCoral : "rgba(255,255,255,0.15)" }])}>
        <TextInput
          value={value}
          onChangeText={onChangeText || onChange}
          placeholder={placeholder}
          placeholderTextColor={themeColor("#8FB0C2", "color")}
          secureTextEntry={isPassword && hidden}
          autoCapitalize="none"
          autoCorrect={false}
          style={themeStyle(styles.input)}
          {...props}
        />
        {isPassword && (
          <Pressable accessibilityRole="button" accessibilityLabel={hidden ? "Show password" : "Hide password"} onPress={() => setHidden(!hidden)} style={themeStyle(styles.toggle)}>
            {hidden ? <EyeOff size={18} color={themeColor("#8FB0C2", "color")} /> : <Eye size={18} color={themeColor("#8FB0C2", "color")} />}
          </Pressable>
        )}
      </View>
      {error ? <Text style={themeStyle(styles.error)}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 18 },
  label: { fontFamily: "DMSans", fontSize: 13, color: colors.white, marginBottom: 6 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, minHeight: 50 },
  input: { flex: 1, fontFamily: "DMSans", fontSize: 15, color: colors.white, paddingVertical: 12 },
  toggle: { padding: 4, marginLeft: 8 },
  error: { fontFamily: "DMSans", fontSize: 12, color: "#FF9B85", marginTop: 4 },
});
