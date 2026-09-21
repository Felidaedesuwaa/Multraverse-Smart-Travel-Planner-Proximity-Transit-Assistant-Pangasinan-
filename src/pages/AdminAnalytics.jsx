import MoneyAmount from "../components/MoneyAmount";
import { useAppTheme } from "../theme/useAppTheme";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { BarChart3, MapPin, TrendingUp, Users, Wallet } from "lucide-react-native";
import AdminPage from "../components/AdminPage";
import AdminStatCard from "../components/AdminStatCard";
import Card from "../components/Card";
import { api } from "../lib/api";
import { colors } from "../theme/colors";

const numeric = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export function buildAnalyticsSummary(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  const points = (items, label) => Array.isArray(items) ? items.filter((item) => item && typeof item === "object").map((item) => ({ [label]: String(item[label] || item.label || "N/A"), users: numeric(item.users), value: numeric(item.value) })) : [];
  return { totalUsers: numeric(data.totalUsers), totalTrips: numeric(data.totalTrips), totalRevenue: numeric(data.totalRevenue), retentionRate: numeric(data.retentionRate), userGrowthRate: numeric(data.userGrowthRate), tripGrowthRate: numeric(data.tripGrowthRate), revenueGrowthRate: numeric(data.revenueGrowthRate), growthData: points(data.growthData, "month"), weeklyActivity: points(data.weeklyActivity, "day"), topDestinations: points(data.topDestinations, "name") };
}

const percent = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}% this month`;
function BarChart({ data, label, valueKey = "users", color = colors.oceanBlue }) {
  const { themeStyle } = useAppTheme();
  const max = Math.max(...data.map((item) => item[valueKey]), 1);
  return <View style={themeStyle(styles.chart)}>{data.length ? data.map((item, index) => <View key={`${item[label]}-${index}`} style={themeStyle(styles.barColumn)}><Text style={themeStyle(styles.barValue)}>{item[valueKey].toLocaleString()}</Text><View style={themeStyle(styles.barTrack)}><View style={themeStyle([styles.bar, { height: `${Math.max((item[valueKey] / max) * 100, item[valueKey] ? 4 : 0)}%`, backgroundColor: color }])} /></View><Text style={themeStyle(styles.chartLabel)}>{item[label]}</Text></View>) : <Text style={themeStyle(styles.empty)}>No recorded data yet.</Text>}</View>;
}

export default function AdminAnalytics() {
  const { themeStyle, themeColor } = useAppTheme();
  const [rawSummary, setRawSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; api.getAnalytics().then((data) => { if (active) setRawSummary(data); }).catch(() => { if (active) setError("Analytics could not be loaded. Please try again."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  const summary = useMemo(() => buildAnalyticsSummary(rawSummary), [rawSummary]);
  return <AdminPage title="Analytics" subtitle="Live metrics calculated from your system data">{loading ? <View style={themeStyle(styles.state)}><ActivityIndicator size="large" color={themeColor(colors.oceanBlue, "color")} /><Text style={themeStyle(styles.stateText)}>Loading analytics…</Text></View> : error ? <View style={themeStyle(styles.state)}><Text style={themeStyle(styles.error)}>{error}</Text></View> : <><View style={themeStyle(styles.stats)}><AdminStatCard label="Total users" value={summary.totalUsers.toLocaleString()} delta={percent(summary.userGrowthRate)} icon={<Users size={18} color={themeColor(colors.oceanBlue, "color")} />} iconBg={colors.oceanBlueLight} dividerColor={colors.oceanBlue} /><AdminStatCard label="Total trips" value={summary.totalTrips.toLocaleString()} delta={percent(summary.tripGrowthRate)} icon={<BarChart3 size={18} color={themeColor(colors.palmGreen, "color")} />} iconBg={colors.palmGreenLight} dividerColor={colors.palmGreen} /><AdminStatCard label="Trip revenue" value={<MoneyAmount value={summary.totalRevenue} />} delta={percent(summary.revenueGrowthRate)} icon={<Wallet size={18} color={themeColor(colors.gold, "color")} />} iconBg={colors.goldLight} dividerColor={colors.gold} /><AdminStatCard label="Returning users" value={`${summary.retentionRate.toFixed(1)}%`} delta="Users with 2+ trips" icon={<TrendingUp size={18} color={themeColor(colors.sunsetCoral, "color")} />} iconBg={colors.coralLight} dividerColor={colors.sunsetCoral} /></View><View style={themeStyle(styles.columns)}><Card style={themeStyle(styles.flex)}><Text style={themeStyle(styles.heading)}>New users by month</Text><BarChart data={summary.growthData} label="month" /></Card><Card style={themeStyle(styles.flex)}><Text style={themeStyle(styles.heading)}>Weekly active travelers</Text><BarChart data={summary.weeklyActivity} label="day" color={themeColor(colors.palmGreen, "color")} /></Card></View><Card><Text style={themeStyle(styles.heading)}>Top destinations by trips</Text>{summary.topDestinations.length ? summary.topDestinations.map((destination, index) => <View key={`${destination.name}-${index}`} style={themeStyle([styles.destination, index < summary.topDestinations.length - 1 && styles.border])}><View style={themeStyle(styles.destinationName)}><MapPin size={16} color={themeColor(colors.sunsetCoral, "color")} /><Text style={themeStyle(styles.name)}>{destination.name}</Text></View><Text style={themeStyle(styles.count)}>{destination.value.toLocaleString()} trips</Text></View>) : <Text style={themeStyle(styles.empty)}>No trip destinations have been recorded yet.</Text>}</Card></>}</AdminPage>;
}

const styles = StyleSheet.create({ stats: { flexDirection: "row", gap: 20, marginBottom: 24 }, columns: { flexDirection: "row", gap: 20, marginBottom: 20 }, flex: { flex: 1 }, heading: { marginBottom: 16, fontFamily: "Poppins", fontSize: 17, fontWeight: "700", color: colors.oceanBlue }, state: { minHeight: 240, alignItems: "center", justifyContent: "center", gap: 12 }, stateText: { fontFamily: "DMSans", color: colors.textMuted }, error: { fontFamily: "DMSans", color: colors.sunsetCoral }, chart: { height: 220, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", gap: 8 }, barColumn: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" }, barTrack: { width: "70%", height: 150, justifyContent: "flex-end", borderRadius: 6, overflow: "hidden", backgroundColor: colors.oceanBlueLight }, bar: { width: "100%", borderRadius: 6 }, barValue: { marginBottom: 5, fontFamily: "DMSans", fontSize: 10, color: colors.textMuted }, chartLabel: { marginTop: 7, fontFamily: "DMSans", fontSize: 11, color: colors.textMuted }, empty: { paddingVertical: 20, fontFamily: "DMSans", color: colors.textMuted }, destination: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13 }, destinationName: { flexDirection: "row", alignItems: "center", gap: 9 }, name: { fontFamily: "DMSans", fontWeight: "600", color: colors.textPrimary }, count: { fontFamily: "DMSans", color: colors.textMuted }, border: { borderBottomWidth: 1, borderBottomColor: colors.border } });
