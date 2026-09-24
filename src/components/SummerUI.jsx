import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowUpRight, Compass } from "lucide-react-native";
import { useAppTheme } from "../theme/useAppTheme";

export function useSummerColors() {
  return useAppTheme().palette;
}

export function SummerBrand() {
  const palette = useSummerColors();
  return <View style={styles.brand}><View style={styles.logo}><Compass size={23} color="#FFF8EB" strokeWidth={1.6} /></View><View><Text style={[styles.brandName, { color: palette.ink }]}>Multraverse</Text><Text style={[styles.brandSub, { color: palette.muted }]}>PANGASINAN EDITION</Text></View></View>;
}

export function TravelButton({ label, onPress, secondary = false, loading = false, arrow = true, style }) {
  const palette = useSummerColors();
  const color = secondary ? palette.ink : "#153C45";
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} onPress={onPress}
    style={({ pressed, hovered }) => [styles.button, { backgroundColor: secondary ? palette.surface : "#F4B183", borderColor: secondary ? palette.line : "#F4B183", opacity: loading ? 0.7 : 1 }, (pressed || hovered) && { backgroundColor: secondary ? palette.tint : "#F7C5A3", transform: [{ translateY: pressed ? 1 : -2 }] }, style]}>
    {loading ? <ActivityIndicator color={color} /> : <><Text style={[styles.buttonText, { color }]}>{label}</Text>{arrow && <ArrowUpRight size={19} color={color} />}</>}
  </Pressable>;
}

const styles = StyleSheet.create({
  brand: { flexDirection: "row", gap: 10, alignItems: "center" },
  logo: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#256773", alignItems: "center", justifyContent: "center", transform: [{ rotate: "-6deg" }] },
  brandName: { fontFamily: "Poppins", fontSize: 18, lineHeight: 25 },
  brandSub: { fontFamily: "DMSans", fontSize: 9, letterSpacing: 1.6 },
  button: { minHeight: 50, maxWidth: "100%", borderRadius: 14, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 13, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12 },
  buttonText: { fontFamily: "Poppins", fontSize: 14, flexShrink: 1 },
});
