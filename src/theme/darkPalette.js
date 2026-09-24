import { coastalDark } from "./coastalPalette.js";

// A coastal teal foundation with warm accents for cards, forms and status.
export const darkPalette = {
  background: coastalDark.background,
  surface: coastalDark.surface,
  raised: coastalDark.paper,
  inset: coastalDark.deep,
  border: coastalDark.line,
  text: coastalDark.ink,
  muted: coastalDark.muted,
  subtle: "#9CB8B8",
  primary: coastalDark.primary,
  coralButton: "#98583F",
  greenButton: "#3B6859",
  goldButton: "#79623E",
  blueTint: coastalDark.tint,
  greenTint: "#2A423A",
  coralTint: "#493A34",
  goldTint: "#46402F",
  purpleTint: "#403847",
  blue: "#A9D0CE",
  green: "#B1CFB6",
  coral: coastalDark.accent,
  gold: "#E8CB96",
  purple: "#D0BCD0",
};

const lookup = groups => Object.fromEntries(groups.flatMap(([value, keys]) => keys.map(key => [key, value])));
export const darkSurfaces = lookup([
  [darkPalette.background, ["FDFBF7", "F7F9FB", "F4F8FA"]],
  [darkPalette.surface, ["FFFFFF", "FCFEFF"]],
  [darkPalette.inset, ["F8FAFC", "FAFCFD", "FAFCFF"]],
  [darkPalette.raised, ["F4F7FB", "F4F8FC", "F0F5FA", "F0F4F8", "EEF2F7", "F5F6F2", "EFEAE0", "E2EBF3", "E7E1D6", "D1DCE5", "CBD5E0", "B0C4D4", "EDF3F6", "F4FAFC", "EFEFEF", "F0F0F0", "D9D9D9"]],
  [darkPalette.blueTint, ["DDEAF2", "EAF1FB", "EAF1F8", "F0F8FF", "EDF4F6"]],
  [darkPalette.greenTint, ["E3F1E8", "CFE3B8", "EDF7EE", "E8F5F0", "E8F8F4"]],
  [darkPalette.coralTint, ["FCE0D8", "FFF1EE", "FFF0F0", "FEF3F2", "FFF0E8", "FFF0EC"]],
  [darkPalette.goldTint, ["FBEBD2", "FFF8E1", "FFFBF0", "FFF8EB"]],
  [darkPalette.purpleTint, ["F3EEF8", "F5F0FF"]],
  [darkPalette.primary, ["0B3C5D", "1A2E40", "183447", "1A5CB0", "3B82F6"]],
  [darkPalette.inset, ["082C44"]],
  [darkPalette.coralButton, ["F16B4E", "F46B4E", "EF4444", "D32F2F"]],
  [darkPalette.greenButton, ["2A7B4C", "22863A", "22C55E", "10B981", "087F5B"]],
  [darkPalette.goldButton, ["E8A33D", "F59E0B", "C89B3C", "C07000"]],
  ["#6D5872", ["7B5EA7", "6941C6", "A78BFA"]],
]);
export const darkForegrounds = lookup([
  [darkPalette.text, ["0B3C5D", "082C44", "1E2A2F", "1A2E40", "183447", "FFFFFF"]],
  [darkPalette.muted, ["6B7876", "6B8CA8", "5A7A8C", "4A6880", "527084", "537185", "8DA3B1", "8FB0C2", "A9C4D4", "7BB8D4", "A8CCE0", "C8E1EE", "C9DAE3"]],
  [darkPalette.subtle, ["A8BECC", "8CA0AE", "D1DCE5", "CBD4DA"]],
  [darkPalette.blue, ["1A5CB0", "3B82F6"]],
  [darkPalette.green, ["2A7B4C", "22863A", "22C55E", "10B981", "087F5B"]],
  [darkPalette.coral, ["F16B4E", "F46B4E", "EF4444", "D32F2F", "BA3928", "B44428", "FF9B85"]],
  [darkPalette.gold, ["E8A33D", "F59E0B", "C89B3C", "C07000", "92400E"]],
  [darkPalette.purple, ["7B5EA7", "6941C6", "A78BFA"]],
]);
