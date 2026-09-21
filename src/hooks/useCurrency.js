import { usePreferencesStore } from "../store/preferencesStore";
import { convertFromPhp, convertToPhp, effectiveCurrency, formatPhp } from "../utils/currency";

export function useCurrency() {
  const selected = usePreferencesStore(state => state.currency);
  const rates = usePreferencesStore(state => state.rates);
  const currency = effectiveCurrency(selected, rates);
  return {
    currency, selected,
    formatMoney: value => formatPhp(value, selected, rates),
    fromPhp: value => convertFromPhp(value, selected, rates),
    toPhp: value => convertToPhp(value, selected, rates),
  };
}
