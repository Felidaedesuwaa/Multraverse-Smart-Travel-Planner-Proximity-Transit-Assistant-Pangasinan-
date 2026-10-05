import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Bookmark, Calendar, CheckCircle, MapPin, Wallet } from "lucide-react-native";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useAppTheme } from "../theme/useAppTheme";
import { colors } from "../theme/colors";
import Card from "../components/Card";
import MoneyAmount from "../components/MoneyAmount";
import { FeedbackPressable } from "../components/WorkspaceMotion";

export default function UserDashboard() {
  const { themeStyle, themeColor } = useAppTheme();
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
    Promise.all([api.getTrips(), api.getSavedPlaces(), api.getBudget()])
      .then(([trips, places, expenses]) => {
        if (active) setData({ trips, places, expenses });
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, refreshKey]));

  const stats = data ? [
    { label: "Total trips", value: data.trips.length, icon: MapPin },
    { label: "Upcoming trips", value: data.trips.filter(trip => trip.status === "UPCOMING").length, icon: Calendar },
    { label: "Completed trips", value: data.trips.filter(trip => trip.status === "COMPLETED").length, icon: CheckCircle },
    { label: "Saved places", value: data.places.length, icon: Bookmark },
    { label: "Total spending", value: <MoneyAmount value={data.expenses.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)} />, icon: Wallet },
  ] : [];

  return (
    <ScrollView contentContainerStyle={themeStyle(styles.screen)}>
      <View style={themeStyle(styles.header)}>
        <View style={styles.heading}>
          <Text style={themeStyle(styles.title)}>Dashboard</Text>
          <Text style={themeStyle(styles.subtitle)}>A simple overview of your travel activity.</Text>
        </View>
        <FeedbackPressable accessibilityRole="button" disabled={loading} onPress={() => setRefreshKey(key => key + 1)} style={themeStyle(styles.refresh)}>
          <Text style={themeStyle(styles.refreshText)}>Refresh</Text>
        </FeedbackPressable>
      </View>
      {loading ? <View style={styles.state}><ActivityIndicator color={themeColor(colors.oceanBlue, "color")} /><Text style={themeStyle(styles.subtitle)}>Loading your analytics...</Text></View>
        : error ? <Card><Text accessibilityRole="alert" style={themeStyle(styles.subtitle)}>Your analytics could not be loaded. Select Refresh to try again.</Text></Card>
          : <>
            <View style={styles.stats}>
              {stats.map(({ label, value, icon: Icon }) => <Card key={label} style={styles.stat}>
                <Icon size={22} color={themeColor(colors.oceanBlue, "color")} />
                <Text style={themeStyle(styles.value)}>{value}</Text>
                <Text style={themeStyle(styles.subtitle)}>{label}</Text>
              </Card>)}
            </View>
            {!data.trips.length && !data.places.length && !data.expenses.length && <Text style={themeStyle(styles.subtitle)}>Plan a trip, save a place, or record an expense to start tracking your activity.</Text>}
          </>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, padding: 24, gap: 24, backgroundColor: colors.warmSand },
  header: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 },
  heading: { flex: 1, minWidth: 200, gap: 8 },
  title: { fontSize: 28, fontWeight: "700", color: colors.oceanBlue },
  subtitle: { fontSize: 14, lineHeight: 22, color: colors.textMuted },
  refresh: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.oceanBlue },
  refreshText: { color: colors.white, fontWeight: "600" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  stat: { flexGrow: 1, flexBasis: 210, gap: 12 },
  value: { fontSize: 28, fontWeight: "700", color: colors.oceanBlue },
  state: { paddingVertical: 40, alignItems: "center", gap: 12 },
});
