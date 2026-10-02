import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DoorOpen } from "lucide-react-native";
import { useAppTheme } from "../theme/useAppTheme";
import { colors } from "../theme/colors";

export default function LogoutConfirmationDialog({ onCancel, onConfirm }) {
  const { themeStyle, themeColor } = useAppTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shown, setShown] = useState(false);
  const lock = useRef(false);
  const cancelButton = useRef(null);
  // Wait for the modal focus trap to activate, including inside the mobile drawer.
  useEffect(() => { if (shown) cancelButton.current?.focus?.(); }, [shown]);
  const cancel = () => { if (!lock.current) onCancel(); };
  const confirm = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { await onConfirm(); }
    catch { setError("Could not finish logging out. Please try again."); }
    finally { lock.current = false; setBusy(false); }
  };

  return <Modal transparent animationType="fade" onRequestClose={cancel} onShow={() => setShown(true)}>
    <SafeAreaView style={styles.overlay}>
      <View style={styles.center}>
        <Pressable accessible={false} importantForAccessibility="no" tabIndex={-1} disabled={busy} onPress={cancel} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal accessibilityLabel="Confirm log out" style={themeStyle(styles.dialog)}>
          <ScrollView contentContainerStyle={styles.content}>
            <View accessible accessibilityRole="image" accessibilityLabel="Exit door" style={themeStyle(styles.icon)}>
              <DoorOpen size={34} color={themeColor(colors.oceanBlue)} />
            </View>
            <Text accessibilityRole="header" style={themeStyle(styles.title)}>Are you sure you want to log out?</Text>
            <Text style={themeStyle(styles.description)}>You can sign in again whenever you're ready to continue.</Text>
            {!!error && <Text accessibilityRole="alert" style={themeStyle(styles.error)}>{error}</Text>}
            <View style={styles.actions}>
              <Pressable ref={cancelButton} accessibilityRole="button" disabled={busy} onPress={cancel} style={themeStyle(styles.cancel)}>
                <Text style={themeStyle(styles.cancelText)}>Cancel</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Confirm log out" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={confirm} style={themeStyle([styles.confirm, busy && styles.disabled])}>
                {busy ? <ActivityIndicator color={themeColor(colors.white)} /> : <Text style={themeStyle(styles.confirmText)}>Log out</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  dialog: { width: "100%", maxWidth: 420, maxHeight: "100%", borderRadius: 20, backgroundColor: colors.white, overflow: "hidden" },
  content: { padding: 24, alignItems: "center", gap: 16 },
  icon: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.warmSand, alignItems: "center", justifyContent: "center" },
  title: { color: colors.oceanBlue, fontSize: 22, fontWeight: "700", textAlign: "center", lineHeight: 30 },
  description: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  error: { color: colors.sunsetCoral, fontSize: 13, lineHeight: 19, textAlign: "center" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, width: "100%", marginTop: 4 },
  cancel: { flexGrow: 1, minWidth: 100, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 16 },
  cancelText: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  confirm: { flexGrow: 1, minWidth: 100, minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: colors.oceanBlue, borderRadius: 10, paddingHorizontal: 16 },
  confirmText: { color: colors.white, fontSize: 14, fontWeight: "600" },
  disabled: { opacity: 0.65 },
});
