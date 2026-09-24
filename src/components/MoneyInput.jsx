import { forwardRef, useEffect, useRef, useState } from "react";
import { TextInput } from "react-native";
import { useCurrency } from "../hooks/useCurrency";
import { useAppTheme } from "../theme/useAppTheme";

const MoneyInput = forwardRef(function MoneyInput({ value, onChangeText, ...props }, ref) {
  const { currency, fromPhp, toPhp } = useCurrency();
  const { themeStyle, themeColor } = useAppTheme();
  const [draft, setDraft] = useState("");
  const focused = useRef(false);
  const previousCurrency = useRef(currency);
  const formatted = () => {
    const amount = fromPhp(value);
    if (amount === null) return "";
    const decimals = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
    return String(Number(amount.toFixed(decimals)));
  };
  useEffect(() => {
    if (!focused.current || previousCurrency.current !== currency) setDraft(formatted());
    previousCurrency.current = currency;
  }, [value, currency, fromPhp(value)]);
  return <TextInput {...props} ref={ref} style={themeStyle(props.style)} placeholderTextColor={themeColor(props.placeholderTextColor || "#6B7876")} accessibilityLabel={props.accessibilityLabel || `Amount in ${currency}`} keyboardType="decimal-pad" value={draft}
    onFocus={event => { focused.current = true; props.onFocus?.(event); }}
    onBlur={event => { focused.current = false; setDraft(formatted()); props.onBlur?.(event); }}
    onChangeText={text => { if (/^\d*\.?\d*$/.test(text)) { setDraft(text); onChangeText(toPhp(text)); } }} />;
});
export default MoneyInput;
