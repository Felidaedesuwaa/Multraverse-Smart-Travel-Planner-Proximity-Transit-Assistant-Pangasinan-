import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, ScrollView, Share, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { BookmarkPlus, Download, RefreshCw, Sparkles, X } from "lucide-react-native";
import { api } from "../lib/api";
import { storage } from "../lib/storage";
import { useAuthStore } from "../store/authStore";
import { useAppTheme } from "../theme/useAppTheme";
import { useCurrency } from "../hooks/useCurrency";
import { colors } from "../theme/colors";
import ItineraryResult from "../components/ItineraryResult";
import DestinationPicker from "../components/planner/DestinationPicker";
import { PlannerButton as Button, PlannerField as Field, plannerStyles as s } from "../components/planner/PlannerUI";
import AIToolHeader from "../components/AIToolHeader";

const preferences = ["Budget-friendly", "Island hopping", "Cultural sites", "Food stops", "Photography spots", "Accessible routes"];
const transportModes = ["bus", "jeepney", "tricycle", "van", "own-vehicle"];
// The server replaces this with the user's saved Settings location. Keeping a
// valid fallback makes planning work during a server restart or with an older
// server process that still requires an origin in the request.
const initialForm = () => ({ origin: { areaId: "dagupan" }, destinations: [], dates: { start: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10) }, startTime: "08:00", days: 1, budget: "3000", travelers: 1, preferences: ["Food stops"], transportModes: ["bus", "jeepney", "tricycle"], pace: "balanced", lodging: { preference: "none", nightlyBudget: "1000", rooms: 1 }, foodPerPersonPerDay: "300", useSavedPlaces: true, returnToOrigin: true, excludedPlaceIds: [] });
const toggleValue = (values, value) => values.includes(value) ? values.filter(v => v !== value) : [...values, value];

