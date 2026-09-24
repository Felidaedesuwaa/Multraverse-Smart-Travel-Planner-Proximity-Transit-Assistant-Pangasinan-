import { useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../store/authStore";
import { useAppTheme } from "../theme/useAppTheme";
import { colors } from "../theme/colors";

export default function DeleteAccountDialog({ onClose }) {
  const { themeStyle, themeColor } = useAppTheme();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const input = useRef(null);
  const close = () => { if (!locked.current) onClose(); };
  const remove = async () => {
    if (locked.current) return;
    if (!password) { setError("Enter your current password to confirm deletion."); input.current?.focus(); return; }
    locked.current = true; setBusy(true); setError("");
    try { await useAuthStore.getState().deleteAccount(password); }
    catch (failure) { setError(failure.message); input.current?.focus(); }
    finally { locked.current = false; setBusy(false); }
  };
  return <Modal transparent animationType="fade" onRequestClose={close}>
    <SafeAreaView style={styles.overlay}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.center}>
        <View accessibilityViewIsModal style={themeStyle(styles.dialog)}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text accessibilityRole="header" style={themeStyle(styles.title)}>Delete your account?</Text>
            <Text style={themeStyle(styles.description)}>This permanently deletes your sign-in credentials, profile photo, trips, saved places, budgets and itinerary drafts. You will be signed out. This cannot be undone.</Text>
            <Text style={themeStyle(styles.label)}>Current password</Text>
            <TextInput ref={input} accessibilityLabel="Current password" accessibilityHint={error || "Confirm your password to permanently delete your account"} autoFocus secureTextEntry autoComplete="current-password" autoCapitalize="none" autoCorrect={false} placeholder="Enter your current password" placeholderTextColor={themeColor(colors.textMuted)} value={password} onChangeText={value => { setPassword(value); setError(""); }} editable={!busy} onSubmitEditing={remove} style={themeStyle([styles.input, error && styles.invalid])} />
            {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={themeStyle(styles.error)}>{error}</Text>}
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" disabled={busy} onPress={close} style={themeStyle(styles.cancel)}><Text style={themeStyle(styles.cancelText)}>Keep my account</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Permanently delete account" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={remove} style={themeStyle([styles.remove, busy && styles.disabled])}>{busy ? <ActivityIndicator color={themeColor(colors.white)} /> : <Text style={themeStyle(styles.removeText)}>Permanently delete</Text>}</Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  dialog: { width: "100%", maxWidth: 500, maxHeight: "100%", borderRadius: 20, backgroundColor: colors.white, overflow: "hidden" },
  content: { padding: 24 },
  title: { fontSize: 22, fontWeight: "700", color: colors.oceanBlue, marginBottom: 12 },
  description: { fontSize: 14, lineHeight: 22, color: colors.textMuted, marginBottom: 22 },
  label: { fontSize: 14, fontWeight: "600", color: colors.textPrimary, marginBottom: 8 },
  input: { minHeight: 48, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.warmSand, color: colors.textPrimary, fontSize: 15 },
  invalid: { borderWidth: 2, borderColor: colors.sunsetCoral },
  error: { fontSize: 13, lineHeight: 19, color: colors.sunsetCoral, marginTop: 8 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 24 },
  cancel: { flexGrow: 1, minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  remove: { flexGrow: 1, minHeight: 48, paddingHorizontal: 14, backgroundColor: colors.sunsetCoral, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cancelText: { color: colors.textPrimary, fontWeight: "600", fontSize: 13 },
  removeText: { color: colors.white, fontWeight: "600", fontSize: 13 },
  disabled: { opacity: 0.6 },
});
