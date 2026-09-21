import MoneyAmount from "../components/MoneyAmount";
import { useAppTheme } from "../theme/useAppTheme";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Activity, Radio, Route, Users, Wallet } from "lucide-react-native";
import AdminPage from "../components/AdminPage";
import AdminStatCard from "../components/AdminStatCard";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import { api } from "../lib/api";
import { colors } from "../theme/colors";

const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const percentage = (value) => `${number(value) >= 0 ? "+" : ""}${number(value).toFixed(1)}% this month`;

export default function AdminDashboard() {
  const { themeStyle, themeColor } = useAppTheme();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.getDashboardAnalytics().then((data) => { if (active) setDashboard(data); }).catch(() => { if (active) setError("Dashboard data could not be loaded. Please try again."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  if (loading) return <AdminPage title="Admin Dashboard" subtitle="Live system overview"><View style={themeStyle(styles.state)}><ActivityIndicator size="large" color={themeColor(colors.oceanBlue, "color")} /><Text style={themeStyle(styles.muted)}>Loading dashboard…</Text></View></AdminPage>;
  if (error) return <AdminPage title="Admin Dashboard" subtitle="Live system overview"><View style={themeStyle(styles.state)}><Text style={themeStyle(styles.error)}>{error}</Text></View></AdminPage>;
  const data = dashboard || {};
  const routes = Array.isArray(data.routes) ? data.routes : [];
  const activity = Array.isArray(data.activity) ? data.activity : [];
  return <AdminPage title="Admin Dashboard" subtitle="Live overview from your system data"><View style={themeStyle(styles.stats)}><AdminStatCard label="Total Users" value={number(data.totalUsers).toLocaleString()} delta={percentage(data.userGrowthRate)} icon={<Users size={18} color={themeColor(colors.oceanBlue, "color")} />} iconBg={colors.oceanBlueLight} dividerColor={colors.oceanBlue} /><AdminStatCard label="Active Routes" value={number(data.activeRoutes).toLocaleString()} delta={`${number(data.routesUpdatedThisMonth)} updated this month`} icon={<Route size={18} color={themeColor(colors.palmGreen, "color")} />} iconBg={colors.palmGreenLight} dividerColor={colors.palmGreen} /><AdminStatCard label="Geofence Alerts" value={number(data.geofenceAlerts).toLocaleString()} delta={`${number(data.activeGeofences)} active zones`} icon={<Radio size={18} color={themeColor(colors.sunsetCoral, "color")} />} iconBg={colors.coralLight} dividerColor={colors.sunsetCoral} /><AdminStatCard label="Trip Revenue" value={<MoneyAmount value={number(data.totalRevenue)} />} delta={percentage(data.revenueGrowthRate)} icon={<Wallet size={18} color={themeColor(colors.gold, "color")} />} iconBg={colors.goldLight} dividerColor={colors.gold} /></View><View style={themeStyle(styles.columns)}><Card style={themeStyle(styles.flex)}><Text style={themeStyle(styles.heading)}>Latest transit routes</Text>{routes.length ? routes.map((route) => <View key={route.name} style={themeStyle(styles.item)}><View><Text style={themeStyle(styles.name)}>{route.name}</Text><Text style={themeStyle(styles.muted)}>{route.type}</Text></View><StatusBadge status={String(route.status || "inactive").toLowerCase()} /></View>) : <Text style={themeStyle(styles.empty)}>No transit routes have been recorded yet.</Text>}</Card><Card style={themeStyle(styles.flex)}><Text style={themeStyle(styles.heading)}>System records</Text>{activity.length ? activity.map((item) => <View key={item.label} style={themeStyle(styles.item)}><View style={themeStyle(styles.activityIcon)}><Activity size={16} color={themeColor(colors.oceanBlue, "color")} /></View><View style={themeStyle(styles.flex)}><Text style={themeStyle(styles.name)}>{item.label}</Text><Text style={themeStyle(styles.muted)}>{item.detail}</Text></View><Text style={themeStyle(styles.value)}>{number(item.value).toLocaleString()}</Text></View>) : <Text style={themeStyle(styles.empty)}>No system records are available yet.</Text>}</Card></View></AdminPage>;
}

const styles = StyleSheet.create({ stats: { flexDirection: "row", gap: 20, marginBottom: 24 }, columns: { flexDirection: "row", gap: 20 }, flex: { flex: 1 }, heading: { marginBottom: 12, fontFamily: "Poppins", fontSize: 17, fontWeight: "700", color: colors.oceanBlue }, item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border }, name: { fontFamily: "DMSans", fontSize: 14, fontWeight: "600", color: colors.textPrimary }, muted: { marginTop: 2, fontFamily: "DMSans", fontSize: 12, color: colors.textMuted }, activityIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: colors.oceanBlueLight }, value: { fontFamily: "DMSans", fontSize: 14, fontWeight: "700", color: colors.oceanBlue }, state: { minHeight: 240, alignItems: "center", justifyContent: "center", gap: 12 }, error: { fontFamily: "DMSans", color: colors.sunsetCoral }, empty: { paddingVertical: 20, fontFamily: "DMSans", color: colors.textMuted } });
