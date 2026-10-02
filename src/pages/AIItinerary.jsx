import { useEffect, useRef, useState } from "react";
import { useAppTheme } from "../theme/useAppTheme";
import { darkPalette } from "../theme/darkPalette";
import { Image as NativeImage, useWindowDimensions } from "react-native";
import AIToolHeader from "../components/AIToolHeader";
import { api } from "../lib/api";
import { dagupanPhotos } from "../lib/dagupanPhotos";
import { alaminosPhotos } from "../lib/alaminosPhotos";
import { sanCarlosPhotos } from "../lib/sanCarlosPhotos";
import { urdanetaPhotos } from "../lib/urdanetaPhotos";
import ItineraryResults from "../components/ItineraryResults";
import ItineraryFareInputs from "../components/ItineraryFareInputs";
import {
  Home,
  Sparkles, ChevronDown, ChevronRight, Check,
  Clock, Activity, Zap, User, Users, Star, Globe, Bus, Wifi, Wind, Waves,
  Eye, BedDouble, Utensils, Compass, ShoppingBag,
  MapPin, Phone, Info, Building2, Receipt, LogIn, LogOut, Wallet, TrendingUp, PiggyBank,
} from "lucide-react-native";

/* ------------------------------------------------------------------ */
/*  Typography uses the same Expo font aliases as the app shell.      */
/* ------------------------------------------------------------------ */
const fonts = {
  display: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  body: 'DMSans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

/* ------------------------------------------------------------------ */
/*  Static reference data (would come from the catalog API)            */
/* ------------------------------------------------------------------ */

const TRIP_TYPES = [
  "Beach & Sea", "Nature", "Waterfalls", "Adventure", "Relaxing", "Pilgrimage",
  "History & Culture", "Food Trip", "Farm Experience", "Scenic / Photography",
  "Family Trip", "Couple Trip", "Barkada Trip", "Shopping & Pasalubong", "Festivals & Events",
];

const ACTIVITIES = [
  "Swimming", "Boating", "Kayaking", "Bamboo / Craft Experience", "Farm Visit",
  "Beach Relaxation", "Outdoor Exploration", "Photography", "Local Food",
  "Church / Pilgrimage", "Resort / Staycation",
];

const TRAVELER_TYPES = [
  { id: "solo", label: "Solo", Icon: User },
  { id: "couple", label: "Couple", Icon: Users },
  { id: "family", label: "Family", Icon: Home },
  { id: "barkada", label: "Barkada", Icon: Star },
  { id: "group", label: "Group", Icon: Globe },
];

const TRAVEL_STYLES = [
  { id: "relaxed", label: "Relaxed", desc: "Slow pace, lots of breaks", Icon: Clock },
  { id: "balanced", label: "Balanced", desc: "Mix of rest & activity", Icon: Activity },
  { id: "adventurous", label: "Adventurous", desc: "Full day, max experiences", Icon: Zap },
];

const TRANSPORT_MODES = ["Bus", "Jeepney", "Tricycle", "Van", "Own Vehicle"];

const AMENITY_ICON = { "Wi-Fi": Wifi, "A/C": Wind, "Restaurant": Utensils, "Pool": Waves, "Sea View": Eye, "Fan room": BedDouble };

const toggleValue = (values, value) => values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
const peso = (n) => `₱${Number(n).toLocaleString()}`;

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */
function DestinationCard({ name, photo, Icon }) {
  const [failed, setFailed] = useState(false);
  return <article className="aip-discovery-card">
    <div className="aip-discovery-image">
      {photo && !failed ? <NativeImage source={photo.asset} accessibilityLabel={photo.alt} resizeMode="cover" style={{ width: "100%", height: "100%" }} onError={() => setFailed(true)} /> : <div className="aip-photo-placeholder"><Icon size={28} /><span>{failed ? "Photo unavailable" : "Photo coming soon"}</span></div>}
    </div>
    <div className="aip-discovery-caption"><Icon size={16} /><h4>{name}</h4></div>
  </article>;
}

const destinationPhotoGuides = {
  dagupan: { photos: dagupanPhotos, filePrefix: 'Dagupan' },
  alaminos: { photos: alaminosPhotos, filePrefix: 'Alaminos' },
  'san-carlos': { photos: sanCarlosPhotos, filePrefix: 'San_Carlos' },
  urdaneta: { photos: urdanetaPhotos, filePrefix: 'Urdaneta' },
};

function DestinationGallery({ title, names, Icon, photos }) {
  const illustrated = names.filter((name) => photos[name]);
  const remaining = names.filter((name) => !photos[name]);
  return <section className="aip-discovery-section">
    <h3 className="aip-heading-sm">{title}</h3>
    <div className="aip-discovery-grid">{illustrated.map((name) => <DestinationCard key={name} name={name} Icon={Icon} photo={photos[name]} />)}</div>
    {remaining.length > 0 && <details className="aip-more-discoveries"><summary>More to explore ({remaining.length})</summary><p>Photos are not yet verified for these entries.</p><div className="aip-chip-row">{remaining.map((name) => <span key={name} className="aip-summary-chip">{name}</span>)}</div></details>}
  </section>;
}

function hotelBudget(lodging, budget, days, rooms) {
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

function LodgingCard({ lodging: l, selected, onSelect, comparison }) {
  const d = l.lodgingDetails;
  const rate = d?.reference_rate;
  const unavailable = d?.overnight_supported === false;
  const facts = d ? [
    [BedDouble, "Room types", d.room_types],
    [Users, "Capacity", d.capacity_note],
    [Building2, "Facilities", d.amenities_description],
    [Receipt, "Additional fees", d.additional_fees],
    [Info, "Rate details", d.rate_note],
    [Bus, "Getting there", d.transport_access],
    [MapPin, "Nearby", d.nearby_attractions],
    [Phone, "Contact", d.contact],
    [Globe, "Booking", d.booking_url],
  ].filter(([, , value]) => value) : [];

  return (
    <article className={`aip-stay-card ${selected ? "is-selected" : ""}`}>
      <button type="button" className="aip-stay-select" disabled={unavailable} aria-pressed={selected} aria-label={`Select ${l.name}`} onClick={onSelect}>
        <span className="aip-stay-icon"><Building2 size={22} /></span>
        <span className="aip-stay-title"><strong>{l.name}</strong>{l.tier && <span className="aip-stay-tier"><Star size={12} />{l.tier}</span>}</span>
        <span className={`aip-stay-radio ${selected ? "is-selected" : ""}`} aria-hidden="true">{selected && <Check size={14} color="#fff" />}</span>
      </button>
      <div className="aip-stay-body">
        {d?.address && <div className="aip-stay-location"><MapPin size={15} /><span>{d.address}</span></div>}
        <div className="aip-stay-amenities">
          {(l.amenities || []).map((a) => { const Icon = AMENITY_ICON[a] || Check; return <span key={a} className="aip-stay-amenity"><Icon size={16} /><span>{a}</span></span>; })}
        </div>
        <div className="aip-stay-bottom">
          <div className="aip-stay-rate">
            <strong>{rate ? `${peso(rate.min)}${rate.max !== rate.min ? `–${peso(rate.max)}` : ""}` : l.price == null ? "Rate unconfirmed" : peso(l.price)}</strong>
            {(rate || l.price != null) && <span> / {rate?.period || "night"}{rate ? " · Approx." : ""}</span>}
          </div>
          {selected && <span className="aip-stay-selected"><Check size={14} />Selected</span>}
        </div>
        {unavailable && <p className="aip-stay-note">Day-use / events only · Overnight stay unavailable</p>}
        {!unavailable && comparison && comparison.status !== 'day-trip' && <p className={`aip-hotel-budget ${comparison.status}`}>
          <Info size={15} />
          <span>{comparison.status === "unknown" ? "Confirm hotel cost" : `${comparison.status === "over" ? "Over budget" : comparison.status === "possible" ? "May exceed budget" : "Within hotel allowance"} · Estimated ${peso(comparison.min)}–${peso(comparison.max)} total`}
          {comparison.min != null && !comparison.knownBasis && " · Confirm price basis and room capacity"}</span>
        </p>}
      </div>
      {d && <details className="aip-stay-details">
        <summary><Info size={15} /><span className="aip-stay-show">View details</span><span className="aip-stay-hide">Hide details</span><ChevronDown size={16} /></summary>
        <div className="aip-stay-facts">
          {(d.check_in || d.check_out) && <div className="aip-stay-times">
            {[[LogIn, "Check-in", d.check_in], [LogOut, "Check-out", d.check_out]].filter(([, , value]) => value).map(([Icon, label, value]) => (
              <div className="aip-stay-fact" key={label}><Icon size={17} /><div><span>{label}</span><p>{value}</p></div></div>
            ))}
          </div>}
          {facts.map(([Icon, label, value]) => <div className="aip-stay-fact" key={label}><Icon size={17} /><div><span>{label}</span><p>{value}</p></div></div>)}
        </div>
      </details>}
    </article>
  );
}

function Chip({ selected, onClick, children }) {
  return (
    <button type="button" aria-pressed={selected} className={`aip-chip ${selected ? "is-selected" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function MultiSelectField({ label, placeholder, options, values, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="aip-field">
      <label className="aip-label">{label}</label>
      <button type="button" className="aip-select-trigger" onClick={() => setOpen((v) => !v)}>
        <span className={values.length ? "" : "aip-placeholder"}>
          {values.length ? values.join(", ") : placeholder}
        </span>
        <ChevronRight size={16} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && (
        <div className="aip-multiselect-panel">
          <div className="aip-chip-row">
            {options.map((opt) => (
              <Chip key={opt} selected={values.includes(opt)} onClick={() => onChange(toggleValue(values, opt))}>
                {opt}
              </Chip>
            ))}
          </div>
          <div className="aip-multiselect-footer">
            <span className="aip-muted">{values.length} selected</span>
            <button type="button" className="aip-btn aip-btn-dark aip-btn-sm" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
const todayInManila = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
const BUDGET_PACKAGES = [
  { id: "economy", min: 200, max: 500, rate: 500, label: "Economy", Icon: PiggyBank, color: "#246B73" },
  { id: "budget", min: 500, max: 1000, rate: 1000, label: "Budget", Icon: Wallet, color: "#2A7B4C" },
  { id: "standard", min: 1000, max: 2000, rate: 2000, label: "Standard", Icon: Star, color: "#0B3C5D" },
  { id: "comfortable", min: 2000, max: 4000, rate: 4000, label: "Comfortable", Icon: TrendingUp, color: "#946516" },
  { id: "premium", min: 4000, max: null, rate: 4000, label: "Premium", Icon: Zap, color: "#B7472B" },
];
const initialForm = () => ({
  areaId: "",
  tripTypes: [],
  activities: [],
  travelerType: "couple",
  travelStyle: "balanced",
  date: todayInManila(),
  travelers: 2,
  budget: "2000",
  days: 1,
  lodgingId: null,
  startTime: "07:00",
  mealBudget: "300",
  fareInputs: [],
  transportModes: ["Bus", "Jeepney"],
  preferences: [],
  returnToOrigin: true,
});

export default function AIItinerary() {
  const { isDark, palette, themeColor } = useAppTheme();
  // Share semantic colors with the fare inputs and generated itinerary.
  const themeVariables = {
    colorScheme: isDark ? "dark" : "light",
    "--aip-background": palette.background,
    "--aip-surface": palette.surface,
    "--aip-paper": palette.paper,
    "--aip-ink": palette.ink,
    "--aip-muted": palette.muted,
    "--aip-border": palette.line,
    "--aip-primary": palette.primary,
    "--aip-on-primary": palette.onPrimary,
    "--aip-button": palette.button,
    "--aip-on-button": palette.onButton,
    "--aip-accent": palette.accent,
    "--aip-selected": palette.tint,
    "--aip-selection-border": isDark ? "#83A8AA" : palette.brand,
    "--aip-focus": isDark ? "#8FD1C7" : palette.brand,
    "--aip-success": isDark ? darkPalette.green : "#316B59",
    "--aip-success-tint": isDark ? darkPalette.greenTint : "#EDF6F0",
    "--aip-warning": isDark ? darkPalette.gold : "#795416",
    "--aip-warning-tint": isDark ? darkPalette.goldTint : "#FFF6E3",
    "--aip-danger-tint": isDark ? darkPalette.coralTint : "#FFF0EB",
  };
  const { width } = useWindowDimensions();
  const contentWidth = width >= 768 ? width - 280 : width;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [budgetTier, setBudgetTier] = useState("budget");
  const [hotelRooms, setHotelRooms] = useState(1);
  const selectedBudget = BUDGET_PACKAGES.find((tier) => tier.id === budgetTier);
  const budgetRate = selectedBudget.rate;
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
  const [saving, setSaving] = useState(false);
  const AREAS = catalog;
  useEffect(() => {
    const controller = new AbortController();
    api.getItineraryCatalog({ signal: controller.signal })
      .then(data => { setCatalog(data.areas); setFareTables(data.fareTables || []); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setToday(todayInManila()), 30000);
    return () => clearInterval(timer);
  }, []);

  const set = (key, value) => setForm((f) => {
    const next = { ...f, [key]: value, ...(key === "areaId" ? { lodgingId: null } : {}) };
    if (key === 'areaId') next.fareInputs = [];
    if (key === 'transportModes') next.fareInputs = f.fareInputs.filter(item => value.includes(item.mode));
    if (key === 'travelers' && Number(value) === 1) next.travelerType = 'solo';
    if (key === 'travelers' && Number(value) > 1 && f.travelerType === 'solo') next.travelerType = Number(value) === 2 ? 'couple' : 'group';
    if (key === "travelerType" && ["solo", "couple"].includes(value)) next.travelers = value === "solo" ? 1 : 2;
    if (["travelers", "days", "travelerType"].includes(key)) {
      next.budget = String(budgetRate * Math.max(1, Number(next.travelers) || 1) * next.days);
    }
    return next;
  });
  const chooseBudget = ({ id, rate }) => {
    setBudgetTier(id);
    setForm((f) => ({ ...f, budget: String(rate * Math.max(1, Number(f.travelers) || 1) * f.days) }));
  };
  const dateError = !form.date ? "Choose a travel date." : form.date < today ? "Choose today or a future date." : "";
  const validateTripDetails = () => {
    if (!form.date || form.date < todayInManila()) {
      setToday(todayInManila());
      setAttemptedNext(true);
      setStep(2);
      return false;
    }
    if (stayBudget?.blocked) {
      setAttemptedNext(true);
      setStep(2);
      return false;
    }
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
    if (step === 1 && !form.areaId) { setAttemptedNext(true); return; }
    if (step === 2 && !validateTripDetails()) return;
    setAttemptedNext(false);
    setStep((s) => Math.min(3, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const generate = async () => {
    if (generationRef.current) return;
    if (!validateTripDetails()) return;
    generationRef.current = true;
    setError("");
    setPhase("Planning from your area's catalog");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const built = await api.generateGroundedItinerary({ ...form, hotelRooms }, { signal: controller.signal });
      const icons = { Bus, Compass, Utensils, Home, ShoppingBag };
      setPlan({ ...built, stops: built.stops.map(stop => ({ ...stop, Icon: icons[stop.iconKey] || Compass })) });
      setShowForm(false);
      setSaved(false);
    } catch (err) {
      setError(controller.signal.aborted ? "Generation timed out. Please try again." : err.message || "Unable to generate your itinerary. Please try again.");
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
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  /* -------------------------- render -------------------------- */
  return (
    <div className="aip-shell" style={themeVariables}>
      <style>{CSS}</style>

      {/* Navigation is provided by the shared UserSidebar in App.jsx. */}
      {/* ---------------- Main ---------------- */}
      <main className="aip-main">
        <div className="aip-content">
          <div className="aip-tool-header">
            <AIToolHeader
              eyebrow="PANGASINAN TRIP PLANNER"
              title="AI Itinerary"
              subtitle="Build a practical trip plan using verified places, transport fares, and local food guides."
              badges={[{ label: "Verified local data" }, { label: "Budget-aware planning" }, { label: "Custom AI model", color: "#A78BFA" }]}
              Icon={Sparkles}
              compact={contentWidth < 600}
            />
          </div>
          {error && <p className="aip-error" role="alert">{error}</p>}
          {showForm && (
            <>
              <div className="aip-progress-header">
                <span className="aip-step-title">Plan step {step} of 3</span>
                <span className="aip-muted">{stepLabel}</span>
              </div>
              <div className="aip-progress-bars">
                {[1, 2, 3].map((n) => <div key={n} className={`aip-progress-bar ${n <= step ? "is-active" : ""}`} />)}
              </div>

              {/* ---------- STEP 1 ---------- */}
              {step === 1 && (
                <div className="aip-card">
                  <h2 className="aip-heading">Choose your destination</h2>
                  <p className="aip-subtitle">Select an area and tell the AI what kind of experience you want.</p>

                  <div className="aip-field">
                    <label className="aip-label">Where in Pangasinan?</label>
                    <select className="aip-select" value={form.areaId} onChange={(e) => set("areaId", e.target.value)}>
                      <option value="">— Pick a city or municipality —</option>
                      <optgroup label="Cities">
                        {AREAS.filter((a) => a.group === "Cities").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </optgroup>
                      <optgroup label="Municipalities">
                        {AREAS.filter((a) => a.group === "Municipalities").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </optgroup>
                    </select>
                  </div>

                  <MultiSelectField label="What kind of trip do you want?" placeholder="Select trip type(s)..." options={TRIP_TYPES} values={form.tripTypes} onChange={(v) => set("tripTypes", v)} />
                  <MultiSelectField label="What activities do you want?" placeholder="Select activities..." options={ACTIVITIES} values={form.activities} onChange={(v) => set("activities", v)} />

                  <div className="aip-field">
                    <label className="aip-label">Who are you traveling with?</label>
                    <div className="aip-icon-grid">
                      {TRAVELER_TYPES.map(({ id, label, Icon }) => (
                        <button type="button" key={id} aria-pressed={form.travelerType === id} className={`aip-icon-card ${form.travelerType === id ? "is-selected" : ""}`} onClick={() => set("travelerType", id)}>
                          <Icon size={20} /><span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="aip-field">
                    <label className="aip-label">What's your travel style?</label>
                    <div className="aip-style-grid">
                      {TRAVEL_STYLES.map(({ id, label, desc, Icon }) => (
                        <button type="button" key={id} aria-pressed={form.travelStyle === id} className={`aip-style-card ${form.travelStyle === id ? "is-selected" : ""}`} onClick={() => set("travelStyle", id)}>
                          <Icon size={18} /><strong>{label}</strong><span>{desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {attemptedNext && !form.areaId && <p className="aip-error">Please select at least a destination to continue.</p>}
                  <button className={`aip-btn aip-btn-block ${form.areaId ? "aip-btn-dark" : "aip-btn-disabled"}`} onClick={goNext}>
                    Next: trip details →
                  </button>
                </div>
              )}

              {/* ---------- STEP 2 ---------- */}
              {step === 2 && (
                <>
                  <div className="aip-card">
                    <h2 className="aip-heading">Trip details</h2>
                    <p className="aip-subtitle">Set your travel date, group size, and budget, then choose your stay.</p>
                    <div className="aip-field-row">
                      <div className="aip-field">
                        <label className="aip-label" htmlFor="aip-travel-date">Travel date</label>
                        <input id="aip-travel-date" type="date" required min={today} className="aip-input" value={form.date} aria-invalid={!!dateError && (attemptedNext || !!form.date)} aria-describedby={dateError ? "aip-date-error" : undefined} onFocus={() => setToday(todayInManila())} onChange={(e) => set("date", e.target.value)} />
                        {dateError && (attemptedNext || form.date) && <p id="aip-date-error" className="aip-error" role="alert">{dateError}</p>}
                      </div>
                      <div className="aip-field"><label className="aip-label">Travelers</label><input type="number" min={1} step={1} className="aip-input" value={form.travelers} onChange={(e) => set("travelers", Math.max(1, Math.floor(Number(e.target.value) || 1)))} /></div>
                      <div className="aip-field">
                        <label className="aip-label" htmlFor="aip-trip-days">How many days?</label>
                        <select id="aip-trip-days" className="aip-select" value={form.days} onChange={(e) => set("days", Number(e.target.value))}>
                          {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} day{n === 1 ? "" : "s"}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="aip-budget-heading">
                      <span id="aip-budget-label">Total trip budget</span>
                      <span>{form.travelers} traveler{Number(form.travelers) === 1 ? "" : "s"} × {form.days} day{form.days === 1 ? "" : "s"}</span>
                    </div>
                    <div className="aip-budget-grid" role="group" aria-labelledby="aip-budget-label">
                      {BUDGET_PACKAGES.map((tier) => {
                        const { Icon } = tier;
                        const multiplier = form.travelers * form.days;
                        const tierColor = themeColor(tier.color);
                        return <button type="button" key={tier.id} aria-pressed={budgetTier === tier.id} className={`aip-budget-card ${budgetTier === tier.id ? "is-selected" : ""}`} style={{ "--tier-color": tierColor, "--tier-tint": `${tierColor}0D`, "--tier-border": `${tierColor}66`, "--tier-icon-bg": `${tierColor}18` }} onClick={() => chooseBudget(tier)}>
                          <span className="aip-budget-icon"><Icon size={18} /></span>
                          <strong>{tier.label}</strong>
                          <span className="aip-budget-range">{peso(tier.min * multiplier)}{tier.max ? `–${peso(tier.max * multiplier)}` : "+"}</span>
                          <span className="aip-budget-person">{peso(tier.min)}{tier.max ? `–${peso(tier.max)}` : "+"}<br />/ person / day</span>
                        </button>;
                      })}
                    </div>
                    <div className="aip-budget-summary" aria-live="polite">
                      <span>Selected tier</span>
                      <strong>{selectedBudget.label} <span>·</span> {selectedBudget.max ? "Budget cap" : "Starting budget"}: {peso(form.budget)}</strong>
                    </div>
                  </div>

                  <div className="aip-card">
                    <div className="aip-row-between">
                      <h2 className="aip-heading">Where will you stay?</h2>
                      {lodging && <span className="aip-pill aip-pill-tan">{lodging.tier}</span>}
                    </div>
                    <p className="aip-subtitle">Hotels and accommodations in {area?.name || "your destination"}</p>
                    <div className="aip-hotel-budget-panel">
                      <label className="aip-label" htmlFor="aip-hotel-rooms">Rooms needed</label>
                      <input id="aip-hotel-rooms" className="aip-input" type="number" min={1} step={1} value={hotelRooms} onChange={(e) => setHotelRooms(Math.max(1, Math.floor(Number(e.target.value) || 1)))} />
                      <p>{form.days === 1 ? 'Day trip: no overnight stay is scheduled or charged. Choose 2 or more days to include a hotel.' : `Estimate: nightly rate × ${form.days - 1} nights × ${hotelRooms} rooms. Confirm room capacity with the hotel.`}</p>
                      {stayBudget && <div aria-live="polite">
                        {stayBudget.min != null && <p><strong>{lodging.name}: {peso(stayBudget.min)}–{peso(stayBudget.max)}</strong><br />Trip budget: {peso(form.budget)}. {stayBudget.min > Number(form.budget) ? `Minimum estimate exceeds it by ${peso(stayBudget.min - Number(form.budget))}.` : `Remaining after hotel: ${peso(Math.max(0, Number(form.budget) - stayBudget.max))}–${peso(Number(form.budget) - stayBudget.min)} for food, transport, and activities.`}</p>}
                        {stayBudget.status !== 'day-trip' && (!stayBudget.knownBasis || stayBudget.status === "unknown") && <p>Confirm hotel cost: this estimate assumes a per-room nightly rate. Pricing and capacity are not confirmed.</p>}
                        {stayBudget.blocked && <p className="aip-error" role="alert">The hotel alone exceeds your budget. Choose a cheaper hotel, increase your budget, or remove lodging before continuing.</p>}
                        {["over", "possible"].includes(stayBudget.status) && <div className="aip-chip-row">
                          {higherBudget && <button type="button" className="aip-btn aip-btn-outline aip-btn-sm" onClick={() => chooseBudget(higherBudget)}>Use {higherBudget.label} · {peso(higherBudget.rate * form.travelers * form.days)}</button>}
                          <button type="button" className="aip-btn aip-btn-outline aip-btn-sm" onClick={() => set("lodgingId", null)}>Choose no lodging</button>
                        </div>}
                      </div>}
                    </div>

                    <button type="button" className={`aip-lodging-row ${!form.lodgingId ? "is-selected" : ""}`} onClick={() => set("lodgingId", null)}>
                      <Bus size={18} />
                      <div><strong>Day trip — no lodging</strong><div className="aip-muted aip-small">No accommodation selected</div></div>
                    </button>

                    {!lodgingList.length && <p>No verified accommodation on file for this area yet.</p>}
                    {lodgingList.map((l) => (
                      <LodgingCard key={l.id} lodging={l} comparison={hotelBudget(l, form.budget, form.days, hotelRooms)} selected={form.lodgingId === l.id} onSelect={() => set("lodgingId", l.id)} />
                    ))}
                  </div>

                  <div className="aip-step-actions">
                    <button className="aip-btn aip-btn-outline" onClick={goBack}>← Back</button>
                    <button className="aip-btn aip-btn-dark" onClick={goNext}>Next: review trip →</button>
                  </div>
                </>
              )}

              {/* ---------- STEP 3 ---------- */}
              {step === 3 && (
                <div className="aip-card">
                  <h2 className="aip-heading">Review and personalize</h2>
                  <p className="aip-subtitle">Check what the AI knows about your destination, then fine-tune before generating.</p>

                  {info && (
                    <div className="aip-destination-review">
                      <div className="aip-review-destination"><MapPin size={18} /><strong>{area?.name}</strong></div>
                      {destinationPhotoGuides[area?.id] ? <>
                        <DestinationGallery title="Famous places nearby" names={info.famousPlaces} Icon={MapPin} photos={destinationPhotoGuides[area.id].photos} />
                        <DestinationGallery title="Foods to try" names={info.foods} Icon={Utensils} photos={destinationPhotoGuides[area.id].photos} />
                        <details className="aip-photo-credits"><summary>Image source</summary><p>{destinationPhotoGuides[area.id].filePrefix}_City_PLACES TO VISIT &amp; FOODS_IMAGES.pdf - supplied for this trip guide. Images shown as labeled in the document; original photographer marks retained.</p></details>
                      </> : <>
                        <h3 className="aip-heading-sm">Famous places nearby</h3><p>{info.famousPlaces.join(" · ")}</p>
                        <h3 className="aip-heading-sm">Foods to try</h3><p>{info.foods.join(" · ")}</p>
                      </>}
                    </div>
                  )}

                  <div className="aip-chip-row aip-summary-chips">
                    {[area?.name, TRAVELER_TYPES.find((t) => t.id === form.travelerType)?.label, `${form.days} day${form.days === 1 ? "" : "s"}`,
                      `${form.travelers} travelers`, `${peso(form.budget)} budget`, TRAVEL_STYLES.find((t) => t.id === form.travelStyle)?.label,
                      lodging ? `${lodging.name} (${lodging.lodgingDetails ? 'approximate rate; confirm booking' : 'rate unconfirmed'})` : null, ...form.tripTypes, ...form.activities]
                      .filter(Boolean).map((t, i) => <span key={i} className="aip-summary-chip">{t}</span>)}
                  </div>

                  <button type="button" className="aip-btn aip-btn-outline-coral aip-btn-block" onClick={() => setShowAdvanced((v) => !v)}>
                    {showAdvanced ? "Hide extra options" : "Show extra options"} <ChevronDown size={14} style={{ transform: showAdvanced ? "rotate(180deg)" : "none" }} />
                  </button>

                  {showAdvanced && (
                    <div className="aip-advanced">
                      <div className="aip-field-row">
                        <div className="aip-field"><label className="aip-label">Start time (HH:MM)</label><input type="time" className="aip-input" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} /></div>
                        <div className="aip-field"><label className="aip-label" htmlFor="aip-meals">Meals per person per day (PHP)</label><select id="aip-meals" className="aip-select" value={form.mealBudget} onChange={(e) => set("mealBudget", e.target.value)}>{[200, 300, 500, 750, 1000, 1500].map((amount) => <option key={amount} value={amount}>{peso(amount)} / person / day</option>)}</select></div>
                      </div>
                      <div className="aip-meal-summary" aria-live="polite">
                        <div><span>Per person · full trip</span><strong>{peso(mealPerPerson)}</strong><small>{peso(form.mealBudget)} × {form.days} day{form.days === 1 ? "" : "s"}</small></div>
                        <div><span>All travelers · full trip</span><strong>{peso(mealTotal)}</strong><small>{peso(mealPerPerson)} × {form.travelers} traveler{Number(form.travelers) === 1 ? "" : "s"}</small></div>
                        <div><span>{mealRemaining < 0 ? "Meals exceed trip budget" : "Budget after meals"}</span><strong className={mealRemaining < 0 ? "aip-error" : ""}>{peso(Math.abs(mealRemaining))}</strong><small>Meal allowance, not restaurant prices</small></div>
                      </div>
                      {stayBudget?.min != null && <p className="aip-meal-note">Meals + hotel estimate: {peso(mealTotal + stayBudget.min)}–{peso(mealTotal + stayBudget.max)}.{mealTotal + stayBudget.max > Number(form.budget) ? " May exceed your trip budget; lower the meal allowance or revise your stay or budget." : " Transport and activities still need to be covered."}</p>}
                      <label className="aip-label">Transport</label>
                      <div className="aip-chip-row">
                        {TRANSPORT_MODES.map((m) => <Chip key={m} selected={form.transportModes.includes(m)} onClick={() => set("transportModes", toggleValue(form.transportModes, m))}>{m}</Chip>)}
                      </div>
                      <ItineraryFareInputs modes={form.transportModes} tables={fareTables} values={form.fareInputs} onChange={value => set('fareInputs', value)} areaId={form.areaId} />
                    </div>
                  )}

                  <div className="aip-step-actions">
                    <button className="aip-btn aip-btn-outline" onClick={goBack}>← Back</button>
                    <button className="aip-btn aip-btn-generate" disabled={!!phase || !catalog.length} onClick={generate}><Zap size={16} />{phase ? `Generating… ${elapsed}s` : 'Generate my itinerary'}</button>
                  </div>
                  {error && <p className="aip-error" role="alert" style={{ marginTop: 14 }}>{error}</p>}
                </div>
              )}
            </>
          )}

          {!!phase && (
            <div className="aip-card aip-generating">
              <div className="aip-spinner" />
              <span>{phase} · {elapsed}s</span>
            </div>
          )}

          {!showForm && plan && <ItineraryResults plan={plan} areaName={AREAS.find(a => a.id === plan.request.areaId)?.name} onEdit={() => setShowForm(true)} onSave={savePlan} saved={saved} saving={saving} />}
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared app typography and semantic theme colors. */
const CSS = `

.aip-shell, .aip-shell * { box-sizing: border-box; }
.aip-shell { display: flex; flex: 1; min-height: 0; overflow-y: auto; background: var(--aip-background); font-family: ${fonts.body}; font-size: 16px; line-height: 1.5; color: var(--aip-ink); }
.aip-shell svg { flex-shrink: 0; }
.aip-shell button, .aip-shell input, .aip-shell select { font-family: inherit; }
.aip-shell button { overflow-wrap: anywhere; transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease; }
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .aip-shell button:enabled:hover { transform: translateY(-2px) scale(1.015); }
}
@media (prefers-reduced-motion: no-preference) {
  .aip-shell button:enabled:active { transform: translateY(1px) scale(0.985); opacity: 0.9; }
}
@media (prefers-reduced-motion: reduce) {
  .aip-shell button { transition: none !important; }
}
.aip-shell h2, .aip-shell h3, .aip-shell h4 { font-family: ${fonts.display}; }
.aip-icon-card, .aip-style-card { color: var(--aip-ink); }
.aip-icon-card:hover, .aip-style-card:hover, .aip-chip:hover, .aip-lodging-row:hover { border-color: var(--aip-selection-border); }
.aip-input::placeholder { color: var(--aip-muted); opacity: 1; }
.aip-shell input[type="checkbox"] { accent-color: var(--aip-selection-border); }
.aip-budget-range, .aip-price, .aip-stop-time, .air-stat > strong { font-variant-numeric: tabular-nums; }
.aip-shell button:focus-visible, .aip-shell input:focus-visible, .aip-shell select:focus-visible { outline: 3px solid var(--aip-focus); outline-offset: 3px; }

.aip-main { flex: 1; width: 100%; display: flex; flex-direction: column; min-width: 0; }
.aip-tool-header { margin-bottom: 32px; }

.aip-content { max-width: 1200px; width: 100%; margin: 0 auto; padding: clamp(16px, 3vw, 36px) clamp(16px, 3vw, 40px) 60px; }
.aip-progress-header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 8px 20px; margin-bottom: 12px; }
.aip-step-title { font-family: ${fonts.display}; font-size: 20px; font-weight: 700; color: var(--aip-ink); }
.aip-progress-bars { display: flex; gap: 8px; margin-bottom: 28px; }
.aip-progress-bar { flex: 1; height: 6px; border-radius: 8px; background: var(--aip-border); }
.aip-progress-bar.is-active { background: var(--aip-accent); }

.aip-card { background: var(--aip-surface); border: 1px solid var(--aip-border); border-radius: 16px; padding: clamp(20px, 3vw, 36px); margin-bottom: 24px; min-width: 0; }
.aip-heading { font-family: ${fonts.display}; font-size: clamp(22px, 2.5vw, 28px); margin: 0 0 10px; color: var(--aip-ink); }
.aip-heading-sm { font-family: ${fonts.display}; font-size: 18px; margin: 0 0 12px; color: var(--aip-ink); }
.aip-subtitle { color: var(--aip-muted); font-size: 16px; line-height: 1.6; margin: 0 0 28px; }

.aip-field { min-width: 0; margin-bottom: 28px; }
.aip-field-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 24px; margin-bottom: 28px; }
.aip-field-row .aip-field { margin-bottom: 0; }
.aip-label { display: block; font-size: 15px; font-weight: 600; color: var(--aip-ink); margin-bottom: 10px; }
.aip-input, .aip-select, .aip-select-trigger {
  width: 100%; min-width: 0; max-width: 100%; min-height: 52px; padding: 14px 16px; border-radius: 10px; border: 1px solid var(--aip-border);
  font-family: ${fonts.body}; font-size: 16px; background: var(--aip-surface); color: var(--aip-ink);
}
.aip-select-trigger { gap: 12px; text-align: left; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.aip-select-trigger > span { min-width: 0; overflow-wrap: anywhere; }
.aip-placeholder { color: var(--aip-muted); }

.aip-multiselect-panel { border: 1px solid var(--aip-border); border-radius: 12px; padding: 20px; margin-top: 12px; }
.aip-multiselect-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
.aip-chip-row { display: flex; flex-wrap: wrap; gap: 10px; }
.aip-chip {
  border: 1px solid var(--aip-border); background: var(--aip-surface); border-radius: 22px; min-height: 44px; max-width: 100%; padding: 10px 16px;
  font-size: 15px; cursor: pointer; color: var(--aip-ink);
}
.aip-chip.is-selected { background: var(--aip-primary); border-color: var(--aip-selection-border); color: var(--aip-on-primary); }

.aip-icon-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 110px), 1fr)); gap: 14px; }
.aip-icon-card { display: flex; flex-direction: column; align-items: center; gap: 12px; min-height: 100px; padding: 20px 12px; border-radius: 12px; border: 1px solid var(--aip-border); background: var(--aip-surface); cursor: pointer; font-size: 16px; font-weight: 600; }
.aip-icon-card.is-selected { border-color: var(--aip-selection-border); background: var(--aip-selected); box-shadow: inset 0 0 0 1px var(--aip-selection-border); }

