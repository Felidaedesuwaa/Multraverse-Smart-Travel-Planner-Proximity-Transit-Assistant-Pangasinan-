import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ArrowRight, BellRing, Compass, MapPin, Route, Sun, Umbrella, Wallet, Waves } from "lucide-react-native";
import SummerScene from "../components/SummerScene";
import { SummerBrand, TravelButton, useSummerColors } from "../components/SummerUI";

const features = [
  { Icon: Route, number: "01", title: "Find your kind of adventure", text: "Explore places across Pangasinan and bring your favorites together in an AI itinerary.", note: "A plan that feels like you", color: "#DCECE2" },
  { Icon: Wallet, number: "02", title: "Pack a plan. Keep your budget.", text: "Keep trip costs and expenses in one place, with your preferred currency alongside pesos.", note: "More memories, less guesswork", color: "#F9E3C2" },
  { Icon: BellRing, number: "03", title: "Enjoy the journey, too", text: "Get ready for the road with transit alerts, saved places, and useful local phrases.", note: "Your travel companion", color: "#F7DDD2" },
];

export default function LandingPage() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const palette = useSummerColors();
  const signUp = () => navigation.navigate("Register");
  const login = () => navigation.navigate("Login");
  return <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={["top", "left", "right"]}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[styles.nav, { borderBottomColor: palette.line }]}><View style={styles.navInner}>
        <SummerBrand />
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={login} style={({ pressed, hovered }) => [styles.navLogin, (pressed || hovered) && { backgroundColor: palette.tint }]}><Text style={[styles.link, { color: palette.ink }]}>Log in</Text><ArrowRight size={16} color={palette.ink} /></Pressable>
          {width >= 520 && <TravelButton label="Sign up free" onPress={signUp} arrow={false} />}
        </View>
      </View></View>
      <View style={[styles.hero, compact && styles.heroCompact]}>
        <View style={[styles.heroCopy, compact && styles.fullWidth]}>
          <View style={[styles.eyebrow, { backgroundColor: palette.tint }]}><Sun size={16} color={palette.accent} /><Text style={[styles.eyebrowText, { color: palette.ink }]}>A LITTLE SUN. A NEW ADVENTURE.</Text></View>
          <Text accessibilityRole="header" style={[styles.heroTitle, { color: palette.ink }, compact && styles.heroTitleCompact]}>Find your next{"\n"}<Text style={{ color: palette.accent }}>Pangasinan</Text>{"\n"}escape.</Text>
          <Text style={[styles.heroText, { color: palette.muted }]}>From island days to unhurried coastal stops, make room for the good stuff. Your places, your budget, your next great trip.</Text>
          <View style={styles.ctas}><TravelButton label="Plan my getaway" onPress={signUp} /><TravelButton label="Sign in" onPress={login} secondary arrow={false} /></View>
          <View style={styles.heroNote}><Compass size={18} color={palette.muted} /><Text style={[styles.small, { color: palette.muted }]}>Made for exploring Pangasinan, at your pace.</Text></View>
        </View>
        <View style={[styles.postcard, compact && styles.fullWidth]}>
          <View style={[styles.postcardFrame, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            <SummerScene />
            <View style={styles.postcardFooter}><View style={{ flex: 1 }}><Text style={[styles.postcardKicker, { color: palette.muted }]}>YOUR NEXT CHAPTER</Text><Text style={[styles.postcardTitle, { color: palette.ink }]}>Meet you by the coast.</Text></View><View style={[styles.stamp, { borderColor: palette.line }]}><Umbrella size={25} color={palette.accent} /></View></View>
          </View>
        </View>
      </View>
      <View style={[styles.ribbon, { backgroundColor: palette.tint }]}>
        {[{ Icon: Waves, label: "Island days" }, { Icon: Sun, label: "Sun-kissed shores" }, { Icon: MapPin, label: "Local discoveries" }].map(({ Icon, label }) => <View key={label} style={styles.ribbonItem}><Icon size={20} strokeWidth={1.5} color={palette.ink} /><Text style={[styles.ribbonText, { color: palette.ink }]}>{label}</Text></View>)}
      </View>
      <View style={[styles.section, compact && styles.sectionCompact]}>
        <View style={[styles.sectionHeading, compact && { alignItems: "flex-start" }]}><Text style={[styles.kicker, { color: palette.accent }]}>GOOD TRIPS START HERE</Text><Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.ink }]}>Less juggling. More journey.</Text><Text style={[styles.sectionSubtitle, { color: palette.muted }]}>A few thoughtful tools, so you can focus on being there.</Text></View>
        <View style={[styles.featureGrid, compact && { flexDirection: "column" }]}>
          {features.map(({ Icon, number, title, text, note, color }) => <View key={number} style={[styles.featureCard, compact && { flexGrow: 0, flexBasis: "auto" }, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            <View style={styles.featureTop}><View style={[styles.featureIcon, { backgroundColor: color }]}><Icon size={25} color="#285960" strokeWidth={1.5} /></View><Text style={[styles.featureNumber, { color: palette.muted }]}>{number}</Text></View>
            <Text style={[styles.featureTitle, { color: palette.ink }]}>{title}</Text><Text style={[styles.featureText, { color: palette.muted }]}>{text}</Text><View style={[styles.featureBottom, { borderTopColor: palette.line }]}><Text style={[styles.small, { color: palette.accent }]}>{note}</Text></View>
          </View>)}
        </View>
      </View>
      <View style={[styles.invitation, compact && styles.invitationCompact]}>
        <View style={styles.invitationIcon}><Umbrella size={40} color="#F4B183" strokeWidth={1.3} /><Waves size={48} color="#98C6BC" strokeWidth={1.3} /></View>
        <View style={styles.invitationCopy}><Text accessibilityRole="header" style={styles.invitationTitle}>Your next adventure is calling.</Text><Text style={styles.invitationText}>Bring a little curiosity. We’ll help with the planning.</Text></View>
        <TravelButton label="Let’s explore" onPress={signUp} />
      </View>
      <View style={[styles.footer, { borderTopColor: palette.line }]}><SummerBrand /><Text style={[styles.small, { color: palette.muted, textAlign: "center" }]}>Made for the journey. Inspired by Pangasinan.</Text><Text style={[styles.small, { color: palette.muted }]}>© {new Date().getFullYear()} Multraverse</Text></View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  nav: { borderBottomWidth: 1, paddingHorizontal: 24 },
  navInner: { width: "100%", maxWidth: 1200, alignSelf: "center", minHeight: 92, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  actions: { flexDirection: "row", alignItems: "center", gap: 18 },
  navLogin: { minHeight: 44, paddingHorizontal: 10, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  link: { fontFamily: "Poppins", fontSize: 13 },
  hero: { width: "100%", maxWidth: 1248, alignSelf: "center", paddingHorizontal: 24, paddingTop: 62, paddingBottom: 64, flexDirection: "row", alignItems: "center", gap: 54 },
  heroCompact: { flexDirection: "column", paddingTop: 34, paddingBottom: 36, gap: 32 },
  heroCopy: { flexGrow: 1, flexBasis: 0, minWidth: 0 },
  fullWidth: { width: "100%", maxWidth: 620, flexGrow: 0, flexBasis: "auto" },
  eyebrow: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 30, paddingHorizontal: 12, paddingVertical: 8 },
  eyebrowText: { fontFamily: "DMSans", fontSize: 10, fontWeight: "700", letterSpacing: 1.1, flexShrink: 1 },
  heroTitle: { fontFamily: "Poppins", fontSize: 57, lineHeight: 68, letterSpacing: -2.3, marginTop: 22, marginBottom: 18 },
  heroTitleCompact: { fontSize: 39, lineHeight: 47, letterSpacing: -1.5, marginTop: 18 },
  heroText: { fontFamily: "DMSans", fontSize: 16, lineHeight: 27, maxWidth: 440 },
  ctas: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 26 },
  heroNote: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 23 },
  small: { fontFamily: "DMSans", fontSize: 12, lineHeight: 19, flexShrink: 1 },
  postcard: { flexGrow: 1, flexBasis: 0, minWidth: 0 },
  postcardFrame: { padding: 12, borderRadius: 36, borderWidth: 1, shadowColor: "#25484B", shadowOpacity: 0.09, shadowRadius: 25, shadowOffset: { width: 0, height: 14 }, elevation: 4 },
  postcardFooter: { flexDirection: "row", alignItems: "center", gap: 8, padding: 15 },
  postcardKicker: { fontFamily: "DMSans", fontSize: 9, letterSpacing: 1.8, marginBottom: 5 },
  postcardTitle: { fontFamily: "Poppins", fontSize: 17 },
  stamp: { padding: 10, borderWidth: 1, borderStyle: "dashed", borderRadius: 9, transform: [{ rotate: "8deg" }] },
  ribbon: { flexDirection: "row", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: 24, paddingHorizontal: 24, paddingVertical: 22 },
  ribbonItem: { flexDirection: "row", alignItems: "center", gap: 9 },
  ribbonText: { fontFamily: "DMSans", fontSize: 13 },
  section: { width: "100%", maxWidth: 1248, alignSelf: "center", paddingHorizontal: 24, paddingVertical: 70 },
  sectionCompact: { paddingVertical: 44 },
  sectionHeading: { alignItems: "center", marginBottom: 30, gap: 10 },
  kicker: { fontFamily: "DMSans", fontSize: 10, letterSpacing: 1.8, fontWeight: "700" },
  sectionTitle: { fontFamily: "Poppins", fontSize: 28, lineHeight: 38, letterSpacing: -0.7 },
  sectionSubtitle: { fontFamily: "DMSans", fontSize: 14, lineHeight: 23 },
  featureGrid: { flexDirection: "row", gap: 18 },
  featureCard: { flexGrow: 1, flexBasis: 0, padding: 26, borderRadius: 22, borderWidth: 1 },
  featureTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 23 },
  featureIcon: { width: 55, height: 55, alignItems: "center", justifyContent: "center", borderRadius: 17 },
  featureNumber: { fontFamily: "DMSans", fontSize: 12 },
  featureTitle: { fontFamily: "Poppins", fontSize: 18, lineHeight: 27, marginBottom: 10 },
  featureText: { fontFamily: "DMSans", fontSize: 14, lineHeight: 23, flexGrow: 1 },
  featureBottom: { borderTopWidth: 1, paddingTop: 17, marginTop: 24 },
  invitation: { maxWidth: 1200, width: "92%", alignSelf: "center", marginBottom: 64, padding: 36, borderRadius: 26, backgroundColor: "#174E5A", flexDirection: "row", alignItems: "center", gap: 30 },
  invitationCompact: { flexDirection: "column", alignItems: "flex-start", padding: 26, gap: 20, marginBottom: 38 },
  invitationIcon: { alignItems: "center" },
  invitationCopy: { flexGrow: 1, flexShrink: 1 },
  invitationTitle: { fontFamily: "Poppins", fontSize: 23, lineHeight: 33, color: "#FFF7E8" },
  invitationText: { fontFamily: "DMSans", fontSize: 14, lineHeight: 23, color: "#BDD5D2", marginTop: 6 },
  footer: { padding: 30, borderTopWidth: 1, gap: 18, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" },
});