export default function AIItinerary() {
  const { themeStyle, themeColor } = useAppTheme(), { currency } = useCurrency();
  const navigation = useNavigation(), route = useRoute(), userId = useAuthStore(state => state.user?.id);
  const [form, setForm] = useState(initialForm), [catalog, setCatalog] = useState(null);
  const [showForm, setShowForm] = useState(true), [advanced, setAdvanced] = useState(false), [step, setStep] = useState(1), [mapSelection, setMapSelection] = useState(null);
  const scroll = useRef(null);
  const [catalogLoading, setCatalogLoading] = useState(true), [offline, setOffline] = useState(false);
  const [plan, setPlan] = useState(null), [cachedPlan, setCachedPlan] = useState(null);
  const [phase, setPhase] = useState(""), [elapsed, setElapsed] = useState(0), [error, setError] = useState("");
  const [saving, setSaving] = useState(false), [saved, setSaved] = useState(false), [acceptIncomplete, setAcceptIncomplete] = useState(false);
  const [editing, setEditing] = useState(null), [attempt, setAttempt] = useState(0);
  const active = useRef(null), epoch = useRef(0), busy = useRef(false);
  const cacheKey = `planner:v1:${userId}`;
  const areas = catalog?.areas || [], places = catalog?.places || areas.flatMap(area => area.attractions || []);
  const destinationPlaces = useMemo(() => form.destinations.flatMap(destination => destination.placeIds.map(id => places.find(place => place.id === id)).filter(Boolean)), [form.destinations, places]);
  const selectedAreaIds = useMemo(() => [...new Set(destinationPlaces.map(place => place.areaId))], [destinationPlaces]);
  const featuredPlaces = useMemo(() => places.filter(place => selectedAreaIds.includes(place.areaId) && !destinationPlaces.some(selected => selected.id === place.id)).slice(0, 6), [places, selectedAreaIds, destinationPlaces]);
  const destinationNames = useMemo(() => destinationPlaces.map(place => [place.municipality, place.location, areas.find(area => area.id === place.areaId)?.name].filter(Boolean).join(" ")).join(" ").toLowerCase(), [destinationPlaces, areas]);
  const relatedFares = useMemo(() => (catalog?.fares || []).filter(fare => `${fare.from || ""} ${fare.to || ""}`.toLowerCase().split(" ").some(word => word.length > 3 && destinationNames.includes(word))).slice(0, 5), [catalog, destinationNames]);
  const relatedFoods = useMemo(() => (catalog?.foods || []).filter(food => !food.where || `${food.where}`.toLowerCase().split(" ").some(word => word.length > 3 && destinationNames.includes(word))).slice(0, 5), [catalog, destinationNames]);
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const body = themeStyle(s.body), heading = themeStyle(s.heading);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
    setCatalogLoading(true); setError("");
    api.getPlannerCatalog({ signal: controller.signal }).then(async data => {
      if (!alive) return;
      setCatalog(data); setOffline(false);
      await storage.setItem(`${cacheKey}:catalog`, JSON.stringify(data)).catch(() => {});
    }).catch(async () => {
      const cached = await storage.getItem(`${cacheKey}:catalog`).catch(() => null);
      if (!alive) return;
      try { if (cached) setCatalog(JSON.parse(cached)); } catch { /* Ignore damaged cache. */ }
      setOffline(true); setError("Catalog unavailable. Cached plans remain viewable; reconnect to generate or save.");
    }).finally(() => { clearTimeout(timeout); if (alive) setCatalogLoading(false); });
    storage.getItem(`${cacheKey}:plan`).then(value => { if (alive && value) { try { setCachedPlan(JSON.parse(value)); } catch { /* Ignore damaged cache. */ } } }).catch(() => {});
    return () => { alive = false; clearTimeout(timeout); controller.abort(); };
  }, [cacheKey, attempt]);
  useEffect(() => () => { epoch.current++; active.current?.abort(); }, []);
  useEffect(() => {
    if (!catalog || !route.params?.areaId) return;
    const areaPlaces = places.filter(place => place.areaId === route.params.areaId);
    if (!areaPlaces.length) return;
    const chosen = areaPlaces[0];
    setForm(current => current.destinations.some(destination => destination.placeIds.includes(chosen.id)) ? current : { ...current, destinations: [...current.destinations, { areaId: chosen.areaId, placeIds: [chosen.id] }] });
    setMapSelection(route.params.placeName || areas.find(area => area.id === chosen.areaId)?.name || chosen.name);
    setStep(1); setShowForm(true);
  }, [catalog, route.params?.areaId]);
  useEffect(() => { if (!phase) return; setElapsed(0); const timer = setInterval(() => setElapsed(n => n + 1), 1000); return () => clearInterval(timer); }, [phase]);
  const remember = async result => { setPlan(result); setCachedPlan(result); await storage.setItem(`${cacheKey}:plan`, JSON.stringify(result)).catch(() => {}); };

  const enrich = async (result, version) => {
    const controller = new AbortController(); active.current = controller;
    const timeout = setTimeout(() => controller.abort(), 28000);
    setPhase("Adding travel tips");
    try {
      const enriched = await api.enrichItinerary(result.id, { signal: controller.signal });
      if (version === epoch.current) await remember(enriched);
    } catch { if (version === epoch.current) setError("Local descriptions unavailable. Your database plan is still ready to use."); }
    finally { clearTimeout(timeout); }
  };
  const generate = async (input = form) => {
    if (busy.current) return;
    if (!input.destinations.some(d => d.placeIds.length) || !Number(input.budget)) { setError("Select a place to visit and enter your trip budget."); return; }
    const request = { ...input, origin: input.origin?.areaId ? input.origin : { areaId: "dagupan" }, budget: Number(input.budget), foodPerPersonPerDay: Number(input.foodPerPersonPerDay), lodging: { ...input.lodging, nightlyBudget: Number(input.lodging.nightlyBudget) } };
    const version = ++epoch.current, controller = new AbortController(); active.current = controller; busy.current = true;
    const timeout = setTimeout(() => controller.abort(), 20000);
    setPhase("Planning your trip"); setError(""); setSaved(false); setAcceptIncomplete(false);
    try {
      const result = await api.generateItinerary(request, { signal: controller.signal });
      clearTimeout(timeout);
      if (version !== epoch.current) return;
      await remember(result);
      setShowForm(false); scroll.current?.scrollTo({ y: 0, animated: true });
      if (version === epoch.current && result.days.some(day => day.stops.length)) await enrich(result, version);
    } catch (cause) { if (version === epoch.current) setError(controller.signal.aborted ? "Planning timed out. Check the backend connection and retry. Your previous preview is preserved." : cause.message); }
    finally { clearTimeout(timeout); if (version === epoch.current) { setPhase(""); busy.current = false; } }
  };
  const save = async () => {
    setSaving(true); setError("");
    try { await api.saveItinerary(plan.id, acceptIncomplete); setSaved(true); }
    catch (cause) { setError(cause.message); } finally { setSaving(false); }
  };
  const share = async () => {
    try {
      const content = JSON.stringify(plan, null, 2);
      if (Platform.OS === "web") {
        const href = URL.createObjectURL(new Blob([content], { type: "application/json" }));
        const anchor = document.createElement("a"); anchor.href = href; anchor.download = `multraverse-${plan.request.dates.start}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(href), 1000);
      } else await Share.share({ title: "Multraverse itinerary", message: content });
    } catch { setError("Could not share this itinerary. Try again."); }
  };
  const applyEdit = replacement => {
    const original = plan.request;
    const areaStops = plan.days.flatMap(d => d.stops).filter(stop => stop.areaId === editing.areaId).map(stop => stop.placeId);
    const edited = { ...original, excludedPlaceIds: [...new Set([...original.excludedPlaceIds.filter(id => id !== replacement), editing.placeId])], destinations: original.destinations.map(d => d.areaId === editing.areaId ? { ...d, placeIds: [...areaStops.filter(id => id !== editing.placeId), ...(replacement ? [replacement] : [])] } : d) };
    if (!replacement && areaStops.length === 1) edited.destinations = edited.destinations.filter(d => d.areaId !== editing.areaId);
    if (!edited.destinations.length) { setError("Keep at least one destination. Replace the last stop instead of removing it."); setEditing(null); return; }
    setForm(edited); setEditing(null); generate(edited);
  };
  const guide = destinationPlaces.length ? <View style={themeStyle({ ...s.card, gap: 12, backgroundColor: colors.warmSand })}>
    <Text style={heading}>{mapSelection ? `${mapSelection} trip guide` : "Before you generate"}</Text>
    <Text style={body}>Your selected place{destinationPlaces.length > 1 ? "s" : ""}: {destinationPlaces.map(place => place.name).join(", ")}.</Text>
    {!!featuredPlaces.length && <View style={{ gap: 6 }}><Text style={themeStyle({ ...s.body, fontWeight: "700" })}>Famous places nearby</Text><Text style={body}>{featuredPlaces.map(place => place.name).join(" · ")}</Text></View>}
    {!!relatedFares.length && <View style={{ gap: 6 }}><Text style={themeStyle({ ...s.body, fontWeight: "700" })}>Known fares</Text>{relatedFares.map(fare => <Text key={fare.id} style={body}>{fare.from} → {fare.to}: {fare.vehicle || "transport"} {fare.price ? `· ₱${fare.price}` : "· check current fare"}</Text>)}</View>}
    {!!relatedFoods.length && <View style={{ gap: 6 }}><Text style={themeStyle({ ...s.body, fontWeight: "700" })}>Foods to try</Text><Text style={body}>{relatedFoods.map(food => food.name).join(" · ")}</Text></View>}
    {!featuredPlaces.length && !relatedFares.length && !relatedFoods.length && <Text style={body}>The generator will use the current verified places, transport, and food records for your selections.</Text>}
  </View> : null;
  return <ScrollView ref={scroll} contentContainerStyle={themeStyle(s.page)}>
    <AIToolHeader eyebrow="PANGASINAN TRIP PLANNER" title="AI Itinerary" subtitle="Build a practical trip plan using verified places, transport fares, and local food guides." badges={[{ label: "Verified local data" }, { label: "Budget-aware planning" }, { label: "Custom AI model", color: "#A78BFA" }]} Icon={Sparkles} />
    {showForm && <View style={themeStyle(s.card)}>
      <Text style={heading}>Plan step {step} of 3</Text><View style={{ flexDirection: "row", gap: 6 }}>{[1, 2, 3].map(number => <View key={number} style={{ height: 6, flex: 1, borderRadius: 8, backgroundColor: number <= step ? colors.sunsetCoral : colors.border }} />)}</View>
      {step === 1 && <><Text style={heading}>Choose your places</Text>{catalogLoading ? <ActivityIndicator accessibilityLabel="Loading places" color={themeColor(colors.oceanBlue)} /> : <DestinationPicker places={places} form={form} setForm={setForm} />}<Button selected disabled={!destinationPlaces.length || catalogLoading} onPress={() => setStep(2)}>Next: trip details</Button></>}
      {step === 2 && <><Text style={heading}>Trip details</Text><View style={s.row}><Field label="Travel date (YYYY-MM-DD)" value={form.dates.start} onChange={start => set("dates", { start })} /><Field label="Travelers" value={form.travelers} numeric onChange={value => set("travelers", Number(value))} /><Field label={`Total trip budget (${currency})`} value={form.budget} money onChange={value => set("budget", value)} /></View><Text style={body}>How many days?</Text><View style={s.row}>{[1, 2, 3, 4, 5, 6, 7].map(n => <Button key={n} selected={form.days === n} onPress={() => set("days", n)}>{n} day{n === 1 ? "" : "s"}</Button>)}</View><View style={s.row}><Button onPress={() => setStep(1)}>Back</Button><Button selected disabled={!Number(form.budget)} onPress={() => setStep(3)}>Next: review trip</Button></View></>}
      {step === 3 && <><Text style={heading}>Review and personalize</Text>{guide}<Button onPress={() => setAdvanced(value => !value)}>{advanced ? "Hide extra options" : "Adjust time, transport and meal budget"}</Button>{advanced && <View style={{ gap: 14 }}><View style={s.row}><Field label="Start time (HH:mm)" value={form.startTime} onChange={value => set("startTime", value)} /><Field label={`Meals per person per day (${currency})`} value={form.foodPerPersonPerDay} money onChange={value => set("foodPerPersonPerDay", value)} /></View><Text style={body}>Transport</Text><View style={s.row}>{transportModes.map(mode => <Button key={mode} selected={form.transportModes.includes(mode)} onPress={() => set("transportModes", toggleValue(form.transportModes, mode))}>{mode === "own-vehicle" ? "Own vehicle" : mode}</Button>)}</View><Text style={body}>Travel pace</Text><View style={s.row}>{["relaxed", "balanced", "packed"].map(pace => <Button key={pace} selected={form.pace === pace} onPress={() => set("pace", pace)}>{pace}</Button>)}</View><View style={s.row}><Button selected={form.returnToOrigin} onPress={() => set("returnToOrigin", !form.returnToOrigin)}>Include return trip</Button>{preferences.filter(p => p !== "Food stops").map(pref => <Button key={pref} selected={form.preferences.includes(pref)} onPress={() => set("preferences", toggleValue(form.preferences, pref))}>{pref}</Button>)}</View></View>}{form.days > 1 && <View style={{ gap: 10 }}><Text style={body}>Overnight stay</Text><View style={s.row}>{["none", "budget"].map(p => <Button key={p} selected={form.lodging.preference === p} onPress={() => set("lodging", { ...form.lodging, preference: p })}>{p === "none" ? "Already arranged" : "Include lodging allowance"}</Button>)}</View>{form.lodging.preference !== "none" && <View style={s.row}><Field label={`Room budget per night (${currency})`} value={form.lodging.nightlyBudget} money onChange={value => set("lodging", { ...form.lodging, nightlyBudget: value })} /><Field label="Rooms" value={form.lodging.rooms} numeric onChange={value => set("lodging", { ...form.lodging, rooms: Number(value) })} /></View>}</View>}<View style={s.row}><Button onPress={() => setStep(2)}>Back</Button><Button selected icon={RefreshCw} disabled={!!phase || saving || offline || catalogLoading} onPress={() => generate()}>Generate my itinerary</Button></View></>}
      {plan && <Button onPress={() => setShowForm(false)}>Back to my trip plan</Button>}
    </View>}
    {!!phase && <View style={themeStyle(s.card)}><ActivityIndicator color={themeColor(colors.oceanBlue)} /><Text accessibilityLiveRegion="polite" style={body}>{phase} ? {elapsed}s{plan && !showForm ? ". Your trip plan is ready below." : ""}</Text><Button onPress={() => { epoch.current++; active.current?.abort(); busy.current = false; setPhase(""); }}>{plan && !showForm ? "Use this plan now" : "Cancel"}</Button></View>}
    {!!error && <View style={themeStyle(s.card)}><Text accessibilityRole="alert" style={themeStyle({ ...s.body, color: colors.sunsetCoral })}>{error}</Text>{offline && <Button onPress={() => setAttempt(n => n + 1)}>Retry connection</Button>}</View>}
    {!plan && cachedPlan && <Button onPress={() => { setPlan(cachedPlan); setForm(cachedPlan.request); setShowForm(false); setSaved(false); setAcceptIncomplete(false); }}>Open my last trip plan</Button>}
    {!showForm && plan && <View style={themeStyle(s.card)}>
      <View style={s.row}><Button onPress={() => setShowForm(true)}>Edit trip details</Button><Button icon={Download} onPress={share}>Export / Share</Button></View>
      <ItineraryResult plan={plan} onEditStop={setEditing} disabled={!!phase || offline || saving} />
      {plan.mode !== "hybrid" && <Text style={body}>Built from the travel guide. AI tips are optional; your trip plan is ready without them.</Text>}
      {plan.costs.status === "incomplete" && <Button selected={acceptIncomplete} onPress={() => setAcceptIncomplete(value => !value)}>I?ll confirm the remaining fares before traveling</Button>}
      <View style={s.row}><Button selected icon={BookmarkPlus} disabled={saved || saving || !!phase || offline || !plan.days.some(d => d.stops.length) || plan.costs.status === "over-budget" || (plan.costs.status === "incomplete" && !acceptIncomplete)} onPress={save}>{saved ? "Saved to My Trips" : saving ? "Saving..." : "Save to My Trips"}</Button><Button onPress={() => navigation.navigate("MyTrips")}>My Trips</Button><Button onPress={() => navigation.navigate("Budget")}>Budget</Button></View>
      {saved && <Text accessibilityLiveRegion="polite" style={body}>Your trip and stops are saved. Add actual purchases in Budget as you travel.</Text>}
    </View>}
    {editing && <Modal transparent animationType="fade" onRequestClose={() => setEditing(null)}><View style={themeStyle({ flex: 1, padding: 24, justifyContent: "center", backgroundColor: colors.oceanBlueDark })}><View style={themeStyle({ ...s.card, maxHeight: "85%" })}><Text style={heading}>Edit {editing.place}</Text><Text style={body}>Replace this stop with an attraction in the same area. Times and costs will be recalculated.</Text><ScrollView contentContainerStyle={{ gap: 8 }}>{areas.find(a => a.id === editing.areaId)?.attractions.filter(p => !plan.days.some(d => d.stops.some(stop => stop.placeId === p.id))).map(p => <Button key={p.id} onPress={() => applyEdit(p.id)}>Replace with {p.name}</Button>)}</ScrollView><View style={s.row}><Button onPress={() => applyEdit(null)}>Remove stop and replan</Button><Button icon={X} onPress={() => setEditing(null)}>Cancel edit</Button></View></View></View></Modal>}
  </ScrollView>;
}
