import { useEffect, useRef, useState } from "react";
import { lguMunicipalities } from "../data/lguMunicipalities";
import { api } from "../lib/api";
import { itineraryErrors, itineraryErrorStep, itineraryFailureMessage } from "../lib/itineraryValidation";
import { User, Users, Home, Star, Globe, Clock, Activity, Zap, PiggyBank, Wallet, TrendingUp, Bus, Compass, Utensils, ShoppingBag } from "lucide-react-native";

export const TRIP_TYPES = [
  "Beach & Sea", "Nature", "Waterfalls", "Adventure", "Relaxing", "Pilgrimage",
  "History & Culture", "Food Trip", "Farm Experience", "Scenic / Photography",
  "Shopping & Pasalubong", "Festivals & Events",
];

export const ACTIVITIES = [
  "Swimming", "Boating", "Farm Visit",
  "Beach Relaxation", "Outdoor Exploration", "Photography", "Local Food",
  "Church / Pilgrimage", "Resort / Staycation",
];

export const TRAVELER_TYPES = [
  { id: "solo", label: "Solo", Icon: User },
  { id: "couple", label: "Couple", Icon: Users },
  { id: "family", label: "Family", Icon: Home },
  { id: "barkada", label: "Barkada", Icon: Star },
  { id: "group", label: "Group", Icon: Globe },
];

export const TRAVEL_STYLES = [
  { id: "relaxed", label: "Relaxed", desc: "Slow pace, lots of breaks", Icon: Clock },
  { id: "balanced", label: "Balanced", desc: "Mix of rest & activity", Icon: Activity },
  { id: "adventurous", label: "Adventurous", desc: "Full day, max experiences", Icon: Zap },
];

export const TRANSPORT_MODES = ["Bus", "Jeepney", "Tricycle", "Van", "Own Vehicle"];


export function hotelBudget(lodging, budget, days, rooms) {
  const rate = lodging?.lodgingDetails?.reference_rate;
  const nights = Math.max(0, Number(days) - 1);
  if (!nights) return { status: 'day-trip', nights, blocked: false };
  if (!rate || rate.period !== "night" || rate.min == null || rate.max == null || /flat rate|group basis|per.head|per.person/i.test(rate.basis)) return { status: "unknown", nights, blocked: false };
  const min = Number(rate.min) * nights * rooms;
  const max = Number(rate.max) * nights * rooms;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { status: "unknown", nights, blocked: false };
  const knownBasis = /^(per[ _-])?room\b/i.test(rate.basis || "");
  const status = min > Number(budget) ? "over" : max > Number(budget) ? "possible" : "within";
  return { min, max, nights, status, knownBasis, blocked: status === "over" && knownBasis };
}


export const todayInManila = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
export const BUDGET_PACKAGES = [
  { id: "economy", min: 200, max: 500, rate: 500, label: "Economy", Icon: PiggyBank, color: "#246B73" },
  { id: "budget", min: 500, max: 1000, rate: 1000, label: "Budget", Icon: Wallet, color: "#2A7B4C" },
  { id: "standard", min: 1000, max: 2000, rate: 2000, label: "Standard", Icon: Star, color: "#0B3C5D" },
  { id: "comfortable", min: 2000, max: 4000, rate: 4000, label: "Comfortable", Icon: TrendingUp, color: "#946516" },
  { id: "premium", min: 4000, max: null, rate: 4000, label: "Premium", Icon: Zap, color: "#B7472B" },
];
export const initialForm = () => ({
  areaId: "",
  tripTypes: [],
  activities: [],
  travelerType: "",
  travelStyle: "",
  date: todayInManila(),
  travelers: 2,
  budget: "",
  days: 1,
  lodgingId: "",
  startTime: "07:00",
  mealBudget: "300",
  fareInputs: [],
  transportModes: [],
  preferences: [],
  returnToOrigin: true,
});


