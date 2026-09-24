import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Compass, Sun, Waves } from "lucide-react-native";
import SummerScene from "./SummerScene";
import { SummerBrand, useSummerColors } from "./SummerUI";

export default function LoginLayout({ title, subtitle, children, footer, onBack }) {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const palette = useSummerColors();
  return <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}>
        <View style={styles.topbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to landing page" onPress={onBack} style={({ pressed, hovered }) => [styles.back, (pressed || hovered) && { backgroundColor: palette.tint }]}><ArrowLeft size={19} color={palette.ink} /><Text style={[styles.backText, { color: palette.ink }]}>Back to home</Text></Pressable>
          {!compact && <SummerBrand />}
          {compact && <Compass size={24} color={palette.accent} />}
        </View>
        <View style={[styles.main, compact && styles.mainCompact]}>
          {!compact && <View style={styles.story}>
            <View style={styles.eyebrow}><Sun size={17} color={palette.accent} /><Text style={[styles.kicker, { color: palette.accent }]}>LET THE GOOD DAYS BEGIN</Text></View>
            <Text style={[styles.storyTitle, { color: palette.ink }]}>A new day. A new{"\n"}direction to explore.</Text>
            <Text style={[styles.storyText, { color: palette.muted }]}>A familiar place for your next adventure. Pick up your plans and let Pangasinan surprise you.</Text>
            <View style={[styles.art, { borderColor: palette.line, backgroundColor: palette.surface }]}><SummerScene /></View>
            <View style={styles.storyNote}><Waves size={20} color={palette.muted} /><Text style={[styles.noteText, { color: palette.muted }]}>A little closer to your next coastal escape.</Text></View>
          </View>}
          <View style={[styles.formColumn, compact && styles.formColumnCompact]}>
            {compact && <View style={styles.mobileArt}><SummerScene compact /></View>}
            <View style={[styles.card, { backgroundColor: palette.dark ? "#20363F" : "#123F52" }, compact && styles.cardCompact]}>
              <View style={styles.cardEyebrow}><View style={styles.miniCompass}><Compass size={21} color="#F5BC92" /></View><Text style={styles.cardKicker}>YOUR JOURNEY CONTINUES</Text></View>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
              {children}
              <View style={styles.footer}>{footer}</View>
            </View>
            <Text style={[styles.formNote, { color: palette.muted }]}>Pack your curiosity. Your plans are waiting.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 36, paddingTop: 22, paddingBottom: 36 },
  scrollCompact: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  topbar: { width: "100%", maxWidth: 1120, alignSelf: "center", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  back: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, borderRadius: 12 },
  backText: { fontFamily: "DMSans", fontSize: 14 },
  main: { flexGrow: 1, width: "100%", maxWidth: 1060, alignSelf: "center", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 70, paddingVertical: 34 },
  mainCompact: { flexDirection: "column", justifyContent: "center", paddingVertical: 18, gap: 0 },
  story: { flex: 1, minWidth: 0, maxWidth: 490 },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  kicker: { fontFamily: "DMSans", fontSize: 10, letterSpacing: 1.5 },
  storyTitle: { fontFamily: "Poppins", fontSize: 32, lineHeight: 44, letterSpacing: -1 },
  storyText: { fontFamily: "DMSans", fontSize: 14, lineHeight: 24, marginTop: 12, marginBottom: 24, maxWidth: 430 },
  art: { padding: 9, borderRadius: 34, borderWidth: 1 },
  storyNote: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  noteText: { fontFamily: "DMSans", fontSize: 12, flexShrink: 1 },
  formColumn: { flexGrow: 1, flexBasis: 0, minWidth: 0, maxWidth: 440 },
  formColumnCompact: { width: "100%", flexGrow: 0, flexBasis: "auto" },
  mobileArt: { marginBottom: 14 },
  card: { padding: 34, borderRadius: 28, shadowColor: "#142F37", shadowOpacity: 0.12, shadowOffset: { width: 0, height: 16 }, shadowRadius: 25, elevation: 4 },
  cardCompact: { padding: 24 },
  cardEyebrow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 23 },
  miniCompass: { padding: 8, borderWidth: 1, borderColor: "#537078", borderRadius: 12 },
  cardKicker: { fontFamily: "DMSans", fontSize: 9, letterSpacing: 1.5, color: "#C0D9D4", flexShrink: 1 },
  title: { fontFamily: "Poppins", fontSize: 27, color: "#FFF9EF", marginBottom: 8 },
  subtitle: { fontFamily: "DMSans", fontSize: 14, lineHeight: 23, color: "#BDD3D8", marginBottom: 28 },
  footer: { marginTop: 26, paddingTop: 22, borderTopWidth: 1, borderTopColor: "#395F6C", alignItems: "center" },
  formNote: { fontFamily: "DMSans", fontSize: 12, textAlign: "center", marginTop: 18, lineHeight: 19 },
});
