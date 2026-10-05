import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Coins, Luggage, RotateCw } from "lucide-react-native";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useAppTheme } from "../theme/useAppTheme";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import Card from "../components/Card";
import MoneyAmount from "../components/MoneyAmount";
import SavedTripCard from "../components/SavedTripCard";
import { tripDisplayTitle } from "../lib/tripTitle";
import { FeedbackPressable } from "../components/WorkspaceMotion";

export default function UserDashboard() {
  const { themeStyle, themeColor, isDark, palette } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 768;
  const userId = useAuthStore(state => state.user?._id ?? state.user?.id);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setData(null);
    Promise.all([api.getTrips(), api.getBudget()])
      .then(([trips, expenses]) => {
        if (active) setData({ trips, expenses });
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, refreshKey]));

  const stats = data ? [
    {
      label: "Total Trips", value: data.trips.length.toLocaleString(), icon: Luggage,
      background: isDark ? "#393449" : "#EFE9FA", accent: isDark ? "#C4B4EC" : "#8B73BD",
    },
    {
      label: "Total Spending", value: <MoneyAmount value={data.expenses.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)} />, icon: Coins,
      background: isDark ? "#28453A" : "#E3EFDF", accent: isDark ? "#A6CDA8" : "#639269",
    },
  ] : [];

  return (
    <ScrollView contentContainerStyle={themeStyle([styles.screen, compact && styles.mobileScreen])}>
      <View style={themeStyle(styles.header)}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={themeStyle(styles.title)}>Home</Text>
          <Text style={themeStyle(styles.subtitle)}>Your travel at a glance.</Text>
        </View>
        <FeedbackPressable accessibilityRole="button" accessibilityLabel="Refresh Home" disabled={loading} onPress={() => setRefreshKey(key => key + 1)} style={[styles.refresh, { backgroundColor: palette.surface, borderColor: palette.line }]}>
          <RotateCw size={18} color={palette.ink} />
        </FeedbackPressable>
      </View>
      {loading ? <View style={styles.state}><ActivityIndicator color={themeColor(colors.oceanBlue, "color")} /><Text style={themeStyle(styles.subtitle)}>Loading your analytics...</Text></View>
        : error ? <Card><Text accessibilityRole="alert" style={themeStyle(styles.subtitle)}>Your analytics could not be loaded. Select Refresh to try again.</Text></Card>
          : <>
            <View style={styles.stats}>
              {stats.map(({ label, value, icon: Icon, background, accent }) => <View key={label} style={[styles.stat, { backgroundColor: background }]}>
                <Text style={[styles.statLabel, compact && styles.mobileStatLabel, { color: palette.ink }]}>{label}</Text>
                <Text adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={label === "Total Trips" ? 1 : undefined} style={[styles.value, compact && styles.mobileValue, compact && label === "Total Spending" && { fontSize: width < 360 ? 20 : 24 }, { color: palette.ink }]}>{value}</Text>
                <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.art, !compact && styles.wideArt]}>
                  <View style={[styles.artCircle, { backgroundColor: accent }]} />
                  <View style={styles.artIcon}>
                    <Icon size={compact ? 60 : 72} strokeWidth={1.4} color={accent} />
                  </View>
                </View>
              </View>)}
            </View>
            <View style={styles.savedTrips}>
              <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.muted }]}>SAVED TRIPS</Text>
              {data.trips.length ? data.trips.map(trip => <SavedTripCard
                key={trip._id ?? trip.id}
                variant="dashboard"
                title={tripDisplayTitle(trip)}
                date={trip.date}
                status={(trip.status || "UPCOMING").toLowerCase()}
                progress={trip.budget > 0 ? Math.max(0, Math.min(100, Math.round(((Number(trip.spent) || 0) / trip.budget) * 100))) : 0}
              />) : <Card><Text style={themeStyle(styles.subtitle)}>No saved trips yet. Plan a trip to see it here.</Text></Card>}
            </View>
          </>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, padding: 32, gap: 24, backgroundColor: colors.warmSand },
  mobileScreen: { padding: 20, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  heading: { flex: 1, minWidth: 0, gap: 6 },
  title: { fontSize: 28, fontWeight: "700", color: colors.oceanBlue },
  subtitle: { fontSize: 14, lineHeight: 22, color: colors.textMuted },
  refresh: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, borderWidth: 1 },
  stats: { flexDirection: "row", gap: 12 },
  stat: { flex: 1, minWidth: 0, minHeight: 216, padding: 16, gap: 10, borderRadius: 26, overflow: "hidden" },
  statLabel: { fontFamily: "DMSans", fontSize: 15, fontWeight: "500" },
  mobileStatLabel: { fontSize: 13 },
  value: { ...typography.number, fontSize: 34, zIndex: 1 },
  mobileValue: { fontSize: 28 },
  art: { pointerEvents: "none", marginTop: "auto", alignSelf: "flex-end", width: 96, height: 96, flexShrink: 0, alignItems: "center", justifyContent: "center" },
  wideArt: { width: 112, height: 112 },
  artCircle: { ...StyleSheet.absoluteFillObject, borderRadius: 999, opacity: 0.12 },
  artIcon: { transform: [{ rotate: "-12deg" }] },
  savedTrips: { gap: 12 },
  sectionTitle: { fontFamily: "DMSans", fontSize: 13, fontWeight: "700", letterSpacing: 2 },
  state: { paddingVertical: 40, alignItems: "center", gap: 12 },
});
