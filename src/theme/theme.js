import { darkPalette, darkSurfaces, darkForegrounds } from "./darkPalette.js";

// Resolve existing page colors by role so all screens share the same dark tones.
export function createTheme(dark) {
  const cache = new WeakMap();
  const background = dark ? darkPalette.background : "#FDFBF7";
  const surface = dark ? darkPalette.surface : "#FFFFFF";
  const text = dark ? darkPalette.text : "#1E2A2F";
  function themeColor(value, role = "color") {
    if (!dark || typeof value !== "string") return value;
    const normalized = value.toUpperCase();
    if (role === "shadowColor" || value === "transparent" || value.startsWith("rgba")) return value;
    let hex = normalized === "WHITE" ? "FFFFFF" : normalized === "BLACK" ? "000000" : normalized.replace("#", "");
    if (/^[0-9A-F]{3}$/.test(hex)) hex = hex.split("").map(c => c + c).join("");
    if (!/^[0-9A-F]{6}$/.test(hex)) return value;
    const rgb = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16));
    const brightness = (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) / 255;
    const saturation = (Math.max(...rgb) - Math.min(...rgb)) / 255;
    if (role === "backgroundColor" || role === "fill") {
      if (role === "fill" && darkForegrounds[hex]) return darkForegrounds[hex];
      if (darkSurfaces[hex]) return darkSurfaces[hex];
      if (brightness > 0.72) return darkPalette.raised;
      return value;
    }
    if (role.toLowerCase().includes("border") || role === "stroke") {
      if (["0B3C5D", "082C44", "1A2E40"].includes(hex)) return "#7797A9";
      return brightness > 0.7 && saturation < 0.3 ? darkPalette.border : darkForegrounds[hex] || value;
    }
    if (darkForegrounds[hex]) return darkForegrounds[hex];
    if (brightness < 0.55) return '#' + rgb.map(channel => Math.round(channel + (255 - channel) * 0.55).toString(16).padStart(2, '0')).join('');
    return value;
  }
  function themeStyle(style) {
    if (!dark || !style) return style;
    if (typeof style === "function") return state => themeStyle(style(state));
    if (Array.isArray(style)) return style.map(themeStyle);
    if (typeof style !== "object") return style;
    if (cache.has(style)) return cache.get(style);
    const result = Object.fromEntries(Object.entries(style).map(([key, value]) => [key, key.endsWith("Color") || key === "color" ? themeColor(value, key) : value]));
    cache.set(style, result);
    return result;
  }
  const mapColors = dark ? {
    water: "#152E3F", regions: ["#92B6A5", "#A7C4B2", "#7FA995", "#B9CDBC"],
    border: "#344F58", label: "#102F34", muted: "#3F5862", mutedLabel: "#B7C7CE", gulf: "#A5C5D5", activeBorder: "#FFF1D2", activeLabel: "#172A33",
  } : {
    water: "#EDF4F6", regions: ["#D4DED3", "#DFE5D8", "#CDDAD1", "#E2E7DC"],
    border: "#FFFFFF", label: "#0B3C5D", muted: "#E3E6E3", mutedLabel: "#6B7876", gulf: "#829DAD", activeBorder: "#FFFFFF", activeLabel: "#172A33",
  };
  return { isDark: dark, background, surface, text, themeColor, themeStyle, mapColors };
}
