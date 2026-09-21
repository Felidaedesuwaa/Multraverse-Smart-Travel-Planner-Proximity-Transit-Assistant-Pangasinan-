import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import Card from "../components/Card";
import ToggleSwitch from "../components/ToggleSwitch";
import CurrencyPicker from "../components/CurrencyPicker";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileEditor from "../components/ProfileEditor";
import { useAuthStore } from "../store/authStore";
import { usePreferencesStore } from "../store/preferencesStore";
import { useAppTheme } from "../theme/useAppTheme";
import { colors } from "../theme/colors";

function Section({ title, children }) {
  const { themeStyle } = useAppTheme();
  return (
    <Card style={themeStyle(styles.section)}>
      <Text accessibilityRole="header" style={themeStyle(styles.sectionTitle)}>{title.toUpperCase()}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </Card>
  );
}
function Row({ label, description, control, last, danger, stacked }) {
  const { themeStyle } = useAppTheme();
  return <View style={themeStyle([styles.row, !last && styles.rowBorder, stacked && styles.stacked])}><View style={stacked ? styles.stackedText : styles.rowText}><Text style={themeStyle([styles.rowLabel, danger && styles.dangerText])}>{label}</Text><Text style={themeStyle(styles.rowDescription)}>{description}</Text></View>{control}</View>;
}
function CycleButton({ value, values, onChange }) {
  const { themeStyle } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={`Language: ${value}`} onPress={() => onChange(values[(values.indexOf(value) + 1) % values.length])} style={themeStyle(styles.choice)}><Text style={themeStyle(styles.choiceText)}>{value}</Text></Pressable>;
}

