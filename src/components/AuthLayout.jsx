import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Compass } from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../theme/colors";

export default function AuthLayout({ title, subtitle, children, footer, showBack = true }) {
  const navigation = useNavigation();

  return (
    <View style={styles.screen}>
      <Svg style={styles.wave} viewBox="0 0 500 150" preserveAspectRatio="none"><Path d="M0,80 C120,120 380,20 500,80 L500,150 L0,150 Z" fill="rgba(255,255,255,0.06)" /></Svg>
      <View style={styles.content}>
        {showBack && navigation.canGoBack() ? <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}><ChevronLeft size={22} color={colors.white} /></Pressable> : null}
        <View style={styles.heading}>
          <LinearGradient colors={[colors.sunsetCoral, "#F2A63E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}><Compass size={34} color={colors.white} /></LinearGradient>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {children}
        <View style={styles.footer}>{footer}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: "100%", backgroundColor: colors.oceanBlue, alignItems: "center", justifyContent: "center", padding: 24, overflow: "hidden" },
  wave: { position: "absolute", bottom: 0, left: 0, width: "100%", height: 140, opacity: 0.5 },
  content: { width: "100%", maxWidth: 420, zIndex: 1 },
  back: { alignSelf: "flex-start", marginBottom: 16, padding: 2 },
  heading: { alignItems: "center", marginBottom: 28 },
  logo: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  title: { fontFamily: "Poppins", fontWeight: "700", fontSize: 26, color: colors.white, textAlign: "center" },
  subtitle: { fontFamily: "DMSans", fontSize: 14, color: "#A9C4D4", textAlign: "center", marginTop: 8, maxWidth: 320 },
  footer: { marginTop: 24, alignItems: "center" },
});
