import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Cpu, Languages, RefreshCw } from "lucide-react-native";
import AdminPage from "../components/AdminPage";
import { PlannerButton as Button, plannerStyles as s } from "../components/planner/PlannerUI";
import { useAppTheme } from "../theme/useAppTheme";
import { api } from "../lib/api";
import { colors } from "../theme/colors";

export default function AdminAIControls() {
  const { themeStyle, themeColor } = useAppTheme();
  const [settings, setSettings] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const load = () => { setError(""); api.getAISettings().then(setSettings).catch(error => setError(error.message)); };
  useEffect(load, []);
  const change = async key => {
    setBusy(true); setError("");
    try { setSettings(await api.updateAISettings({ [key]: !settings[key] })); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  };
  return <AdminPage title="AI Controls" subtitle="Manage your local Pangasinan model">
    <View style={{ gap: 18 }}>
      <Text style={themeStyle(s.body)}>These settings are stored on the server and enforced for every request. Database planning and phrasebook matches remain available when AI is off.</Text>
      {!settings && !error && <ActivityIndicator color={themeColor(colors.oceanBlue)} />}
      {!!error && <Text accessibilityRole="alert" style={themeStyle({ ...s.body, color: colors.sunsetCoral })}>{error}</Text>}
      {settings && [{ key: "itineraryNarrative", name: "Itinerary descriptions", icon: Cpu, description: "TinyLlama may select grounded stop text. The backend owns destinations, fares and totals." }, { key: "translation", name: "Local AI translation", icon: Languages, description: "Use the local model when there is no exact phrasebook match." }].map(item => <View key={item.key} style={themeStyle(s.card)}><Text style={themeStyle(s.heading)}>{item.name}</Text><Text style={themeStyle(s.body)}>{item.description}</Text><Button icon={item.icon} disabled={busy} selected={settings[item.key]} onPress={() => change(item.key)}>{settings[item.key] ? "Enabled — turn off" : "Disabled — turn on"}</Button></View>)}
      <Button icon={RefreshCw} disabled={busy} onPress={load}>Refresh controls</Button>
      <Text style={themeStyle(s.body)}>Model accuracy has not been measured. Evaluate a held-out dataset before publishing accuracy or performance claims.</Text>
    </View>
  </AdminPage>;
}
