import { useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, ChevronDown, Search, X } from "lucide-react-native";
import currencies from "../data/currencies.json";
import { usePreferencesStore } from "../store/preferencesStore";
import { useAppTheme } from "../theme/useAppTheme";

export default function CurrencyPicker({ buttonStyle }) {
  const { themeStyle, themeColor } = useAppTheme();
  const currency = usePreferencesStore(state => state.currency);
  const setCurrency = usePreferencesStore(state => state.setCurrency);
  const refreshRates = usePreferencesStore(state => state.refreshRates);
  const loading = usePreferencesStore(state => state.ratesLoading);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const matches = currencies.filter(item => `${item.code} ${item.name}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Display currency: ${currency}`} accessibilityState={{ expanded: open }} onPress={() => { setQuery(""); setOpen(true); refreshRates(); }} style={themeStyle([styles.button, buttonStyle])}>
      <Text style={themeStyle(styles.buttonLabel)}>{currency}</Text><ChevronDown size={16} color={themeColor("#0B3C5D")} />
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close currency selection" onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={themeStyle(styles.modal)}>
          <View style={styles.header}><View style={{ flex: 1 }}><Text style={themeStyle(styles.title)}>Display currency</Text><Text style={themeStyle(styles.caption)}>{currencies.length} supported currencies</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close currency selection" style={styles.close} onPress={() => setOpen(false)}><X size={22} color={themeColor("#0B3C5D")} /></Pressable></View>
          <View style={themeStyle(styles.search)}><Search size={18} color={themeColor("#6B7876")} /><TextInput accessibilityLabel="Search currencies" placeholder="Search currency or code" placeholderTextColor={themeColor("#6B7876")} value={query} onChangeText={setQuery} style={themeStyle(styles.searchInput)} autoCorrect={false} /></View>
          <FlatList data={matches} keyExtractor={item => item.code} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }} initialNumToRender={18} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.code} ${item.name}`} accessibilityState={{ selected: item.code === currency }} onPress={() => { setCurrency(item.code); setOpen(false); }} style={themeStyle([styles.option, item.code === currency && styles.selected])}><Text style={themeStyle(styles.code)}>{item.code}</Text><Text style={themeStyle(styles.name)}>{item.name}</Text>{item.code === currency && <Check size={18} color={themeColor("#2A7B4C")} />}</Pressable>} ListEmptyComponent={<Text style={themeStyle(styles.empty)}>No matching currency.</Text>} />
          <View style={styles.footer}>{loading && <ActivityIndicator size="small" color={themeColor("#0B3C5D")} />}<Text style={themeStyle(styles.caption)}>Converted prices are estimates. Local charges may still be in PHP.</Text></View>
        </View>
      </SafeAreaView>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  button: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, borderWidth: 1, borderColor: "#E7E1D6", borderRadius: 10, paddingHorizontal: 14, minHeight: 46, backgroundColor: "#FFFFFF", minWidth: 108 },
  buttonLabel: { color: "#0B3C5D", fontSize: 14, fontWeight: "600" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 16 },
  modal: { width: "100%", maxWidth: 480, maxHeight: "85%", backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", padding: 18, gap: 8 },
  title: { fontSize: 20, fontWeight: "700", color: "#0B3C5D" },
  caption: { fontSize: 12, lineHeight: 18, color: "#6B7876", flexShrink: 1 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  search: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 18, marginBottom: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#F5F6F2" },
  searchInput: { flex: 1, minHeight: 46, color: "#0B3C5D", fontSize: 14 },
  option: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, minHeight: 52, borderBottomWidth: 1, borderBottomColor: "#E7E1D6" },
  selected: { backgroundColor: "#E3F1E8" },
  code: { width: 38, fontSize: 13, fontWeight: "700", color: "#0B3C5D" },
  name: { flex: 1, fontSize: 14, paddingVertical: 10, color: "#1E2A2F" },
  empty: { padding: 24, color: "#6B7876" },
  footer: { padding: 16, flexDirection: "row", alignItems: "center", gap: 10 },
});
