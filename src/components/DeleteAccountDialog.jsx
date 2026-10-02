import { FeedbackPressable } from "./WorkspaceMotion";
import { useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FormField from "./FormField";
import { useAuthStore } from "../store/authStore";
import { useAppTheme } from "../theme/useAppTheme";
import { colors } from "../theme/colors";

export default function DeleteAccountDialog({ onClose }) {
  const { themeStyle } = useAppTheme();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const input = useRef(null);
  const close = () => { if (!locked.current) { setPassword(""); onClose(); } };
  const remove = async () => {
    if (locked.current) return;
    if (!password) { setError("Enter your current password to confirm deletion."); input.current?.focus(); return; }
    locked.current = true; setBusy(true); setError("");
    try { await useAuthStore.getState().deleteAccount(password); }
    catch (failure) { setPassword(""); setError(failure.message || "Unable to delete your account. Please try again."); input.current?.focus(); }
    finally { locked.current = false; setBusy(false); }
  };
  return <Modal transparent animationType="fade" onRequestClose={close}>
    <SafeAreaView style={styles.overlay}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.center}>
        <View accessibilityViewIsModal style={themeStyle(styles.dialog)}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text accessibilityRole="header" style={themeStyle(styles.title)}>Delete your account?</Text>
            <Text style={themeStyle(styles.description)}>This permanently deletes your sign-in credentials, profile photo, trips, saved places, budgets and itinerary drafts. You will be signed out. This cannot be undone.</Text>
            <FormField ref={input} label="Current password" password autoFocus autoComplete="current-password" autoCapitalize="none" autoCorrect={false} maxLength={256} returnKeyType="done" placeholder="Enter your current password" hint="For your security, we must verify your password before deleting your account." value={password} onChangeText={value => { setPassword(value); setError(""); }} editable={!busy} onSubmitEditing={remove} error={error} />
            <View style={styles.actions}>
              <FeedbackPressable accessibilityRole="button" disabled={busy} onPress={close} style={themeStyle(styles.cancel)}><Text style={themeStyle(styles.cancelText)}>Keep my account</Text></FeedbackPressable>
              <FeedbackPressable accessibilityRole="button" accessibilityLabel="Verify password and permanently delete account" accessibilityState={{ disabled: busy || !password, busy }} disabled={busy || !password} onPress={remove} style={({ pressed, hovered }) => [styles.remove, hovered && styles.removeHovered, pressed && styles.removePressed, (busy || !password) && styles.disabled]}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.removeText}>Verify password and delete</Text>}</FeedbackPressable>
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
  title: { fontFamily: "Poppins", fontSize: 22, fontWeight: "700", color: colors.oceanBlue, marginBottom: 12 },
  description: { fontFamily: "DMSans", fontSize: 14, lineHeight: 22, color: colors.textMuted, marginBottom: 22 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 24 },
  cancel: { flexGrow: 1, minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  remove: { flexGrow: 1, minHeight: 48, paddingHorizontal: 14, backgroundColor: "#8F4549", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  removeHovered: { backgroundColor: "#7D3D42" },
  removePressed: { backgroundColor: "#6E3439" },
  cancelText: { fontFamily: "DMSans", color: colors.textPrimary, fontWeight: "600", fontSize: 13 },
  removeText: { fontFamily: "DMSans", color: colors.white, fontWeight: "600", fontSize: 13 },
  disabled: { backgroundColor: "#6B4447" },
});
