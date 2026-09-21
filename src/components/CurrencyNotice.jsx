import { Linking, Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePreferencesStore } from "../store/preferencesStore";
import { useCurrency } from "../hooks/useCurrency";
import { useAppTheme } from "../theme/useAppTheme";

export default function CurrencyNotice() {
  const { themeStyle } = useAppTheme();
  const { selected, currency } = useCurrency();
  const updated = usePreferencesStore(state => state.ratesUpdatedAt);
  const error = usePreferencesStore(state => state.ratesError);
  if (selected === "PHP") return null;
  const stale = updated && Date.now() - new Date(updated).getTime() > 48 * 60 * 60 * 1000;
  return <SafeAreaView edges={["bottom", "left", "right"]} style={themeStyle(styles.bar)}>
    <Text style={themeStyle(styles.text)}>{currency !== selected ? `${selected} rate unavailable · showing PHP` : `${currency} estimates · ${error || stale ? "cached " : ""}rates ${updated ? new Date(updated).toLocaleDateString() : ""}`}</Text>
    <Pressable accessibilityRole="link" onPress={() => Linking.openURL("https://www.exchangerate-api.com")}><Text style={themeStyle(styles.link)}>Rates by ExchangeRate-API</Text></Pressable>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ bar: { paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E7E1D6" }, text: { fontSize: 10, color: "#6B7876" }, link: { fontSize: 10, color: "#0B3C5D", textDecorationLine: "underline" } });
