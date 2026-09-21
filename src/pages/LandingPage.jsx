import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  BellRing,
  Compass,
  MapPin,
  Route,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
  Zap,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme/colors";

const FEATURES = [
  {
    Icon: Route,
    iconBg: "#EAF1FB",
    iconColor: "#1A5CB0",
    title: "Plan with confidence",
    text: "Build Pangasinan itineraries from verified places, routes, fares, and food guides — all in one place.",
  },
  {
    Icon: Wallet,
    iconBg: "#EDF7EE",
    iconColor: "#22863A",
    title: "Stay on budget",
    text: "Track trip spending and make practical choices before you even leave home.",
  },
  {
    Icon: BellRing,
    iconBg: "#FFF1EE",
    iconColor: "#F16B4E",
    title: "Travel smarter",
    text: "Save favorites, get proximity alerts, and translate local phrases on the go.",
  },
];

const STATS = [
  { value: "124+", label: "Islands" },
  { value: "48", label: "Municipalities" },
  { value: "100%", label: "Verified data" },
  { value: "Free", label: "Free to download" },
];

const TESTIMONIALS = [
  {
    text: "Finally an app that actually knows Pangasinan routes and fares. No more guessing at the terminal.",
    name: "Maria Santos",
    role: "Budget traveler from Manila",
    rating: 5,
  },
  {
    text: "The AI itinerary planner saved us hours of research. It knew exactly which jeepney to take.",
    name: "Carlo Reyes",
    role: "Solo backpacker",
    rating: 5,
  },
  {
    text: "The Pangasinan phrasebook alone is worth it. Locals were so happy I tried to speak their language.",
    name: "Ana dela Cruz",
    role: "First-time Pangasinan visitor",
    rating: 5,
  },
];