export default function SettingsPage() {
  const { themeStyle, themeColor } = useAppTheme();
  const { width } = useWindowDimensions();
  const contentWidth = width >= 768 ? width - 280 : width;
  const compact = contentWidth < 600;
  const user = useAuthStore(state => state.user);
  const [editor, setEditor] = useState(null);
  const [profileMessage, setProfileMessage] = useState(null);
  useEffect(() => { useAuthStore.getState().refreshProfile(); }, []);
  const dark = usePreferencesStore(state => state.darkMode);
  const setDark = usePreferencesStore(state => state.setDarkMode);
  const ratesLoading = usePreferencesStore(state => state.ratesLoading);
  const ratesError = usePreferencesStore(state => state.ratesError);
  const storageError = usePreferencesStore(state => state.storageError);
  const refreshRates = usePreferencesStore(state => state.refreshRates);
  const selectedCurrency = usePreferencesStore(state => state.currency);
  const [push, setPush] = useState(true);
  const [sms, setSms] = useState(false);
  const [digest, setDigest] = useState(true);
  const [language, setLanguage] = useState("English");
  const [region, setRegion] = useState("Pangasinan, Philippines");
  const name = user?.name || "Traveler";
  return <><ScrollView contentContainerStyle={themeStyle([styles.screen, compact && styles.screenCompact])}>
    <View style={styles.content}>
    <View style={styles.header}>
      <Text accessibilityRole="header" style={themeStyle(styles.title)}>Settings</Text>
      <Text style={themeStyle(styles.subtitle)}>Manage your account and preferences</Text>
    </View>
    <Card style={themeStyle([styles.profile, compact && styles.profileCompact])}>
      <View style={[styles.identity, compact ? styles.identityCompact : styles.identityWide]}>
        <ProfileAvatar user={user} />
        <View style={styles.identityText}>
          <Text style={themeStyle(styles.name)}>{name}</Text>
          {!!user?.email && <Text style={themeStyle(styles.sub)}>{user.email}</Text>}
          <Text style={themeStyle(styles.sub)}>{user?.role === "PRO" ? "Pro" : "Explorer"}{user?.location ? ` · ${user.location}` : ""}</Text>
        </View>
      </View>
      <View style={styles.profileActions}>
        <Pressable accessibilityRole="button" onPress={() => { setProfileMessage(null); setEditor("details"); }} style={themeStyle(styles.edit)}><Text style={styles.editText}>Edit Profile</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => { setProfileMessage(null); setEditor("photo"); }} style={themeStyle(styles.photo)}><Text style={themeStyle(styles.photoText)}>Change Photo</Text></Pressable>
      </View>
    </Card>
    {profileMessage && <Text accessibilityLiveRegion="polite" style={themeStyle(styles.success)}>{profileMessage}</Text>}
    <Section title="Notifications">
      <Row label="Push Notifications" description="Receive alerts on your device" control={<ToggleSwitch accessibilityLabel="Push notifications" checked={push} onChange={setPush} />} />
      <Row label="SMS Alerts" description="Transit alarm via text message" control={<ToggleSwitch accessibilityLabel="SMS alerts" checked={sms} onChange={setSms} />} />
      <Row label="Email Digest" description="Weekly travel summary" control={<ToggleSwitch accessibilityLabel="Email digest" checked={digest} onChange={setDigest} />} last />
    </Section>
    <Section title="App Preferences">
      <Row label="Dark Mode" description="Use a darker appearance" control={<ToggleSwitch accessibilityLabel="Dark Mode" checked={dark} onChange={setDark} />} />
      <Row label="Language" description="App display language" control={<CycleButton value={language} values={["English", "Filipino", "Pangasinan"]} onChange={setLanguage} />} />
      <Row label="Currency" description="Your preferred display currency" control={<CurrencyPicker buttonStyle={styles.choice} />} />
      {selectedCurrency !== "PHP" && (ratesLoading || ratesError) && <View style={styles.rateStatus}>{ratesLoading ? <ActivityIndicator color={themeColor(colors.oceanBlue)} /> : null}{ratesError && <><Text style={themeStyle(styles.rowDescription)}>{ratesError}</Text><Pressable accessibilityRole="button" accessibilityLabel="Retry exchange rates" onPress={() => refreshRates(true)} style={styles.retry}><Text style={themeStyle(styles.choiceText)}>Retry exchange rates</Text></Pressable></>}</View>}
      <Row label="Default Region" description="Pre-filled in trip search" stacked={compact} control={<TextInput accessibilityLabel="Default destination region" value={region} onChangeText={setRegion} style={themeStyle([styles.regionInput, compact && styles.regionInputCompact])} />} last />
    </Section>
    {storageError && <Text style={themeStyle(styles.storageError)}>{storageError}</Text>}
    <Section title="Privacy & Data">
      <Row label="Location Access" description="For transit alerts and geofencing" control={<Text style={themeStyle(styles.allowed)}>Allowed</Text>} />
      <Row label="Delete Account" description="Permanently remove your data" danger control={<Pressable accessibilityRole="button" style={themeStyle(styles.delete)}><Text style={styles.deleteText}>Delete</Text></Pressable>} last />
    </Section>
    </View>
  </ScrollView>
    {editor && <ProfileEditor key={editor} mode={editor} onClose={() => setEditor(null)} onSaved={message => { setEditor(null); setProfileMessage(message); }} />}
  </>;
}
const styles = StyleSheet.create({
  screen: { flexGrow: 1, width: "100%", alignItems: "center", paddingHorizontal: 28, paddingVertical: 28, backgroundColor: colors.warmSand },
  screenCompact: { paddingHorizontal: 16, paddingVertical: 20 },
  content: { width: "100%", maxWidth: 720, gap: 16 },
  header: { alignItems: "center", gap: 4, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: "700", color: colors.oceanBlue },
  subtitle: { fontSize: 13, lineHeight: 20, color: colors.textMuted, textAlign: "center" },
  sub: { marginTop: 2, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  profile: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, borderRadius: 12, shadowOpacity: 0, elevation: 0 },
  profileCompact: { flexDirection: "column", alignItems: "stretch", gap: 12 },
  identity: { flexDirection: "row", alignItems: "center", gap: 12 },
  identityWide: { flex: 1 },
  identityCompact: { width: "100%", flexShrink: 0 },
  identityText: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  profileActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  edit: { paddingHorizontal: 12, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: colors.oceanBlue },
  editText: { fontSize: 12, fontWeight: "600", color: colors.white },
  photo: { paddingHorizontal: 12, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  photoText: { fontSize: 12, fontWeight: "600", color: colors.textPrimary },
  section: { padding: 0, borderRadius: 12, shadowOpacity: 0, elevation: 0, overflow: "hidden" },
  sectionTitle: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.warmSand, fontSize: 10, fontWeight: "700", letterSpacing: 1, color: colors.textMuted },
  sectionBody: { paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, paddingVertical: 10, minHeight: 64 },
  stacked: { flexDirection: "column", alignItems: "stretch", gap: 8, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowText: { flex: 1, minWidth: 0 },
  stackedText: { minWidth: 0 },
  rowLabel: { fontSize: 13, fontWeight: "600", lineHeight: 19, color: colors.textPrimary },
  rowDescription: { marginTop: 2, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  choice: { paddingHorizontal: 12, minWidth: 104, minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white },
  choiceText: { fontSize: 13, color: colors.textPrimary, textAlign: "center" },
  regionInput: { width: 220, minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, fontSize: 13, color: colors.textPrimary, backgroundColor: colors.white },
  regionInputCompact: { width: "100%" },
  allowed: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: colors.palmGreenLight, color: colors.palmGreen, fontSize: 11, fontWeight: "600" },
  dangerText: { color: colors.sunsetCoral },
  delete: { paddingHorizontal: 12, minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: colors.coralLight, borderRadius: 8 },
  deleteText: { color: colors.sunsetCoral, fontSize: 12, fontWeight: "600" },
  rateStatus: { paddingVertical: 10, gap: 6 },
  retry: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  storageError: { color: colors.sunsetCoral, fontSize: 12, lineHeight: 18 },
  success: { color: colors.palmGreen, fontSize: 13, lineHeight: 18 },
});
