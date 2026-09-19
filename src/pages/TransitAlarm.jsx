import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Bell,
  Bus,
  Car,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  Smartphone,
  Users,
  Vibrate,
  Volume2,
} from "lucide-react-native";
import { api } from "../lib/api";
import { colors } from "../theme/colors";

const RADIUS_OPTIONS = [100, 300, 500, 1000, 2000];

const MODES = [
  { key: "vibrate", label: "Vibrate", Icon: Vibrate },
  { key: "sound", label: "Sound", Icon: Volume2 },
  { key: "push", label: "Push", Icon: Smartphone },
];

const routeTypeStyle = {
  BUS: { bg: colors.oceanBlueLight, color: colors.oceanBlue },
  JEEPNEY: { bg: colors.palmGreenLight, color: colors.palmGreen },
  TRICYCLE: { bg: colors.goldLight ?? "#FFF8E1", color: colors.gold ?? "#C07000" },
};

export default function TransitAlarm() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [radius, setRadius] = useState(500);
  const [alarmOn, setAlarmOn] = useState(false);
  const [mode, setMode] = useState("vibrate");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRoutes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTransitRoutes();
      const active = data.filter((r) => r.status === "ACTIVE");
      setRoutes(active);
      setSelectedRoute((cur) => cur ?? active[0] ?? null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load transit routes."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const getRouteIcon = (type) => (type === "BUS" ? Bus : Car);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Transit Alarm</Text>
          <Text style={styles.subtitle}>
            Get proximity alerts for active Pangasinan transit routes.
          </Text>
        </View>
        <Pressable
          onPress={loadRoutes}
          style={({ pressed }) => [
            styles.refreshBtn,
            pressed && { opacity: 0.8 },
          ]}
        >
          <RefreshCw size={15} color={colors.oceanBlue} />
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      <View style={styles.columns}>
        {/* ── Left: Route List ── */}
        <View style={styles.leftCol}>

          {/* Info card */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardInner}>
              <View style={styles.infoIconBox}>
                <Bell size={20} color={colors.oceanBlue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoCardTitle}>How it works</Text>
                <Text style={styles.infoCardDesc}>
                  Select a route below, set your alert radius, choose your
                  notification mode, then enable the alarm. You'll be notified
                  when your stop is approaching.
                </Text>
              </View>
            </View>
          </View>

          {/* Routes header */}
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionLabel}>Active Routes</Text>
            {!loading && (
              <Text style={styles.sectionCount}>{routes.length} available</Text>
            )}
          </View>

          {/* Loading */}
          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.oceanBlue} size="small" />
              <Text style={styles.loadingText}>Loading routes...</Text>
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Empty */}
          {!loading && !error && routes.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No active routes available.</Text>
            </View>
          )}

          {/* Route cards */}
          {routes.map((route) => {
            const Icon = getRouteIcon(route.type);
            const selected =
              selectedRoute?._id === route._id ||
              selectedRoute?.id === route.id;
            const typeStyle =
              routeTypeStyle[route.type] ?? routeTypeStyle.BUS;

            return (
              <View
                key={route._id ?? route.id}
                style={[styles.routeCard, selected && styles.routeCardSelected]}
              >
                {/* Top row */}
                <View style={styles.routeTop}>
                  <View
                    style={[
                      styles.routeIconBox,
                      { backgroundColor: typeStyle.bg },
                    ]}
                  >
                    <Icon size={20} color={typeStyle.color} />
                  </View>
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeName}>{route.name}</Text>
                    <Text style={styles.routeMeta}>
                      {route.type} · {route.stops} stops · every{" "}
                      {route.frequency}
                    </Text>
                  </View>
                  {selected && (
                    <CheckCircle2 size={20} color={colors.sunsetCoral} />
                  )}
                </View>

                {/* Stats row */}
                <View style={styles.routeStats}>
                  <View style={styles.statChip}>
                    <Clock size={11} color="#6B8CA8" />
                    <Text style={styles.statText}>{route.frequency}</Text>
                  </View>
                  <View style={styles.statChip}>
                    <MapPin size={11} color="#6B8CA8" />
                    <Text style={styles.statText}>{route.stops} stops</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Users size={11} color="#6B8CA8" />
                    <Text style={styles.statText}>
                      {route.passengers?.toLocaleString?.()} / wk
                    </Text>
                  </View>
                </View>

                {/* Select button */}
                <Pressable
                  onPress={() => {
                    setSelectedRoute(route);
                    setAlarmOn(false);
                  }}
                  style={({ pressed }) => [
                    styles.selectBtn,
                    selected && styles.selectBtnActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      styles.selectBtnText,
                      selected && styles.selectBtnTextActive,
                    ]}
                  >
                    {selected ? "✓ Selected for alarm" : "Select this route"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* ── Right: Alarm Config ── */}
        <View style={styles.rightCol}>

          {/* Selected route summary */}
          <View style={styles.alarmCard}>
            <Text style={styles.alarmCardTitle}>Alarm Configuration</Text>

            <View
              style={[
                styles.selectedRouteBadge,
                !selectedRoute && styles.selectedRouteBadgeEmpty,
              ]}
            >
              {selectedRoute ? (
                <>
                  <View style={styles.selectedRouteDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedRouteName}>
                      {selectedRoute.name}
                    </Text>
                    <Text style={styles.selectedRouteMeta}>
                      {selectedRoute.stops} stops · {selectedRoute.frequency}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.noRouteText}>
                  Select a route from the list
                </Text>
              )}
            </View>

            {/* Alert radius */}
            <Text style={styles.configLabel}>Alert Radius</Text>
            <View style={styles.radiusRow}>
              {RADIUS_OPTIONS.map((val) => (
                <Pressable
                  key={val}
                  onPress={() => setRadius(val)}
                  style={[
                    styles.radiusChip,
                    radius === val && styles.radiusChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.radiusText,
                      radius === val && styles.radiusTextActive,
                    ]}
                  >
                    {val >= 1000 ? `${val / 1000}km` : `${val}m`}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Alert mode */}
            <Text style={styles.configLabel}>Notification Mode</Text>
            <View style={styles.modeRow}>
              {MODES.map(({ key, label, Icon }) => {
                const active = mode === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setMode(key)}
                    style={[styles.modeBtn, active && styles.modeBtnActive]}
                  >
                    <Icon
                      size={16}
                      color={active ? colors.sunsetCoral : "#6B8CA8"}
                    />
                    <Text
                      style={[
                        styles.modeBtnText,
                        active && styles.modeBtnTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Summary */}
            {selectedRoute && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Alarm Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Route</Text>
                  <Text style={styles.summaryVal} numberOfLines={1}>
                    {selectedRoute.name}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Radius</Text>
                  <Text style={styles.summaryVal}>{radius} meters</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Mode</Text>
                  <Text style={styles.summaryVal}>
                    {MODES.find((m) => m.key === mode)?.label}
                  </Text>
                </View>
                <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.summaryKey}>Status</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      alarmOn
                        ? styles.statusBadgeOn
                        : styles.statusBadgeOff,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        alarmOn
                          ? styles.statusBadgeTextOn
                          : styles.statusBadgeTextOff,
                      ]}
                    >
                      {alarmOn ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Enable/disable button */}
            <Pressable
              onPress={() => setAlarmOn((v) => !v)}
              disabled={!selectedRoute}
              style={({ pressed }) => [
                styles.enableBtn,
                alarmOn && styles.enableBtnOn,
                !selectedRoute && styles.enableBtnDisabled,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Bell size={16} color="#fff" />
              <Text style={styles.enableBtnText}>
                {alarmOn ? "Disable Alarm" : "Enable Alarm"}
              </Text>
            </Pressable>
          </View>

          {/* Tips card */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Tips</Text>
            {[
              "Keep the app open for proximity alerts to work.",
              "Set a 300m radius for city stops, 1km for provincial routes.",
              "Push notifications require notification permissions.",
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FB" },
  screen: { flexGrow: 1, padding: 32, paddingBottom: 48 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  title: { fontSize: 26, fontWeight: "700", color: "#1A2E40", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B8CA8", maxWidth: 400 },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    backgroundColor: "#fff",
  },
  refreshText: { fontSize: 13, fontWeight: "600", color: colors.oceanBlue },

  // Layout
  columns: { flexDirection: "row", gap: 20, alignItems: "flex-start" },
  leftCol: { flex: 1, gap: 14 },
  rightCol: { width: 300, gap: 16 },

  // Info card
  infoCard: {
    backgroundColor: colors.oceanBlueLight,
    borderRadius: 14,
    padding: 16,
  },
  infoCardInner: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.oceanBlue,
    marginBottom: 4,
  },
  infoCardDesc: { fontSize: 12, color: "#4A6880", lineHeight: 18 },

  // Section label
  sectionLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#1A2E40" },
  sectionCount: { fontSize: 12, color: "#6B8CA8" },

  // States
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 14,
  },
  loadingText: { fontSize: 13, color: "#6B8CA8" },
  errorBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFF1EE",
  },
  errorText: { fontSize: 13, color: colors.sunsetCoral },
  emptyBox: {
    padding: 24,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  emptyText: { fontSize: 13, color: "#6B8CA8" },

  // Route card
  routeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 14,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  routeCardSelected: {
    borderColor: colors.oceanBlue,
    backgroundColor: "#FAFCFF",
  },
  routeTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  routeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  routeInfo: { flex: 1 },
  routeName: { fontSize: 15, fontWeight: "700", color: "#1A2E40", marginBottom: 2 },
  routeMeta: { fontSize: 12, color: "#6B8CA8" },

  // Stats
  routeStats: { flexDirection: "row", gap: 8 },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#F4F7FB",
  },
  statText: { fontSize: 11, color: "#6B8CA8", fontWeight: "500" },

  // Select button
  selectBtn: {
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    backgroundColor: "#fff",
  },
  selectBtnActive: {
    backgroundColor: colors.sunsetCoral,
    borderColor: colors.sunsetCoral,
  },
  selectBtnText: { fontSize: 13, fontWeight: "600", color: "#4A6880" },
  selectBtnTextActive: { color: "#fff" },

  // Alarm card
  alarmCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 22,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  alarmCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A2E40",
  },

  // Selected route badge
  selectedRouteBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.oceanBlueLight,
  },
  selectedRouteBadgeEmpty: { backgroundColor: "#F4F7FB" },
  selectedRouteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.palmGreen,
    flexShrink: 0,
  },
  selectedRouteName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.oceanBlue,
    marginBottom: 2,
  },
  selectedRouteMeta: { fontSize: 11, color: "#4A6880" },
  noRouteText: { fontSize: 13, color: "#6B8CA8", fontStyle: "italic" },

  // Config
  configLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B8CA8",
    letterSpacing: 0.5,
    marginBottom: -8,
  },

  // Radius
  radiusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    backgroundColor: "#fff",
  },
  radiusChipActive: {
    borderColor: colors.oceanBlue,
    backgroundColor: colors.oceanBlueLight,
  },
  radiusText: { fontSize: 12, fontWeight: "600", color: "#4A6880" },
  radiusTextActive: { color: colors.oceanBlue },

  // Mode
  modeRow: { flexDirection: "row", gap: 8 },
  modeBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    backgroundColor: "#fff",
  },
  modeBtnActive: {
    borderColor: colors.sunsetCoral,
    backgroundColor: "#FFF1EE",
  },
  modeBtnText: { fontSize: 11, fontWeight: "600", color: "#6B8CA8" },
  modeBtnTextActive: { color: colors.sunsetCoral },

  // Summary
  summaryBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    overflow: "hidden",
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B8CA8",
    letterSpacing: 0.5,
    padding: 12,
    paddingBottom: 8,
    backgroundColor: "#F8FAFC",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F8",
  },
  summaryKey: { fontSize: 12, color: "#6B8CA8" },
  summaryVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A2E40",
    maxWidth: 160,
    textAlign: "right",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusBadgeOn: { backgroundColor: "#EDF7EE" },
  statusBadgeOff: { backgroundColor: "#F4F7FB" },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  statusBadgeTextOn: { color: "#22863A" },
  statusBadgeTextOff: { color: "#6B8CA8" },

  // Enable button
  enableBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.oceanBlue,
  },
  enableBtnOn: { backgroundColor: colors.sunsetCoral },
  enableBtnDisabled: { backgroundColor: "#CBD5E0" },
  enableBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // Tips
  tipsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A2E40",
    marginBottom: 2,
  },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.sunsetCoral,
    marginTop: 5,
    flexShrink: 0,
  },
  tipText: { fontSize: 12, color: "#6B8CA8", lineHeight: 18, flex: 1 },
});