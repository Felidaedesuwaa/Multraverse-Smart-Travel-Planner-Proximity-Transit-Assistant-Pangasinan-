import { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Check, Search, X } from "lucide-react-native";
import { useAppTheme } from "../../theme/useAppTheme";
import { colors } from "../../theme/colors";
import { PlannerButton as Button, plannerStyles as s } from "./PlannerUI";

export default function DestinationPicker({ places, form, setForm }) {
  const { themeStyle, themeColor } = useAppTheme();
  const [query, setQuery] = useState("");
  const selected = form.destinations.flatMap(destination => destination.placeIds);
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return places.filter(place => place.saved).slice(0, 8);
    return places.filter(place => [place.name, place.location, place.municipality, place.category].filter(Boolean).join(" ").toLowerCase().includes(term)).slice(0, 18);
  }, [places, query]);
  const toggle = (place) => setForm(current => {
    const existing = current.destinations.find(destination => destination.areaId === place.areaId);
    const placeIds = existing?.placeIds.includes(place.id) ? existing.placeIds.filter(id => id !== place.id) : [...(existing?.placeIds || []), place.id];
    const destinations = existing ? current.destinations.map(destination => destination.areaId === place.areaId ? { ...destination, placeIds } : destination) : [...current.destinations, { areaId: place.areaId, placeIds }];
    return { ...current, destinations: destinations.filter(destination => destination.placeIds.length), excludedPlaceIds: current.excludedPlaceIds.filter(id => id !== place.id) };
  });
  return <View style={{ gap: 12 }}>
    <Text style={themeStyle(s.body)}>Search for the attraction you want to include. You can choose more than one.</Text>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}><Search size={18} color={themeColor(colors.textMuted)} /><TextInput accessibilityLabel="Search Pangasinan attractions" placeholder="Search a place in Pangasinan" value={query} onChangeText={setQuery} style={themeStyle({ ...s.input, flex: 1 })} placeholderTextColor={themeColor(colors.textMuted)} /></View>
    {!query.trim() && !matches.length && <Text style={themeStyle({ ...s.body, color: colors.textMuted })}>Start typing to find a verified attraction.</Text>}
    {!!matches.length && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{matches.map(place => <Button key={place.id} icon={selected.includes(place.id) ? Check : undefined} selected={selected.includes(place.id)} onPress={() => toggle(place)}>{place.name}{place.municipality ? ` · ${place.municipality}` : ""}</Button>)}</View>}
    {!!query.trim() && !matches.length && <Text style={themeStyle(s.body)}>No verified attraction matches that search yet. Try a nearby landmark or municipality name.</Text>}
    {!!selected.length && <View style={{ gap: 8, paddingTop: 4 }}><Text style={themeStyle(s.body)}>{selected.length} place{selected.length === 1 ? "" : "s"} selected</Text><View style={s.row}>{form.destinations.flatMap(destination => destination.placeIds.map(id => { const place = places.find(item => item.id === id); return <Button key={id} icon={X} onPress={() => place && toggle(place)}>{place?.name || "Selected place"}</Button> }))}</View></View>}
  </View>;
}