// Both renderers use the same catalog, validation, budget rules and API requests.
export function useItineraryPlanner({ navigation, onInvalid }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [budgetTier, setBudgetTier] = useState("");
  const [hotelRooms, setHotelRooms] = useState(1);
  const selectedBudget = BUDGET_PACKAGES.find((tier) => tier.id === budgetTier);
  const budgetRate = selectedBudget?.rate || 0;
  const [today, setToday] = useState(todayInManila);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [phase, setPhase] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [plan, setPlan] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef(null);
  const generationRef = useRef(false);
  const [catalog, setCatalog] = useState([]);
  const [fareTables, setFareTables] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const AREAS = lguMunicipalities.map(area => ({
    famousPlaces: [], foods: [], entries: [], lodging: [],
    ...catalog.find(entry => entry.id === area.id),
    id: area.id,
    name: area.name,
    group: area.kind === "City" ? "Cities" : "Municipalities",
  })).sort((a, b) => a.name.localeCompare(b.name, "en"));
  useEffect(() => {
    const controller = new AbortController();
    api.getItineraryCatalog({ signal: controller.signal })
      .then(data => { setCatalog(data.areas); setFareTables(data.fareTables || []); })
      .catch(err => { if (!controller.signal.aborted) setError(itineraryFailureMessage(err, "Unable to load destinations. Please try again.")); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setToday(todayInManila()), 30000);
    return () => clearInterval(timer);
  }, []);

  const set = (key, value) => {
    setNotice("");
    setFieldErrors(current => { const next = { ...current }; delete next[key]; return next; });
    setForm((f) => {
      const next = { ...f, [key]: value, ...(key === "areaId" ? { lodgingId: "" } : {}) };
      if (key === 'areaId') next.fareInputs = [];
      if (key === 'transportModes') next.fareInputs = value.map(mode => f.fareInputs.find(item => item.mode === mode) || { mode, rides: 2, tableId: fareTables.find(t => t.mode === mode && (mode !== 'Tricycle' || f.areaId === 'dagupan'))?.id });
      if (key === "travelerType" && ["solo", "couple"].includes(value)) next.travelers = value === "solo" ? 1 : 2;
      if (budgetTier && ["travelers", "days", "travelerType"].includes(key)) {
        next.budget = String(budgetRate * Math.max(1, Number(next.travelers) || 1) * next.days);
      }
      return next;
    });
  };
  const chooseBudget = ({ id, rate }) => {
    setNotice("");
    setFieldErrors(current => { const next = { ...current }; delete next.budget; return next; });
    setBudgetTier(id);
    setForm((f) => ({ ...f, budget: String(rate * Math.max(1, Number(f.travelers) || 1) * f.days) }));
  };
  const dateError = fieldErrors.date;
  const validateStep = (targetStep) => {
    const errors = itineraryErrors(form, { catalog, hotelRooms, budgetTier, today: todayInManila(), step: targetStep, fareTables });
    if (targetStep >= 2 && stayBudget?.blocked) errors.lodgingId = 'This hotel costs more than your trip budget. Choose a cheaper hotel, increase your budget, or select no lodging.';
    setFieldErrors(errors);
    setAttemptedNext(true);
    if (Object.keys(errors).length) {
      setError('Please check the highlighted fields before continuing.');
      setStep(itineraryErrorStep(Object.keys(errors)[0]));
      setShowAdvanced(true);
      onInvalid?.();
      return false;
    }
    setError('');
    setFieldErrors({});
    return true;
  };
  const area = AREAS.find((a) => a.id === form.areaId);
  const info = area;
  const lodgingList = area?.lodging || [];
  const lodging = lodgingList.find((l) => l.id === form.lodgingId);
  const mealPerPerson = Number(form.mealBudget) * Number(form.days);
  const mealTotal = mealPerPerson * Number(form.travelers);
  const mealRemaining = Number(form.budget) - mealTotal;
  const stayBudget = lodging ? hotelBudget(lodging, form.budget, form.days, hotelRooms) : null;
  const higherBudget = stayBudget?.max != null ? BUDGET_PACKAGES.find((tier) => tier.rate * form.travelers * form.days >= stayBudget.max && tier.rate > budgetRate) : null;

  useEffect(() => {
    if (!phase) return;
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const stepLabel = { 1: "Destination & preferences", 2: "Trip details & lodging", 3: "Review & personalize" }[step];

  const goNext = () => {
    if (!validateStep(step)) return;
    setNotice(`Step ${step} completed successfully.`);
    setAttemptedNext(false);
    setStep((s) => Math.min(3, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const generate = async () => {
    if (generationRef.current) return;
    if (!validateStep(3)) return;
    setNotice("");
    generationRef.current = true;
    setError("");
    setPhase("Planning from your area's catalog");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const built = await api.generateGroundedItinerary({ ...form, travelers: Number(form.travelers), days: Number(form.days), budget: Number(form.budget), mealBudget: Number(form.mealBudget), hotelRooms: form.lodgingId ? Number(hotelRooms) : 1 }, { signal: controller.signal });
      const icons = { Bus, Compass, Utensils, Home, ShoppingBag };
      setPlan({ ...built, stops: built.stops.map(stop => ({ ...stop, Icon: icons[stop.iconKey] || Compass })) });
      setShowForm(false);
      setSaved(false);
      setNotice("Your itinerary was created successfully. You can save or export it.");
    } catch (err) {
      setError(controller.signal.aborted ? "Generation timed out. Please try again." : itineraryFailureMessage(err, "Unable to generate your itinerary. Please try again."));
    } finally {
      clearTimeout(timeout);
      setPhase("");
      generationRef.current = false;
    }
  };
  const savePlan = async () => {
    if (saving || !plan?.id) return;
    setSaving(true);
    setError("");
    try {
      await api.saveItinerary(plan.id, true);
      setSaved(true);
      navigation.navigate("MyTrips", { successMessage: 'Itinerary Plan has successfully saved to "My Trips"' });
    } catch (err) { setError(itineraryFailureMessage(err, "Your plan could not be saved. Please try again.")); }
    finally { setSaving(false); }
  };


  return {
    step, form, budgetTier, hotelRooms, setHotelRooms, selectedBudget, today, setToday,
    showAdvanced, setShowAdvanced, attemptedNext, phase, elapsed, plan, showForm, setShowForm,
    saved, catalog, fareTables, error, notice, fieldErrors, saving, AREAS, set, chooseBudget,
    dateError, area, info, lodgingList, lodging, mealPerPerson, mealTotal, mealRemaining,
    stayBudget, higherBudget, stepLabel, goNext, goBack, generate, savePlan,
  };
}
