import { useAppTheme } from "../theme/useAppTheme";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Compass } from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../theme/colors";

export default function AuthLayout({ title, subtitle, children, footer, showBack = true }) {
  const { themeStyle, themeColor } = useAppTheme();

  const navigation = useNavigation();

  return (
    <SafeAreaView style={themeStyle(styles.screen)}>
      <Svg style={themeStyle(styles.wave)} viewBox="0 0 500 150" preserveAspectRatio="none"><Path d="M0,80 C120,120 380,20 500,80 L500,150 L0,150 Z" fill={themeColor("rgba(255,255,255,0.06)", "fill")} /></Svg>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
      <View style={themeStyle(styles.content)}>
        {showBack && navigation.canGoBack() ? <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={themeStyle(styles.back)}><ChevronLeft size={22} color={themeColor(colors.white, "color")} /></Pressable> : null}
        <View style={themeStyle(styles.heading)}>
          <LinearGradient colors={([colors.sunsetCoral, "#F2A63E"]).map(value => themeColor(value, "backgroundColor"))} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={themeStyle(styles.logo)}><Compass size={34} color={themeColor(colors.white, "color")} /></LinearGradient>
          <Text style={themeStyle(styles.title)}>{title}</Text>
          <Text style={themeStyle(styles.subtitle)}>{subtitle}</Text>
        </View>
        {children}
        <View style={themeStyle(styles.footer)}>{footer}</View>
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.oceanBlue },
  keyboard: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  wave: { position: "absolute", bottom: 0, left: 0, width: "100%", height: 140, opacity: 0.5 },
  content: { width: "100%", maxWidth: 420, zIndex: 1 },
  back: { alignSelf: "flex-start", marginBottom: 16, padding: 2 },
  heading: { alignItems: "center", marginBottom: 28 },
  logo: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  title: { fontFamily: "Poppins", fontWeight: "700", fontSize: 26, color: colors.white, textAlign: "center" },
  subtitle: { fontFamily: "DMSans", fontSize: 14, color: "#A9C4D4", textAlign: "center", marginTop: 8, maxWidth: 320 },
  footer: { marginTop: 24, alignItems: "center" },
});
