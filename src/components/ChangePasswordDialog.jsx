import { FeedbackPressable } from "./WorkspaceMotion";
import { useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FormField from "./FormField";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useAppTheme } from "../theme/useAppTheme";
import { colors } from "../theme/colors";
import { validatePassword, validateConfirmPassword } from "../utils/validation";

export default function ChangePasswordDialog({ onClose }) {
  const { themeStyle, themeColor } = useAppTheme();
  const [fields, setFields] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const lock = useRef(false), inputs = useRef({});
  const focus = errors => inputs.current[Object.keys(errors).find(key => errors[key])]?.focus();
  const close = () => { if (!lock.current) { if (done) useAuthStore.getState().logout(); else onClose(); } };
  const submit = async () => {
    if (lock.current) return;
    const next = { currentPassword: fields.currentPassword ? null : "Enter your current password.", newPassword: validatePassword(fields.newPassword), confirm: validateConfirmPassword(fields.newPassword, fields.confirm) };
    if (!next.newPassword && fields.currentPassword === fields.newPassword) next.newPassword = "Choose a different password.";
    setErrors(next); setError("");
    if (Object.values(next).some(Boolean)) { focus(next); return; }
    lock.current = true; setBusy(true);
    try { await api.changePassword(fields.currentPassword, fields.newPassword); setFields({ currentPassword: "", newPassword: "", confirm: "" }); setDone(true); }
    catch (failure) { setError(failure.message); setErrors(failure.fieldErrors || {}); focus(failure.fieldErrors || {}); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Modal transparent animationType="fade" onRequestClose={close}>
    <SafeAreaView style={styles.overlay}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.center}>
      <View accessibilityViewIsModal style={themeStyle(styles.dialog)}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={themeStyle(styles.title)}>{done ? "Password changed" : "Change password"}</Text>
        <Text accessibilityLiveRegion="polite" style={themeStyle(styles.description)}>{done ? "All previous sessions have been signed out. Sign in again with your new password." : "Confirm your current password to choose a new one. Updating it signs out all existing sessions."}</Text>
        {!done && <>
          {[["currentPassword", "Current password", "Enter your current password"], ["newPassword", "New password", "Create a new password"], ["confirm", "Confirm new password", "Re-enter your new password"]].map(([key, label, placeholder]) => <FormField key={key} ref={node => { inputs.current[key] = node; }} label={label} placeholder={placeholder} password value={fields[key]} onChangeText={value => setFields(previous => ({ ...previous, [key]: value }))} autoCapitalize="none" autoCorrect={false} autoComplete={key === "currentPassword" ? "current-password" : "new-password"} maxLength={key === "currentPassword" ? 256 : 72} error={errors[key]} editable={!busy} hint={key === "newPassword" ? "8–72 characters, an uppercase letter and a number. Use only letters, numbers, _, - and @." : undefined} returnKeyType={key === "confirm" ? "done" : "next"} onSubmitEditing={() => key === "confirm" ? submit() : inputs.current[key === "currentPassword" ? "newPassword" : "confirm"]?.focus()} />)}
          {!!error && <Text accessibilityRole="alert" style={themeStyle(styles.error)}>{error}</Text>}
        </>}
        <View style={styles.actions}>
          {!done && <FeedbackPressable accessibilityRole="button" disabled={busy} onPress={close} style={themeStyle(styles.cancel)}><Text style={themeStyle(styles.cancelText)}>Cancel</Text></FeedbackPressable>}
          <FeedbackPressable accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={done ? close : submit} style={themeStyle(styles.save)}>{busy ? <ActivityIndicator color={themeColor(colors.white)} /> : <Text style={themeStyle(styles.saveText)}>{done ? "Sign out" : "Update password"}</Text>}</FeedbackPressable>
        </View>
      </ScrollView></View>
    </KeyboardAvoidingView></SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }, center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  dialog: { width: "100%", maxWidth: 500, maxHeight: "100%", borderRadius: 20, backgroundColor: colors.white, overflow: "hidden" },
  content: { padding: 24, gap: 16 }, title: { color: colors.oceanBlue, fontSize: 22, fontWeight: "700" }, description: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  error: { color: colors.sunsetCoral, fontSize: 13, lineHeight: 19 }, actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cancel: { minHeight: 48, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 10, justifyContent: "center" }, cancelText: { color: colors.textPrimary },
  save: { flexGrow: 1, minHeight: 48, paddingHorizontal: 16, backgroundColor: colors.oceanBlue, borderRadius: 10, alignItems: "center", justifyContent: "center" }, saveText: { color: colors.white, fontWeight: "600" },
});