.aip-style-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr)); gap: 16px; }
.aip-style-card { text-align: left; display: flex; flex-direction: column; gap: 10px; min-height: 136px; padding: 22px; border-radius: 12px; border: 1px solid var(--aip-border); background: var(--aip-surface); cursor: pointer; }
.aip-style-card strong { font-size: 17px; }
.aip-style-card span { font-size: 14px; color: var(--aip-muted); }
.aip-style-card.is-selected { background: var(--aip-selected); border-color: var(--aip-selection-border); color: var(--aip-ink); box-shadow: inset 0 0 0 1px var(--aip-selection-border); }

.aip-error { color: var(--aip-accent); font-size: 13px; margin: 4px 0 14px; }
.aip-budget-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; color: var(--aip-muted); font-size: 14px; font-weight: 600; margin: 28px 0 14px; }
.aip-budget-heading > span:last-child { font-size: 12px; font-weight: 400; }
.aip-budget-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.aip-budget-card { display: flex; flex-direction: column; align-items: flex-start; gap: 7px; padding: 16px 12px; border: 1px solid var(--tier-border); border-radius: 20px; background: var(--tier-tint); color: var(--aip-ink); text-align: left; cursor: pointer; min-width: 0; }
.aip-budget-card:hover { border-color: var(--tier-color); background: var(--tier-icon-bg); }
.aip-budget-card > strong { font-size: 13px; }
.aip-budget-icon { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--tier-icon-bg); color: var(--tier-color); margin-bottom: 4px; }
.aip-budget-range { font-family: ${fonts.body}; font-size: 11px; font-weight: 600; color: var(--tier-color); }
.aip-budget-person { font-size: 11px; line-height: 1.5; color: var(--aip-muted); }
.aip-budget-card.is-selected { background: var(--tier-icon-bg); border-color: var(--tier-color); box-shadow: inset 0 0 0 1px var(--tier-color); }
.aip-budget-summary { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; padding: 12px 14px; margin-top: 14px; border-radius: 18px; background: var(--aip-paper); font-size: 13px; }
.aip-budget-summary > span { color: var(--aip-muted); }
.aip-budget-summary strong > span { padding: 0 8px; color: var(--aip-muted); }
@media (max-width: 1100px) { .aip-budget-grid { grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)); } }
@media (max-width: 480px) { .aip-budget-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

.aip-btn { min-height: 48px; border-radius: 10px; padding: 14px 22px; font-size: 16px; font-weight: 600; cursor: pointer; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.aip-btn-block { width: 100%; margin-top: 6px; }
.aip-btn-sm { padding: 6px 14px; font-size: 13px; }
.aip-btn-dark { background: var(--aip-primary); color: var(--aip-on-primary); }
.aip-btn-disabled { background: var(--aip-border); color: var(--aip-muted); cursor: not-allowed; }
.aip-btn-outline { background: var(--aip-surface); border: 1px solid var(--aip-border); color: var(--aip-ink); }
.aip-btn-outline-coral { background: var(--aip-surface); border: 1px solid var(--aip-accent); color: var(--aip-accent); }
.aip-btn-primary { background: var(--aip-primary); color: var(--aip-on-primary); }
.aip-btn-generate { background: var(--aip-button); color: var(--aip-on-button); }
.aip-btn:disabled { opacity: .65; cursor: not-allowed; }

.aip-step-actions { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; margin-top: 28px; }
.aip-step-actions .aip-btn { flex: 1 1 220px; }
.aip-row-between { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px; }

.aip-lodging-row { width: 100%; display: flex; gap: 12px; align-items: flex-start; font-size: 16px; line-height: 1.5; color: var(--aip-ink); text-align: left; padding: 20px; border-radius: 12px; border: 1px solid var(--aip-border); background: var(--aip-surface); margin-bottom: 10px; cursor: pointer; }
.aip-lodging-row.is-selected { border-color: var(--aip-selection-border); background: var(--aip-selected); }
.aip-lodging-info { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.aip-amenities { display: flex; gap: 10px; flex-wrap: wrap; font-size: 14px; color: var(--aip-muted); margin: 10px 0; }
.aip-amenity { display: inline-flex; align-items: center; gap: 4px; }
.aip-price { font-family: ${fonts.body}; color: var(--aip-accent); font-weight: 700; }
.aip-check { color: var(--aip-ink); }
.aip-hotel-budget-panel { background: var(--aip-background); border: 1px solid var(--aip-border); border-radius: 12px; padding: 16px; margin-bottom: 18px; }
.aip-hotel-budget-panel input { max-width: 120px; }
.aip-hotel-budget-panel p { font-size: 13px; line-height: 1.6; }
.aip-hotel-budget { display: flex; align-items: flex-start; gap: 7px; font-size: 12px; padding: 10px; border-radius: 8px; background: var(--aip-paper); margin: 12px 0 0; }
.aip-hotel-budget.over { color: var(--aip-accent); background: var(--aip-danger-tint); }
.aip-hotel-budget.possible { color: var(--aip-warning); background: var(--aip-warning-tint); }
.aip-hotel-budget.within { color: var(--aip-success); background: var(--aip-success-tint); }
.aip-stay-card { border: 1px solid var(--aip-border); border-radius: 14px; margin-bottom: 14px; background: var(--aip-surface); overflow: hidden; }
.aip-stay-card.is-selected { border-color: var(--aip-selection-border); background: var(--aip-selected); box-shadow: inset 3px 0 var(--aip-selection-border); }
.aip-stay-select { display: flex; align-items: center; gap: 14px; width: 100%; padding: 20px 20px 12px; border: 0; background: transparent; color: var(--aip-ink); text-align: left; cursor: pointer; }
.aip-stay-select:disabled { cursor: not-allowed; opacity: .65; }
.aip-stay-select:focus-visible { outline-offset: -4px; }
.aip-stay-icon { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; flex-shrink: 0; background: var(--aip-paper); color: var(--aip-ink); border-radius: 12px; }
.aip-stay-title { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.aip-stay-title strong { font-size: 17px; }
.aip-stay-tier { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px; background: var(--aip-paper); }
.aip-stay-radio { width: 22px; height: 22px; flex-shrink: 0; border: 1.5px solid var(--aip-selection-border); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.aip-stay-radio.is-selected { background: var(--aip-primary); border-color: var(--aip-selection-border); }
.aip-stay-body { padding: 0 20px 16px; }
.aip-stay-location { display: flex; align-items: flex-start; gap: 7px; color: var(--aip-muted); font-size: 12px; overflow-wrap: anywhere; }
.aip-stay-location svg { margin-top: 2px; }
.aip-stay-amenities { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
.aip-stay-amenity { display: inline-flex; align-items: center; gap: 7px; padding: 6px 10px; border-radius: 7px; background: var(--aip-paper); color: var(--aip-ink); font-size: 12px; }
.aip-stay-bottom { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px; }
.aip-stay-rate strong { font-size: 19px; font-weight: 700; color: var(--aip-ink); }
.aip-stay-rate > span { color: var(--aip-muted); font-size: 12px; }
.aip-stay-selected { display: inline-flex; align-items: center; gap: 4px; color: var(--aip-success); font-size: 12px; font-weight: 600; }
.aip-stay-note { font-size: 12px; color: var(--aip-warning); margin: 10px 0 0; }
.aip-stay-details { border-top: 1px solid var(--aip-border); }
.aip-stay-details summary { display: flex; align-items: center; gap: 7px; padding: 12px 20px; min-height: 44px; cursor: pointer; color: var(--aip-ink); font-size: 12px; font-weight: 600; list-style: none; }
.aip-stay-details summary::-webkit-details-marker { display: none; }
.aip-stay-details summary > svg:last-child { margin-left: auto; }
.aip-stay-details summary:focus-visible { outline: 3px solid var(--aip-focus); outline-offset: -3px; }
.aip-stay-hide, .aip-stay-details[open] .aip-stay-show { display: none; }
.aip-stay-details[open] .aip-stay-hide { display: inline; }
.aip-stay-details[open] summary > svg:last-child { transform: rotate(180deg); }
.aip-stay-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 20px; padding: 8px 20px 20px; }
.aip-stay-fact { display: flex; align-items: flex-start; gap: 10px; min-width: 0; color: var(--aip-muted); }
.aip-stay-fact > svg { margin-top: 3px; }
.aip-stay-fact > div { min-width: 0; }
.aip-stay-fact span { font-size: 11px; font-weight: 700; color: var(--aip-ink); }
.aip-stay-fact p { font-size: 13px; margin: 3px 0 0; overflow-wrap: anywhere; }
.aip-stay-times { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

.aip-info-box { background: var(--aip-paper); border-radius: 12px; padding: 24px; margin-bottom: 24px; font-size: 16px; overflow-wrap: anywhere; }
.aip-info-label { font-size: 13px; letter-spacing: .04em; color: var(--aip-muted); margin: 10px 0 4px; }
.aip-review-destination { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; color: var(--aip-ink); }
.aip-discovery-section { margin-bottom: 28px; }
.aip-more-discoveries { margin-top: 14px; font-size: 12px; color: var(--aip-muted); }
.aip-more-discoveries summary { cursor: pointer; padding: 8px 0; color: var(--aip-ink); }
.aip-discovery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr)); gap: 16px; }
.aip-discovery-card { border: 1px solid var(--aip-border); border-radius: 14px; overflow: hidden; background: var(--aip-surface); }
.aip-discovery-image { height: 155px; background: var(--aip-paper); }
.aip-discovery-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
.aip-photo-placeholder { height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 8px; color: var(--aip-muted); font-size: 12px; }
.aip-discovery-caption { display: flex; gap: 8px; padding: 14px; height: 88px; align-items: flex-start; }
.aip-discovery-caption h4 { margin: 0; font-size: 13px; line-height: 1.5; }
.aip-photo-credits { font-size: 11px; color: var(--aip-muted); margin-bottom: 24px; }
.aip-photo-credits summary { cursor: pointer; padding: 8px 0; }
.aip-photo-credits a { color: var(--aip-ink); }
.aip-meal-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 16px; background: var(--aip-paper); padding: 20px; border-radius: 12px; margin-bottom: 24px; }
.aip-meal-summary > div { display: flex; flex-direction: column; gap: 6px; }
.aip-meal-summary span, .aip-meal-summary small, .aip-meal-note { font-size: 12px; color: var(--aip-muted); }
.aip-meal-summary strong { font-size: 21px; }
.aip-summary-chips { margin-bottom: 18px; }
.aip-summary-chip { background: var(--aip-paper); border-radius: 16px; padding: 10px 14px; font-size: 14px; max-width: 100%; overflow-wrap: anywhere; }

.aip-advanced { border-top: 1px solid var(--aip-border); padding-top: 28px; margin-top: 24px; margin-bottom: 28px; }
.aip-advanced > .aip-chip-row { margin-bottom: 28px; }

.aip-generating { display: flex; align-items: center; gap: 12px; }
.aip-spinner { width: 18px; height: 18px; border: 2px solid var(--aip-border); border-top-color: var(--aip-accent); border-radius: 50%; animation: aip-spin 0.8s linear infinite; }
@keyframes aip-spin { to { transform: rotate(360deg); } }

.aip-result-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: 20px; }
.aip-timeline { display: flex; flex-direction: column; gap: 12px; }
.aip-stop-row { display: flex; align-items: center; gap: 12px; background: var(--aip-surface); border: 1px solid var(--aip-border); border-radius: 12px; padding: 12px 16px; }
.aip-stop-time { width: 70px; font-family: ${fonts.body}; font-size: 12px; color: var(--aip-muted); flex-shrink: 0; }
.aip-stop-icon { width: 34px; height: 34px; border-radius: 50%; background: var(--aip-paper); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.aip-stop-body { flex: 1; min-width: 0; }
.aip-stop-tags { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.aip-day-divider { font-size: 14px; color: var(--aip-muted); margin: 10px 0; }
.aip-pill { border-radius: 20px; padding: 4px 10px; font-size: 12px; font-weight: 600; }
.aip-pill-dark { background: var(--aip-primary); color: var(--aip-on-primary); }
.aip-pill-green { background: rgba(46,125,91,0.15); color: var(--aip-success); }
.aip-pill-tan { background: var(--aip-paper); color: var(--aip-ink); }

.aip-side-col { display: flex; flex-direction: column; gap: 16px; }
.aip-summary-row { padding: 6px 0; border-bottom: 1px solid var(--aip-border); }
.aip-breakdown-row { margin-bottom: 12px; }
.aip-progress { height: 6px; border-radius: 6px; background: var(--aip-border); overflow: hidden; margin-top: 4px; }
.aip-progress-fill { height: 100%; background: var(--aip-accent); border-radius: 6px; }
.aip-total-row { border-top: 1px solid var(--aip-border); padding-top: 10px; margin-top: 4px; }

.aip-muted { color: var(--aip-muted); }
.aip-small { font-size: 12px; }
@media (max-width: 480px) {
  .aip-content { padding: 16px 12px 40px; }
  .aip-card { padding: 20px 16px; }
  .aip-tool-header { margin-bottom: 24px; }
  .aip-info-box, .aip-multiselect-panel { padding: 16px; }
  .aip-lodging-row { padding: 16px 12px; }
  .aip-stop-row { flex-wrap: wrap; }
}
`;
