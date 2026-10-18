import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FeedbackPressable } from "../components/WorkspaceMotion";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileEditor from "../components/ProfileEditor";
import ToggleSwitch from "../components/ToggleSwitch";
import { useAuthStore } from "../store/authStore";
import { usePreferencesStore } from "../store/preferencesStore";
import AdminPage from "../components/AdminPage";
import Card from "../components/Card";
import ChangePasswordButton from "../components/ChangePasswordButton";
import { useAppTheme } from "../theme/useAppTheme";
import { colors } from "../theme/colors";

export default function AdminSettings() {
  const { themeStyle } = useAppTheme();
  const user = useAuthStore(state => state.user);
  const accountLabel = user?.role === 'SUPERADMIN' ? 'Super Admin' : user?.role === 'LGU' ? 'LGU' : 'Admin';
  const darkMode = usePreferencesStore(state => state.darkMode);
  const setDarkMode = usePreferencesStore(state => state.setDarkMode);
  const storageError = usePreferencesStore(state => state.storageError);
  const [editor, setEditor] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => { useAuthStore.getState().refreshProfile(); }, []);
  const edit = mode => { setMessage(null); setEditor(mode); };

  return (
    <>
    <AdminPage title={`${accountLabel} Settings`} subtitle="Manage your profile, appearance and account security">
      <Card style={themeStyle(styles.section)}>
        <Text accessibilityRole="header" style={themeStyle(styles.sectionTitle)}>{accountLabel} Profile</Text>
        <View style={styles.body}>
          <View style={styles.identity}>
            <ProfileAvatar user={user} size={56} />
            <View style={styles.identityText}>
              <Text style={themeStyle(styles.name)}>{user?.name || accountLabel}</Text>
              {!!user?.email && <Text style={themeStyle(styles.description)}>{user.email}</Text>}
              <Text style={themeStyle(styles.description)}>{user?.role === 'SUPERADMIN' ? 'Super Administrator' : user?.role === 'LGU' ? 'Municipal tourism officer' : 'Administrator'}</Text>
              {!!user?.location && <Text style={themeStyle(styles.description)}>{user.location}</Text>}
            </View>
          </View>
          <View style={styles.actions}>
            {[['details', 'Edit Profile'], ['photo', 'Change Photo']].map(([mode, label]) => (
              <FeedbackPressable key={mode} accessibilityRole="button" onPress={() => edit(mode)} style={themeStyle(styles.button)}>
                <Text style={themeStyle(styles.buttonText)}>{label}</Text>
              </FeedbackPressable>
            ))}
          </View>
          {!!message && <Text accessibilityLiveRegion="polite" style={themeStyle(styles.success)}>{message}</Text>}
        </View>
      </Card>
      <Card style={themeStyle(styles.section)}>
        <Text accessibilityRole="header" style={themeStyle(styles.sectionTitle)}>Appearance</Text>
        <View style={styles.preference}>
          <View style={styles.identityText}>
            <Text style={themeStyle(styles.name)}>Dark mode</Text>
            <Text style={themeStyle(styles.description)}>Use a darker appearance. Saved on this device.</Text>
          </View>
          <ToggleSwitch accessibilityLabel="Dark mode" checked={darkMode} onChange={setDarkMode} />
        </View>
        {!!storageError && <Text accessibilityRole="alert" style={themeStyle(styles.error)}>{storageError}</Text>}
      </Card>
      <Card style={themeStyle(styles.section)}>
        <Text accessibilityRole="header" style={themeStyle(styles.sectionTitle)}>Account Security</Text>
        <View style={styles.body}>
          <Text style={themeStyle(styles.description)}>Update your password and sign out other sessions.</Text>
          <ChangePasswordButton />
        </View>
      </Card>
    </AdminPage>
    {editor && <ProfileEditor key={editor} mode={editor} onClose={() => setEditor(null)} onSaved={text => { setEditor(null); setMessage(text); }} />}
    </>
  );
}

const styles = StyleSheet.create({
  section: { padding: 0, marginBottom: 20 },
  sectionTitle: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, fontFamily: "Poppins", fontSize: 16, fontWeight: "700", color: colors.oceanBlue },
  body: { padding: 16, alignItems: "flex-start", gap: 8 },
  description: { fontFamily: "DMSans", fontSize: 14, color: colors.textMuted },
  identity: { flexDirection: "row", alignItems: "center", gap: 14, width: "100%" },
  identityText: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontFamily: "DMSans", fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  button: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  buttonText: { fontFamily: "DMSans", fontWeight: "600", color: colors.oceanBlue },
  preference: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16 },
  success: { color: colors.palmGreen, fontSize: 14 },
  error: { color: colors.sunsetCoral, fontSize: 14, padding: 16 },
});
