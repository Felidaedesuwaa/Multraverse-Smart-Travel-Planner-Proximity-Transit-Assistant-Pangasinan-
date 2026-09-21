import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { api } from "../lib/api";
import { useAppTheme } from "../theme/useAppTheme";
import { localLocationSuggestions, mergeLocationSuggestions } from "../utils/locationSuggestions";

export default function LocationAutocomplete({ value, onChange, disabled }) {
  const { themeStyle, themeColor } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState({ query: "", results: [], status: "idle" });
  const [active, setActive] = useState(-1);
  const input = useRef(null);
  const blurTimer = useRef(null);
  const query = value.trim();
  const local = useMemo(() => localLocationSuggestions(query), [query]);
  const current = search.query === query ? search : { results: [], status: "loading" };
  const results = mergeLocationSuggestions(local, current.results);
  const expanded = open && !disabled && query.length >= 3;

  useEffect(() => () => clearTimeout(blurTimer.current), []);
  useEffect(() => {
    if (!expanded) return;
    const controller = new AbortController();
    let cancelled = false;
    let timeout;
    setActive(-1);
    setSearch({ query, results: [], status: "loading" });
    const timer = setTimeout(async () => {
      timeout = setTimeout(() => controller.abort(), 7000);
      try {
        const data = await api.searchLocations(query, controller.signal);
        if (!Array.isArray(data.results)) throw new Error("Invalid search response");
        if (!cancelled) setSearch({ query, results: data.results, status: "ready" });
      } catch {
        if (!cancelled) setSearch({ query, results: [], status: "offline" });
      } finally { clearTimeout(timeout); }
    }, 450);
    return () => { cancelled = true; clearTimeout(timer); clearTimeout(timeout); controller.abort(); };
  }, [query, expanded]);

  const choose = place => {
    clearTimeout(blurTimer.current);
    onChange(place.label); setOpen(false); setActive(-1);
    input.current?.blur(); Keyboard.dismiss();
  };
  const onKeyPress = event => {
    if (Platform.OS !== "web" || !expanded) return;
    const key = event.nativeEvent.key;
    if (["ArrowDown", "ArrowUp"].includes(key) && results.length) {
      event.preventDefault();
      setActive(index => key === "ArrowDown" ? (index + 1) % results.length : (index <= 0 ? results.length - 1 : index - 1));
    } else if (key === "Enter" && results[active]) { event.preventDefault(); choose(results[active]); }
    else if (key === "Escape") { event.preventDefault(); setOpen(false); }
  };
  return <View style={styles.container}>
    <TextInput ref={input} accessibilityLabel="Profile location" accessibilityHint="Type at least three letters for location suggestions"
      {...(Platform.OS === "web" ? { role: "combobox", "aria-expanded": expanded, "aria-controls": expanded ? "profile-location-results" : undefined, "aria-autocomplete": "list", "aria-activedescendant": expanded && active >= 0 ? `location-option-${active}` : undefined } : {})}
      value={value} onChangeText={text => { onChange(text); setOpen(true); setActive(-1); }} editable={!disabled} maxLength={120}
      onFocus={() => { clearTimeout(blurTimer.current); setOpen(true); }} onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 180); }} onKeyPress={onKeyPress}
      autoCorrect={false} placeholder="Search city, town, or area" placeholderTextColor={themeColor("#6B7876")} style={themeStyle(styles.input)} />
    {expanded ? <View nativeID="profile-location-results" {...(Platform.OS === "web" ? { role: "listbox", "aria-label": "Location suggestions" } : {})} style={themeStyle(styles.suggestions)}>
      {results.map((place, index) => <Pressable key={place.id || place.label} nativeID={`location-option-${index}`}
        accessibilityRole={Platform.OS === "web" ? "option" : "button"} accessibilityLabel={`Use ${place.label}`} accessibilityState={{ selected: index === active }}
        onPress={() => choose(place)} style={themeStyle([styles.suggestion, index === active && styles.active])}>
        <MapPin size={16} color={themeColor("#6B7876")} /><Text style={themeStyle(styles.result)}>{place.label}</Text>
      </Pressable>)}
      <View style={styles.status}>
        {current.status === "loading" && <ActivityIndicator size="small" color={themeColor("#0B3C5D")} />}
        <Text accessibilityLiveRegion="polite" style={themeStyle(styles.hint)}>{current.status === "loading" ? "Searching places…" : current.status === "offline" ? "Online search unavailable. Choose a local match or type your location." : results.length ? "Select a suggestion or keep your own location." : "No matches. Try a city name or keep your own location."}</Text>
      </View>
      <Text style={themeStyle(styles.attribution)}>Search: Photon · <Text accessibilityRole="link" onPress={() => Linking.openURL("https://www.openstreetmap.org/copyright")} style={themeStyle(styles.link)}>© OpenStreetMap contributors</Text></Text>
    </View> : <Text style={themeStyle(styles.hint)}>Type at least 3 letters for suggestions, or enter your location.</Text>}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  input: { minHeight: 46, borderWidth: 1, borderColor: "#E7E1D6", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#1E2A2F", backgroundColor: "#FDFBF7" },
  suggestions: { borderWidth: 1, borderColor: "#E7E1D6", borderRadius: 8, overflow: "hidden", backgroundColor: "#FFFFFF" },
  suggestion: { minHeight: 44, padding: 10, gap: 8, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E7E1D6" },
  active: { backgroundColor: "#EDF4F6" },
  result: { flex: 1, fontSize: 13, lineHeight: 19, color: "#1E2A2F" },
  status: { padding: 10, gap: 8, flexDirection: "row", alignItems: "center" },
  hint: { flexShrink: 1, fontSize: 12, lineHeight: 18, color: "#6B7876" },
  attribution: { fontSize: 10, color: "#6B7876", paddingHorizontal: 10, paddingBottom: 8 },
  link: { textDecorationLine: "underline", color: "#0B3C5D" },
});
