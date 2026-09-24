import { darkPalette, darkSurfaces, darkForegrounds } from "./darkPalette.js";
import { coastalLight, coastalDark, lightSurfaces, lightForegrounds, neutralBorders } from "./coastalPalette.js";

// Resolve existing page colors by role in both light and dark mode.
export function createTheme(dark) {
  const cache = new WeakMap();
  const palette = dark ? coastalDark : coastalLight;
  const { background, surface, ink: text } = palette;
  const surfaces = dark ? darkSurfaces : lightSurfaces;
  const foregrounds = dark ? darkForegrounds : lightForegrounds;
  // Components sometimes theme styles before passing them to another themed
  // component. Keep the resolved colors stable through those nested calls.
  const resolved = new Set([...Object.values(palette), ...Object.values(surfaces), ...Object.values(foregrounds), ...(dark ? Object.values(darkPalette) : [])].filter(value => typeof value === "string").map(value => value.toUpperCase()));
  function themeColor(value, role = "color") {
    if (typeof value !== "string") return value;
    const normalized = value.toUpperCase();
    if (role === "shadowColor" || value === "transparent" || value.startsWith("rgba")) return value;
    let hex = normalized === "WHITE" ? "FFFFFF" : normalized === "BLACK" ? "000000" : normalized.replace("#", "");
    if (/^[0-9A-F]{3}$/.test(hex)) hex = hex.split("").map(c => c + c).join("");
    if (!/^[0-9A-F]{6}$/.test(hex)) return value;
    if (resolved.has(`#${hex}`)) return value;
    const rgb = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16));
    const brightness = (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) / 255;
    const saturation = (Math.max(...rgb) - Math.min(...rgb)) / 255;
    if (role === "backgroundColor" || role === "fill") {
      if (role === "fill" && foregrounds[hex]) return foregrounds[hex];
      if (surfaces[hex]) return surfaces[hex];
      if (dark && brightness > 0.72) return darkPalette.raised;
      return value;
    }
    if (role.toLowerCase().includes("border") || role === "stroke") {
      if (neutralBorders.has(hex)) return palette.line;
      if (dark && ["0B3C5D", "082C44", "1A2E40"].includes(hex)) return "#83A8AA";
      return dark && brightness > 0.7 && saturation < 0.3 ? palette.line : foregrounds[hex] || value;
    }
    if (foregrounds[hex]) return foregrounds[hex];
    if (dark && brightness < 0.55) return '#' + rgb.map(channel => Math.round(channel + (255 - channel) * 0.55).toString(16).padStart(2, '0')).join('');
    return value;
  }
  function themeStyle(style) {
    if (!style) return style;
    if (typeof style === "function") return state => themeStyle(style(state));
    if (Array.isArray(style)) return style.map(themeStyle);
    if (typeof style !== "object") return style;
    if (cache.has(style)) return cache.get(style);
    const result = Object.fromEntries(Object.entries(style).map(([key, value]) => [key, key.endsWith("Color") || key === "color" ? themeColor(value, key) : value]));
    cache.set(style, result);
    return result;
  }
  const mapColors = dark ? {
    water: "#16383E", regions: ["#92B6A5", "#A9C7B2", "#7FA995", "#C1D2B6"],
    border: "#365953", label: "#133731", muted: "#3B5552", mutedLabel: "#B9CFC9", gulf: "#ADCAC8", activeBorder: "#FFF1D2", activeLabel: "#153C45", active: coastalDark.button, route: "#DBEAE2", routeText: "#153C45",
  } : {
    water: "#DBEFE9", regions: ["#BDD6BF", "#D2E2C5", "#ACCDB7", "#E0E6CB"],
    border: "#FFFDFA", label: coastalLight.ink, muted: "#DCE4D9", mutedLabel: coastalLight.muted, gulf: "#597F7C", activeBorder: "#FFF9EF", activeLabel: coastalLight.ink, active: coastalLight.button, route: coastalLight.primary, routeText: coastalLight.onPrimary,
  };
  return { isDark: dark, palette, background, surface, text, themeColor, themeStyle, mapColors };
}
