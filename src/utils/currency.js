export function effectiveCurrency(selected, rates) {
  return Number.isFinite(rates?.[selected]) && rates[selected] > 0 ? selected : "PHP";
}

export function convertFromPhp(value, currency, rates) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  const code = effectiveCurrency(currency, rates);
  if (!Number.isFinite(amount)) return null;
  return amount * (code === "PHP" ? 1 : rates[code]);
}

export function convertToPhp(value, currency, rates) {
  if (value.trim() === "") return "";
  if (!/^\d*\.?\d*$/.test(value) || !Number.isFinite(Number(value))) return "";
  const code = effectiveCurrency(currency, rates);
  return String(Math.round(Number(value) / (code === "PHP" ? 1 : rates[code]) * 100) / 100);
}

export function formatPhp(value, currency, rates) {
  const converted = convertFromPhp(value, currency, rates);
  if (converted === null) return "—";
  const code = effectiveCurrency(currency, rates);
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: code, currencyDisplay: "code" }).format(converted);
  } catch { return `${code} ${converted.toFixed(2)}`; }
}

// Keep the original stored amount visible alongside a foreign-currency estimate.
export function moneyDisplay(value, currency, rates) {
  return {
    primary: formatPhp(value, currency, rates),
    reference: effectiveCurrency(currency, rates) !== "PHP" && convertFromPhp(value, "PHP", rates) !== null
      ? formatPhp(value, "PHP", rates)
      : null,
  };
}
