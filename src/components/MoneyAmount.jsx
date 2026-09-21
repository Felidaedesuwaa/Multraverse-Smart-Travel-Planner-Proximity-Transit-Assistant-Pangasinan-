import { StyleSheet, Text } from "react-native";
import { usePreferencesStore } from "../store/preferencesStore";
import { moneyDisplay } from "../utils/currency";

// Can also be nested in Text, preserving its existing color and main font size.
export default function MoneyAmount({ value, total, prefix = "", suffix = "", style }) {
  const currency = usePreferencesStore(state => state.currency);
  const rates = usePreferencesStore(state => state.rates);
  const amount = moneyDisplay(value, currency, rates);
  const comparison = total === undefined ? null : moneyDisplay(total, currency, rates);
  const primary = comparison ? `${amount.primary} / ${comparison.primary}` : amount.primary;
  const reference = comparison
    ? amount.reference && comparison.reference && `${amount.reference} / ${comparison.reference}`
    : amount.reference;

  return <Text style={style}>
    {prefix}{primary}{suffix}
    {reference && <Text style={styles.reference}>{"\n"}({reference})</Text>}
  </Text>;
}

const styles = StyleSheet.create({
  reference: { fontSize: 12, lineHeight: 18, fontWeight: "400" },
});
