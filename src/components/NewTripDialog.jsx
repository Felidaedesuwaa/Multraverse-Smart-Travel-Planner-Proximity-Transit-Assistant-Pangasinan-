import { useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FormField from "./FormField";
import MoneyInput from "./MoneyInput";
import { useCurrency } from "../hooks/useCurrency";
import { useAppTheme } from "../theme/useAppTheme";
import { colors } from "../theme/colors";
import { api } from "../lib/api";
import { validateTrip } from "../utils/validation";

const destinations = ["Alaminos", "Bolinao", "Dagupan", "Lingayen", "Manaoag", "Urdaneta"];
export default function NewTripDialog({ onClose, onCreated }) {
  const { currency } = useCurrency();
  const { themeStyle, themeColor } = useAppTheme();
  const [fields, setFields] = useState({ title: "", location: "", date: "", budget: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const lock = useRef(false), inputs = useRef({});
  const change = (key, value) => {
    const next = { ...fields, [key]: value }; setFields(next);
    if (submitted) setErrors(validateTrip(next));
  };
  const close = () => { if (!lock.current) onClose(); };
  const create = async () => {
    if (lock.current) return;
    const next = validateTrip(fields); setErrors(next); setSubmitted(true); setError("");
    if (Object.keys(next).length) { inputs.current[Object.keys(next)[0]]?.focus(); return; }
    lock.current = true; setSaving(true);
    try {
      const result = await api.createTrip({ title: fields.title.trim(), location: fields.location.trim(), date: fields.date, budget: fields.budget === "" ? 0 : Number(fields.budget), icon: "landmark" });
      onCreated(result); onClose();
    } catch (failure) { setError(failure.message); setErrors(failure.fieldErrors || {}); inputs.current[Object.keys(failure.fieldErrors || {})[0]]?.focus(); }
    finally { lock.current = false; setSaving(false); }
  };
  return <Modal transparent animationType="fade" onRequestClose={close}>
    <SafeAreaView style={styles.overlay}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.center}>
      <View accessibilityViewIsModal style={themeStyle(styles.dialog)}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={themeStyle(styles.title)}>Create a trip</Text>
        <Text style={themeStyle(styles.hint)}>Choose a destination, set your travel date and plan your budget. Fields marked * are required.</Text>
        <FormField ref={node => { inputs.current.title = node; }} label="Trip title *" placeholder="Hundred Islands Adventure" value={fields.title} onChangeText={value => change("title", value)} maxLength={100} error={errors.title} editable={!saving} />
        <FormField ref={node => { inputs.current.location = node; }} label="Destination *" placeholder="Alaminos, Pangasinan" value={fields.location} onChangeText={value => change("location", value)} maxLength={120} error={errors.location} editable={!saving} />
        <View style={styles.suggestions}>{destinations.map(name => <Pressable accessibilityRole="button" accessibilityLabel={`Use ${name} as destination`} disabled={saving} key={name} onPress={() => change("location", `${name}, Pangasinan`)} style={themeStyle(styles.chip)}><Text style={themeStyle(styles.chipText)}>{name}</Text></Pressable>)}</View>
        <FormField ref={node => { inputs.current.date = node; }} label="Travel date *" placeholder="2027-01-15" hint="Use YYYY-MM-DD, for example January 15, 2027 is 2027-01-15." value={fields.date} onChangeText={value => change("date", value)} maxLength={10} autoCorrect={false} error={errors.date} editable={!saving} />
        <View style={styles.field}><Text style={themeStyle(styles.label)}>Trip budget ({currency})</Text>
          <MoneyInput ref={node => { inputs.current.budget = node; }} accessibilityLabel={`Trip budget in ${currency}`} accessibilityHint={errors.budget || "Optional; leave blank for zero budget"} aria-invalid={!!errors.budget} value={fields.budget} onChangeText={value => change("budget", value)} placeholder="0.00" editable={!saving} style={themeStyle([styles.money, errors.budget && styles.invalid])} />
          <Text style={themeStyle(styles.hint)}>Optional. Enter an amount in {currency}; your budget is stored in PHP.</Text>
          {!!errors.budget && <Text accessibilityRole="alert" style={themeStyle(styles.error)}>{errors.budget}</Text>}
        </View>
        {!!error && <Text accessibilityRole="alert" style={themeStyle(styles.error)}>{error}</Text>}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={saving} onPress={close} style={themeStyle(styles.cancel)}><Text style={themeStyle(styles.chipText)}>Cancel</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }} disabled={saving} onPress={create} style={themeStyle(styles.save)}>{saving ? <ActivityIndicator color={themeColor(colors.white)} /> : <Text style={themeStyle(styles.saveText)}>Create trip</Text>}</Pressable>
        </View>
      </ScrollView></View>
    </KeyboardAvoidingView></SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }, center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  dialog: { width: "100%", maxWidth: 560, maxHeight: "100%", backgroundColor: colors.white, borderRadius: 20, overflow: "hidden" },
  content: { padding: 24, gap: 16 }, title: { fontSize: 22, fontWeight: "700", color: colors.oceanBlue }, hint: { fontSize: 12, lineHeight: 18, color: colors.textMuted },
  field: { gap: 6 }, label: { fontSize: 13, fontWeight: "600", color: colors.textPrimary }, money: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.warmSand, color: colors.textPrimary, fontSize: 15 },
  invalid: { borderColor: colors.sunsetCoral, borderWidth: 2 }, error: { color: colors.sunsetCoral, fontSize: 13, lineHeight: 19 },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12, backgroundColor: colors.warmSand, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }, chipText: { fontSize: 13, color: colors.oceanBlue },
  actions: { flexDirection: "row", gap: 10 }, cancel: { minHeight: 48, justifyContent: "center", paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }, save: { flex: 1, minHeight: 48, justifyContent: "center", alignItems: "center", backgroundColor: colors.oceanBlue, borderRadius: 10 }, saveText: { color: colors.white, fontWeight: "600" },
});