export default function LandingPage() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const compact = width < 768;

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Navbar ── */}
      <View style={styles.navbar}>
        <View style={styles.navInner}>
          {/* Brand */}
          <View style={styles.brand}>
            <LinearGradient
              colors={[colors.sunsetCoral, "#F2A63E"]}
              style={styles.logo}
            >
              <Compass size={22} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={styles.brandName}>Multraverse</Text>
              <Text style={styles.brandSub}>Pangasinan Edition</Text>
            </View>
          </View>

          {/* Nav actions */}
          <View style={styles.navActions}>
            <Pressable
              onPress={() => navigation.navigate("Login")}
              style={styles.navLogin}
            >
              <Text style={styles.navLoginText}>Log in</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Register")}
              style={styles.navSignup}
            >
              <Text style={styles.navSignupText}>Sign up free</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Hero ── */}
      <View style={styles.hero}>
        <View style={[styles.heroInner, compact && styles.heroInnerCompact]}>
          {/* Eyebrow */}
          <View style={styles.eyebrowRow}>
            <Sparkles size={13} color={colors.sunsetCoral} />
            <Text style={styles.eyebrow}>AI-POWERED PANGASINAN TRAVEL</Text>
          </View>

          {/* Headline */}
          <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>
            Discover Pangasinan,{"\n"}one well-planned{"\n"}trip at a time.
          </Text>

          <Text style={[styles.heroSub, compact && styles.heroSubCompact]}>
            Multraverse brings scattered local travel information into one
            secure place — so independent and budget travelers can explore
            with clarity, not guesswork.
          </Text>

          {/* CTAs */}
          <View style={[styles.ctaRow, compact && styles.ctaRowCompact]}>
            <Pressable
              onPress={() => navigation.navigate("Register")}
              style={({ pressed }) => [
                styles.ctaPrimary,
                pressed && { opacity: 0.9 },
              ]}
            >
              <LinearGradient
                colors={[colors.sunsetCoral, "#F2A63E"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaPrimaryGradient}
              >
                <Text style={styles.ctaPrimaryText}>Create a free account</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Login")}
              style={({ pressed }) => [
                styles.ctaSecondary,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.ctaSecondaryText}>Sign in →</Text>
            </Pressable>
          </View>

          {/* Trust badge */}
          <View style={styles.trustRow}>
            <ShieldCheck size={14} color="#8FD4B0" />
            <Text style={styles.trustText}>
              Built for travelers · Verified local information · Free forever
            </Text>
          </View>
        </View>

        {/* Stats bar */}
        <View style={[styles.statsBar, compact && styles.statsBarCompact]}>
          {STATS.map((stat, i) => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
              {i < STATS.length - 1 && (
                <View style={styles.statDivider} />
              )}
            </View>
          ))}
        </View>
      </View>

      {/* ── Features ── */}
      <View style={[styles.section, compact && styles.sectionCompact]}>
        <Text style={styles.sectionEyebrow}>ONE APP, LESS GUESSWORK</Text>
        <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>
          Everything you need before{"\n"}and during your trip.
        </Text>
        <Text style={styles.sectionSub}>
          Tourism details should not be buried in social posts, brochures, or
          word of mouth. Start with a plan you can understand and adjust.
        </Text>

        <View style={[styles.featureGrid, compact && styles.featureGridCompact]}>
          {FEATURES.map(({ Icon, iconBg, iconColor, title, text }) => (
            <View key={title} style={styles.featureCard}>
              <View style={[styles.featureIconBox, { backgroundColor: iconBg }]}>
                <Icon size={22} color={iconColor} />
              </View>
              <Text style={styles.featureTitle}>{title}</Text>
              <Text style={styles.featureText}>{text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── AI Highlight ── */}
      <View style={[styles.aiSection, compact && styles.aiSectionCompact]}>
        <View style={styles.aiInner}>
          <View style={styles.aiBadge}>
            <Zap size={12} color="#fff" />
            <Text style={styles.aiBadgeText}>Powered by your own AI model</Text>
          </View>
          <Text style={[styles.aiTitle, compact && styles.aiTitleCompact]}>
            Smart travel planning,{"\n"}built for Pangasinan.
          </Text>
          <Text style={styles.aiSub}>
            Our custom-trained AI model understands local routes, verified
            fares, and real Pangasinan destinations — not generic travel advice.
          </Text>
          <View style={[styles.aiCards, compact && styles.aiCardsCompact]}>
            {[
              { icon: "", title: "AI Itinerary", text: "Day-by-day plans using real local data" },
              { icon: "", title: "Pangasinan Translator", text: "Voice + phrasebook with PDF-verified phrases" },
              { icon: "", title: "Transit Alarm", text: "Proximity alerts from live route database" },
            ].map((item) => (
              <View key={item.title} style={styles.aiCard}>
                <Text style={styles.aiCardEmoji}>{item.icon}</Text>
                <Text style={styles.aiCardTitle}>{item.title}</Text>
                <Text style={styles.aiCardText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── Testimonials ── */}
      <View style={[styles.section, compact && styles.sectionCompact]}>
        <Text style={styles.sectionEyebrow}>TRAVELER STORIES</Text>
        <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>
          Trusted by Pangasinan explorers.
        </Text>
        <View style={[styles.testimonialGrid, compact && styles.testimonialGridCompact]}>
          {TESTIMONIALS.map((t) => (
            <View key={t.name} style={styles.testimonialCard}>
              <View style={styles.stars}>
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={13} color="#F59E0B" fill="#F59E0B" />
                ))}
              </View>
              <Text style={styles.testimonialText}>"{t.text}"</Text>
              <View style={styles.testimonialAuthor}>
                <View style={styles.testimonialAvatar}>
                  <Text style={styles.testimonialAvatarText}>
                    {t.name.charAt(0)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.testimonialName}>{t.name}</Text>
                  <Text style={styles.testimonialRole}>{t.role}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ── Final CTA ── */}
      <View style={[styles.finalCta, compact && styles.finalCtaCompact]}>
        <View style={styles.finalCtaInner}>
          <MapPin size={32} color={colors.sunsetCoral} style={{ marginBottom: 16 }} />
          <Text style={[styles.finalCtaTitle, compact && styles.finalCtaTitleCompact]}>
            Ready for your next{"\n"}Pangasinan story?
          </Text>
          <Text style={styles.finalCtaSub}>
            Create an account to plan routes, manage your travel budget,
            save places, and get AI-powered itineraries — completely free.
          </Text>
          <View style={[styles.ctaRow, compact && styles.ctaRowCompact, { marginTop: 28 }]}>
            <Pressable
              onPress={() => navigation.navigate("Register")}
              style={({ pressed }) => [pressed && { opacity: 0.9 }]}
            >
              <LinearGradient
                colors={[colors.sunsetCoral, "#F2A63E"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaPrimaryGradient}
              >
                <Text style={styles.ctaPrimaryText}>Get started — it's free</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Login")}
              style={styles.finalCtaLogin}
            >
              <Text style={styles.finalCtaLoginText}>Already have an account? Log in</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <View style={styles.footerBrand}>
          <LinearGradient
            colors={[colors.sunsetCoral, "#F2A63E"]}
            style={styles.footerLogo}
          >
            <Compass size={16} color="#fff" />
          </LinearGradient>
          <Text style={styles.footerBrandName}>Multraverse</Text>
        </View>
        <Text style={styles.footerText}>
          © 2026 Multraverse · Pangasinan Edition · Built for travelers
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: "#F4F8FA" },

  // ── Navbar ──────────────────────────────────────────────
  navbar: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E8EFF6",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  navInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: 1180,
    alignSelf: "center",
    width: "100%",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: { fontSize: 17, fontWeight: "700", color: "#183447" },
  brandSub: { fontSize: 11, color: "#6B8CA8", marginTop: 1 },
  navActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  navLogin: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D9E7EE",
  },
  navLoginText: { fontSize: 14, fontWeight: "700", color: "#183447" },
  navSignup: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.oceanBlue,
  },
  navSignupText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // ── Hero ────────────────────────────────────────────────
  hero: {
    backgroundColor: colors.oceanBlue,
    paddingBottom: 0,
    overflow: "hidden",
  },
  heroInner: {
    maxWidth: 820,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 32,
    paddingTop: 72,
    paddingBottom: 56,
    alignItems: "center",
  },
  heroInnerCompact: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 18,
  },
  eyebrow: {
    color: colors.sunsetCoral,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 52,
    fontWeight: "800",
    lineHeight: 62,
    textAlign: "center",
    marginBottom: 20,
  },
  heroTitleCompact: {
    fontSize: 34,
    lineHeight: 42,
  },
  heroSub: {
    color: "#A8CCE0",
    fontSize: 17,
    lineHeight: 26,
    textAlign: "center",
    maxWidth: 640,
    marginBottom: 32,
  },
  heroSubCompact: {
    fontSize: 15,
    lineHeight: 23,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  ctaRowCompact: { flexDirection: "column", gap: 10 },
  ctaPrimary: { borderRadius: 12, overflow: "hidden" },
  ctaPrimaryGradient: {
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: 12,
  },
  ctaPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  ctaSecondary: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  ctaSecondaryText: {
    color: "#D8EDF5",
    fontSize: 15,
    fontWeight: "700",
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 24,
  },
  trustText: { color: "#7BB8D4", fontSize: 12 },

  // Stats bar
  statsBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingVertical: 20,
    paddingHorizontal: 32,
    justifyContent: "center",
    gap: 0,
  },
  statsBarCompact: {
    paddingHorizontal: 20,
    flexWrap: "wrap",
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    position: "relative",
    minWidth: 80,
  },
  statValue: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: { color: "#7BB8D4", fontSize: 12, fontWeight: "600" },
  statDivider: {
    position: "absolute",
    right: 0,
    top: "15%",
    height: "70%",
    width: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  // ── Sections ────────────────────────────────────────────
  section: {
    maxWidth: 1080,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 32,
    paddingVertical: 64,
    alignItems: "center",
  },
  sectionCompact: {
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  sectionEyebrow: {
    color: colors.sunsetCoral,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 12,
    textAlign: "center",
  },
  sectionTitle: {
    color: "#183447",
    fontSize: 34,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 42,
    marginBottom: 14,
  },
  sectionTitleCompact: { fontSize: 26, lineHeight: 34 },
  sectionSub: {
    color: "#527084",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 680,
    marginBottom: 40,
  },

  // Feature grid
  featureGrid: {
    flexDirection: "row",
    gap: 18,
    width: "100%",
  },
  featureGridCompact: { flexDirection: "column" },
  featureCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2ECEF",
    shadowColor: "#173B50",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  featureIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  featureTitle: {
    color: "#183447",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
  },
  featureText: {
    color: "#527084",
    fontSize: 14,
    lineHeight: 21,
  },

  // ── AI Section ──────────────────────────────────────────
  aiSection: {
    backgroundColor: "#0B3C5D",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  aiSectionCompact: {
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  aiInner: {
    maxWidth: 1080,
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.sunsetCoral,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  aiBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  aiTitle: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 44,
    marginBottom: 14,
  },
  aiTitleCompact: { fontSize: 26, lineHeight: 34 },
  aiSub: {
    color: "#A8CCE0",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 640,
    marginBottom: 36,
  },
  aiCards: { flexDirection: "row", gap: 16, width: "100%" },
  aiCardsCompact: { flexDirection: "column" },
  aiCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  aiCardEmoji: { fontSize: 28, marginBottom: 12 },
  aiCardTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  aiCardText: { color: "#7BB8D4", fontSize: 13, lineHeight: 19 },

  // ── Testimonials ────────────────────────────────────────
  testimonialGrid: {
    flexDirection: "row",
    gap: 18,
    width: "100%",
  },
  testimonialGridCompact: { flexDirection: "column" },
  testimonialCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E2ECEF",
    shadowColor: "#173B50",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  stars: { flexDirection: "row", gap: 3, marginBottom: 14 },
  testimonialText: {
    color: "#183447",
    fontSize: 14,
    lineHeight: 22,
    fontStyle: "italic",
    marginBottom: 18,
    flex: 1,
  },
  testimonialAuthor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  testimonialAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.oceanBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  testimonialAvatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  testimonialName: {
    color: "#183447",
    fontSize: 13,
    fontWeight: "700",
  },
  testimonialRole: { color: "#6B8CA8", fontSize: 12 },

  // ── Final CTA ───────────────────────────────────────────
  finalCta: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E8EFF6",
    paddingVertical: 72,
    paddingHorizontal: 32,
  },
  finalCtaCompact: {
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  finalCtaInner: {
    maxWidth: 640,
    alignSelf: "center",
    alignItems: "center",
    width: "100%",
  },
  finalCtaTitle: {
    color: "#183447",
    fontSize: 38,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 48,
    marginBottom: 14,
  },
  finalCtaTitleCompact: { fontSize: 28, lineHeight: 36 },
  finalCtaSub: {
    color: "#527084",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 520,
  },
  finalCtaLogin: { paddingVertical: 15, paddingHorizontal: 16 },
  finalCtaLoginText: {
    color: "#527084",
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Footer ──────────────────────────────────────────────
  footer: {
    backgroundColor: "#183447",
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 12,
  },
  footerBrand: { flexDirection: "row", alignItems: "center", gap: 8 },
  footerLogo: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBrandName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  footerText: { color: "#527084", fontSize: 12, textAlign: "center" },
});