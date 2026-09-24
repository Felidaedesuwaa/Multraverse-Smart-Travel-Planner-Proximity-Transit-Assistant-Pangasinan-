// Shared by the public pages, user workspace, and admin console.
export const coastalLight = {
  dark: false, background: "#FCF8EF", surface: "#FFFDFA", ink: "#163F49",
  muted: "#566F72", line: "#E4E6DB", tint: "#E8F0E5", accent: "#B8583B", paper: "#F4ECDD",
  primary: "#123F52", deep: "#103746", brand: "#256773", button: "#F4B183", onButton: "#153C45",
  onPrimary: "#FFF9EF", secondaryOnPrimary: "#BDD3D8",
};

export const coastalDark = {
  dark: true, background: "#14252D", surface: "#20363F", ink: "#E5EEE9",
  muted: "#ADC5C7", line: "#365059", tint: "#284B4C", accent: "#F4B58B", paper: "#243C45",
  primary: "#365F68", deep: "#183039", brand: "#256773", button: "#F4B183", onButton: "#153C45",
  onPrimary: "#FFF9EF", secondaryOnPrimary: "#BDD3D8",
};

const lookup = groups => Object.fromEntries(groups.flatMap(([value, keys]) => keys.map(key => [key, value])));

// Older components use literal colors as well as named tokens. Resolve both
// here, by their visual role, without changing any component's layout.
export const lightSurfaces = lookup([
  [coastalLight.background, ["FDFBF7", "F7F9FB", "F4F8FA"]],
  [coastalLight.surface, ["FFFFFF", "FCFEFF", "FAFCFD"]],
  [coastalLight.paper, ["F8FAFC", "FAFCFF", "F4F7FB", "F4F8FC", "F0F5FA", "F0F4F8", "EEF2F7", "F5F6F2", "EFEAE0", "E2EBF3", "E7E1D6", "EDF3F6", "F4FAFC", "EFEFEF", "F0F0F0"]],
  ["#DCECE2", ["DDEAF2", "EAF1FB", "EAF1F8", "F0F8FF", "EDF4F6", "F0F7FA"]],
  [coastalLight.tint, ["E3F1E8", "CFE3B8", "EDF7EE", "E8F5F0", "E8F8F4"]],
  ["#F7DDD2", ["FCE0D8", "FFF1EE", "FFF0F0", "FEF3F2", "FFF0E8", "FFF0EC"]],
  ["#F9E3C2", ["FBEBD2", "FFF8E1", "FFFBF0", "FFF8EB"]],
  ["#EDE3E8", ["F3EEF8", "F5F0FF"]],
  [coastalLight.primary, ["0B3C5D", "1A2E40", "183447"]],
  [coastalLight.deep, ["082C44"]],
  [coastalLight.brand, ["1A5CB0", "3B82F6"]],
  [coastalLight.accent, ["F16B4E", "F46B4E", "EF4444", "D32F2F"]],
  ["#397B68", ["2A7B4C", "22863A", "22C55E", "10B981", "087F5B"]],
  ["#916D2C", ["E8A33D", "F59E0B", "C89B3C", "C07000", "F2A63E"]],
  ["#806B86", ["7B5EA7", "6941C6", "A78BFA"]],
  ["#CCD5CC", ["D9D9D9", "D1DCE5", "CBD5E0", "B0C4D4", "AABDC8", "B8B8B8", "9E9E9E"]],
]);

export const lightForegrounds = lookup([
  [coastalLight.ink, ["0B3C5D", "082C44", "1E2A2F", "1A2E40", "183447"]],
  [coastalLight.muted, ["6B7876", "6B8CA8", "5A7A8C", "4A6880", "527084", "537185", "8DA3B1", "A8BECC", "8CA0AE", "D1DCE5", "CBD4DA"]],
  [coastalLight.secondaryOnPrimary, ["8FB0C2", "A9C4D4", "7BB8D4", "A8CCE0", "C8E1EE", "C9DAE3"]],
  [coastalLight.onPrimary, ["FFFFFF"]],
  [coastalLight.brand, ["1A5CB0", "3B82F6"]],
  ["#316B59", ["2A7B4C", "22863A", "22C55E", "10B981", "087F5B"]],
  [coastalLight.accent, ["F16B4E", "F46B4E", "EF4444", "D32F2F", "BA3928", "B44428"]],
  [coastalLight.button, ["FF9B85"]],
  ["#856321", ["E8A33D", "F59E0B", "C89B3C", "C07000", "92400E"]],
  ["#79627E", ["7B5EA7", "6941C6", "A78BFA"]],
]);

export const neutralBorders = new Set([
  "FFFFFF", "E7E1D6", "D9E7EE", "DCE9F0", "EEF3F5", "E2ECEF", "E2EBF3", "E8EFF6", "D1DCE5", "CBD5E0", "CBD4DA", "B0C4D4",
]);
