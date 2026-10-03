import { useEffect, useRef, useState } from "react";
import { Image as NativeImage, useWindowDimensions } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";
import { coastalLight } from "../theme/coastalPalette";
import { lguMunicipalities } from "../data/lguMunicipalities";
import AIToolHeader from "../components/AIToolHeader";
import { api } from "../lib/api";
import { dagupanPhotos } from "../lib/dagupanPhotos";
import { alaminosPhotos } from "../lib/alaminosPhotos";
import { sanCarlosPhotos } from "../lib/sanCarlosPhotos";
import { urdanetaPhotos } from "../lib/urdanetaPhotos";
import { itineraryErrors, itineraryErrorStep, itineraryFailureMessage } from "../lib/itineraryValidation";
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
/*  Design tokens — pulled from the Figma "DESIGN TOKENS" footer       */
/* ------------------------------------------------------------------ */
const colors = {
  oceanBlue: coastalLight.primary,
  oceanBlueDark: coastalLight.deep,
  sunsetCoral: coastalLight.accent,
  palmGreen: coastalLight.brand,
  warmSand: coastalLight.paper,
  seafoam: coastalLight.tint,
  golden: "#916D2C",
  ink: coastalLight.ink,
  border: coastalLight.line,
  muted: coastalLight.muted,
  page: coastalLight.background,
};

const fonts = {
  display: '"Poppins", "DM Sans", -apple-system, sans-serif',
  body: '"DM Sans", -apple-system, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

/* ------------------------------------------------------------------ */
/*  Static reference data (would come from the catalog API)            */
/* ------------------------------------------------------------------ */

const TRIP_TYPES = [
  "Beach & Sea", "Nature", "Waterfalls", "Adventure", "Relaxing", "Pilgrimage",
  "History & Culture", "Food Trip", "Farm Experience", "Scenic / Photography",
  "Shopping & Pasalubong", "Festivals & Events",
];

const ACTIVITIES = [
  "Swimming", "Boating", "Farm Visit",
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
function AreaDropdown({ areas, value, onChange, invalid }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trigger = useRef(null);
  const selected = areas.find(area => area.id === value);
  const matches = areas.filter(area => area.name.toLowerCase().includes(query.trim().toLowerCase()));
  const close = () => { setOpen(false); setQuery(""); };
  return <div className="aip-area-picker" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); close(); trigger.current?.focus(); }
  }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }}>
    <button ref={trigger} id="aip-destination" type="button" className={`aip-area-trigger ${invalid ? "has-error" : ""}`} aria-expanded={open} aria-controls="aip-area-options" aria-invalid={invalid} onClick={() => { setOpen(!open); setQuery(""); }}>
      <span className="aip-area-icon"><MapPin size={20} /></span>
      <span className="aip-area-copy"><small>YOUR DESTINATION</small><strong>{selected ? `${selected.name}${selected.group === "Cities" ? " City" : ""}` : "Choose a city or municipality"}</strong></span>
      <ChevronDown size={18} style={{ transform: open ? "rotate(180deg)" : "none" }} />
    </button>
    {open && <div className="aip-area-panel" id="aip-area-options">
      <input autoFocus className="aip-area-search" aria-label="Search cities and municipalities" placeholder="Search a destination..." value={query} onChange={event => setQuery(event.target.value)} />
      <div className="aip-area-options">
        {["Cities", "Municipalities"].map(group => {
          const items = matches.filter(area => area.group === group);
          return !!items.length && <section key={group} aria-label={group}>
            <h3>{group}<span>{items.length}</span></h3>
            {items.map(area => <button type="button" className={`aip-area-option ${value === area.id ? "is-selected" : ""}`} key={area.id} aria-pressed={value === area.id} onClick={() => { onChange(area.id); close(); trigger.current?.focus(); }}>
              <span>{area.name}{group === "Cities" ? " City" : ""}</span>{value === area.id && <Check size={17} />}
            </button>)}
          </section>;
        })}
        {!matches.length && <p className="aip-area-empty" role="status">No destinations found. Try another name.</p>}
      </div>
    </div>}
  </div>;
}

function DestinationCard({ name, photo, Icon, entry }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  return <article className="aip-discovery-card">
    <button type="button" className="aip-discovery-image" aria-label={`View ${name} details`} onClick={() => setOpen(true)} style={{ border: 0, padding: 0, width: '100%', cursor: 'pointer' }}>
      {photo && !failed ? <NativeImage source={photo.asset} accessibilityLabel={photo.alt} resizeMode="cover" style={{ width: "100%", height: "100%" }} onError={() => setFailed(true)} /> : <div className="aip-photo-placeholder"><Icon size={28} /><span>{failed ? "Photo unavailable" : "Photo coming soon"}</span></div>}
    </button>
    <div className="aip-discovery-caption"><Icon size={16} /><h4>{name}</h4></div>
    {open && <div className="aip-description-backdrop" onClick={() => setOpen(false)}><section role="dialog" aria-modal="true" aria-label={name} className="aip-description-card" onClick={event => event.stopPropagation()}><button autoFocus className="aip-btn aip-btn-outline" onClick={() => setOpen(false)}>Close</button><h2>{name}</h2>{photo && <NativeImage source={photo.asset} resizeMode="cover" style={{ width: '100%', height: 240, borderRadius: 14 }} />}<p>{entry?.description || `${name} is listed in this destination's local travel guide. Confirm visiting details locally.`}</p>{entry?.location && <p><strong>Where to find it</strong><br />{entry.location}</p>}</section></div>}

  </article>;
}

const destinationPhotoGuides = {
  dagupan: { photos: dagupanPhotos, filePrefix: 'Dagupan' },
  alaminos: { photos: alaminosPhotos, filePrefix: 'Alaminos' },
  'san-carlos': { photos: sanCarlosPhotos, filePrefix: 'San_Carlos' },
  urdaneta: { photos: urdanetaPhotos, filePrefix: 'Urdaneta' },
};

function DestinationGallery({ title, names, Icon, photos, entries = [] }) {
  photos = { ...photos };
  entries.forEach(entry => { if (entry.photo) photos[entry.name] = { asset: { uri: entry.photo }, alt: entry.name }; });
  const illustrated = names.filter((name) => photos[name]);
  const remaining = names.filter((name) => !photos[name]);
  return <section className="aip-discovery-section">
    <h3 className="aip-heading-sm">{title}</h3>
    <div className="aip-discovery-grid">{illustrated.map((name) => <DestinationCard key={name} name={name} Icon={Icon} photo={photos[name]} entry={entries.find(entry => entry.name === name)} />)}</div>
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

function Chip({ selected, onClick, children, disabled = false }) {
  return (
    <button type="button" className={`aip-chip ${selected ? "is-selected" : ""}`} disabled={disabled} aria-pressed={selected} onClick={onClick}>
      {children}
    </button>
  );
}

const EXPERIENCE_DETAILS = {
  "Beach & Sea": { Icon: Waves, detail: "Coastal escapes", tone: "blue" },
  "Nature": { Icon: Wind, detail: "Fresh air & green views", tone: "green" },
  "Waterfalls": { Icon: Waves, detail: "Cascades & cool waters", tone: "blue" },
  "Adventure": { Icon: Compass, detail: "An active getaway", tone: "coral" },
  "Relaxing": { Icon: BedDouble, detail: "Take it slow", tone: "green" },
  "Pilgrimage": { Icon: Home, detail: "Faith & reflection", tone: "gold" },
  "History & Culture": { Icon: Building2, detail: "Stories & local heritage", tone: "gold" },
  "Food Trip": { Icon: Utensils, detail: "Taste local favorites", tone: "coral" },
  "Farm Experience": { Icon: Wind, detail: "Countryside discoveries", tone: "green" },
  "Scenic / Photography": { Icon: Eye, detail: "Views worth capturing", tone: "blue" },
  "Shopping & Pasalubong": { Icon: ShoppingBag, detail: "Bring something home", tone: "coral" },
  "Festivals & Events": { Icon: Sparkles, detail: "Local celebrations", tone: "gold" },
  "Swimming": { Icon: Waves, detail: "A refreshing dip", tone: "blue" },
  "Boating": { Icon: Compass, detail: "Explore from the water", tone: "blue" },
  "Farm Visit": { Icon: Wind, detail: "Discover rural life", tone: "green" },
  "Beach Relaxation": { Icon: Waves, detail: "Unwind by the shore", tone: "blue" },
  "Outdoor Exploration": { Icon: Compass, detail: "Head into the outdoors", tone: "green" },
  "Photography": { Icon: Eye, detail: "Capture your favorites", tone: "gold" },
  "Local Food": { Icon: Utensils, detail: "Try regional flavors", tone: "coral" },
  "Church / Pilgrimage": { Icon: Home, detail: "Visit sacred landmarks", tone: "gold" },
  "Resort / Staycation": { Icon: BedDouble, detail: "Rest & recharge", tone: "green" },
};

function MultiSelectField({ label, options, values, onChange, error }) {
  const [open, setOpen] = useState(false);
  return (
    <fieldset className="aip-experience-field">
      <legend className="aip-label">{label}</legend>
      <div className="aip-experience-heading">
        <p>Choose up to 3 favorites to shape your itinerary.</p>
        <span className={`aip-experience-count ${values.length ? "has-selection" : ""}`}>{values.length} / 3 selected</span>
      </div>
      <button type="button" className="aip-select-trigger aip-experience-trigger" aria-label={label} aria-expanded={open} onClick={() => setOpen(value => !value)}>
        <span className={values.length ? "" : "aip-placeholder"}>{values.length ? values.join(", ") : "Click to choose your favorites"}</span>
        <ChevronDown size={18} style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {error && <p className="aip-error" role="alert">{error}</p>}
      {open && <>
      <div className="aip-experience-grid">
        {options.map(option => {
          const selected = values.includes(option);
          const disabled = !selected && values.length >= 3;
          const { Icon, detail, tone } = EXPERIENCE_DETAILS[option];
          return (
            <button type="button" key={option}
              className={`aip-experience-card ${selected ? "is-selected" : ""}`}
              data-tone={tone} aria-pressed={selected} disabled={disabled}
              onClick={() => onChange(toggleValue(values, option))}>
              <span className="aip-experience-icon"><Icon size={21} /></span>
              <span className="aip-experience-copy"><strong>{option}</strong><span>{detail}</span></span>
              <span className="aip-experience-check" aria-hidden="true">{selected && <Check size={13} color="#fff" />}</span>
            </button>
          );
        })}
      </div>
      {values.length === 3 && <p className="aip-experience-limit" role="status">All 3 choices selected. Deselect one to try another.</p>}
      <div className="aip-experience-footer"><button type="button" className="aip-btn aip-btn-dark aip-btn-sm" onClick={() => setOpen(false)}>Done</button></div>
      </>}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
const todayInManila = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
const BUDGET_PACKAGES = [
  { id: "economy", min: 200, max: 500, rate: 500, label: "Economy", Icon: PiggyBank, color: "#246B73" },
  { id: "budget", min: 500, max: 1000, rate: 1000, label: "Budget", Icon: Wallet, color: colors.palmGreen },
  { id: "standard", min: 1000, max: 2000, rate: 2000, label: "Standard", Icon: Star, color: colors.oceanBlue },
  { id: "comfortable", min: 2000, max: 4000, rate: 4000, label: "Comfortable", Icon: TrendingUp, color: "#946516" },
  { id: "premium", min: 4000, max: null, rate: 4000, label: "Premium", Icon: Zap, color: "#B7472B" },
];
const initialForm = () => ({
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

export default function AIItinerary({ navigation }) {
  const { palette, themeColor } = useAppTheme();
  const { width } = useWindowDimensions();
  const contentWidth = width >= 768 ? width - 280 : width;
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
      requestAnimationFrame(() => document.querySelector(".aip-error")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return false;
    }
    setError('');
    setFieldErrors({});
    return true;
  };
  const fieldError = key => fieldErrors[key] && <p className="aip-error" role="alert">{fieldErrors[key]}</p>;
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
      setNotice("Your itinerary was created successfully. You can save it or download a PDF.");
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
      navigation.navigate("MyTrips", { successMessage: "Your itinerary was saved successfully." });
    } catch (err) { setError(itineraryFailureMessage(err, "Your plan could not be saved. Please try again.")); }
    finally { setSaving(false); }
  };

  /* -------------------------- render -------------------------- */
  return (
    <div className="aip-shell">
      <style>{plannerCSS(palette, themeColor)}</style>

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
          {notice && <p className="aip-success" role="status">{notice}</p>}
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
                    <label className="aip-label" htmlFor="aip-destination">Where in Pangasinan?</label>
                    <AreaDropdown areas={AREAS} value={form.areaId} invalid={!!fieldErrors.areaId} onChange={value => set("areaId", value)} />
                    <p className="aip-destination-hint">4 cities and 44 municipalities</p>
                    {fieldError("areaId")}
                  </div>

                  <MultiSelectField label="What kind of trip do you want?" error={fieldErrors.tripTypes} options={TRIP_TYPES} values={form.tripTypes} onChange={(v) => set("tripTypes", v)} />
                  <MultiSelectField label="What activities do you want?" error={fieldErrors.activities} options={ACTIVITIES} values={form.activities} onChange={(v) => set("activities", v)} />

                  <div className="aip-field">
                    <label className="aip-label">Who are you traveling with?</label>
                    {fieldError("travelerType")}
                    <div className="aip-icon-grid">
                      {TRAVELER_TYPES.map(({ id, label, Icon }) => (
                        <button type="button" key={id} className={`aip-icon-card ${form.travelerType === id ? "is-selected" : ""}`} onClick={() => set("travelerType", id)}>
                          <Icon size={20} /><span>{label}</span>
                        </button>
                      ))}
                    </div>
                    {fieldError("travelerType")}
                  </div>

                  <div className="aip-field">
                    <label className="aip-label">What's your travel style?</label>
                    {fieldError("travelStyle")}
                    <div className="aip-style-grid">
                      {TRAVEL_STYLES.map(({ id, label, desc, Icon }) => (
                        <button type="button" key={id} className={`aip-style-card ${form.travelStyle === id ? "is-selected" : ""}`} onClick={() => set("travelStyle", id)}>
                          <Icon size={18} /><strong>{label}</strong><span>{desc}</span>
                        </button>
                      ))}
                    </div>
                    {fieldError("travelStyle")}
                  </div>

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
                      <div className="aip-field"><label className="aip-label">Travelers</label><input type="number" min={1} step={1} className="aip-input" value={form.travelers} max={30} required onChange={(e) => set("travelers", e.target.value)} />{fieldError("travelers")}</div>
                      <div className="aip-field">
                        <label className="aip-label" htmlFor="aip-trip-days">How many days?</label>
                        <select id="aip-trip-days" className="aip-select" value={form.days} onChange={(e) => set("days", Number(e.target.value))}>
                          {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} day{n === 1 ? "" : "s"}</option>)}
                        </select>
                        {fieldError("days")}
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
                        return <button type="button" key={tier.id} aria-pressed={budgetTier === tier.id} className={`aip-budget-card ${budgetTier === tier.id ? "is-selected" : ""}`} style={{ "--tier-color": tier.color, "--tier-tint": `${tier.color}0D`, "--tier-border": `${tier.color}40`, "--tier-icon-bg": `${tier.color}18` }} onClick={() => chooseBudget(tier)}>
                          <span className="aip-budget-icon"><Icon size={18} /></span>
                          <strong>{tier.label}</strong>
                          <span className="aip-budget-range">{peso(tier.min * multiplier)}{tier.max ? `–${peso(tier.max * multiplier)}` : "+"}</span>
                          <span className="aip-budget-person">{peso(tier.min)}{tier.max ? `–${peso(tier.max)}` : "+"}<br />/ person / day</span>
                        </button>;
                      })}
                    </div>
                    <div className="aip-budget-summary" aria-live="polite">
                      <span>Selected tier</span>
                      <strong>{selectedBudget ? `${selectedBudget.label} - ${selectedBudget.max ? "Budget cap" : "Starting budget"}: ${peso(form.budget)}` : "Choose a budget above"}</strong>
                    </div>
                    {fieldError("budget")}
                  </div>

                  <div className="aip-card">
                    <div className="aip-row-between">
                      <h2 className="aip-heading">Where will you stay?</h2>
                      {lodging && <span className="aip-pill aip-pill-tan">{lodging.tier}</span>}
                    </div>
                    <p className="aip-subtitle">Hotels and accommodations in {area?.name || "your destination"}</p>
                    <div className="aip-hotel-budget-panel">
                      <label className="aip-label" htmlFor="aip-hotel-rooms">Rooms needed</label>
                      <input id="aip-hotel-rooms" className="aip-input" type="number" min={1} step={1} value={hotelRooms} max={30} disabled={!form.lodgingId} onChange={(e) => setHotelRooms(e.target.value)} />
                      {fieldError("hotelRooms")}
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

                    <button type="button" className={`aip-lodging-row ${form.lodgingId === null ? "is-selected" : ""}`} onClick={() => set("lodgingId", null)}>
                      <Bus size={18} />
                      <div><strong>{Number(form.days) === 1 ? "Day trip - no lodging" : "No lodging - I will arrange my own stay"}</strong><div className="aip-muted aip-small">Choose this to continue without a hotel allowance</div></div>
                    </button>

                    {fieldError("lodgingId")}
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
                      <DestinationGallery title="Famous places nearby" names={info.famousPlaces} Icon={MapPin} photos={destinationPhotoGuides[area.id]?.photos || {}} entries={info.entries.filter(e => e.tag === 'Attraction')} />
                      <DestinationGallery title="Foods to try" names={info.foods} Icon={Utensils} photos={destinationPhotoGuides[area.id]?.photos || {}} entries={info.entries.filter(e => e.tag === 'Food')} />

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
                        <div className="aip-field"><label className="aip-label">Start time (HH:MM)</label><input type="time" className="aip-input" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />{fieldError("startTime")}</div>
                        <div className="aip-field"><label className="aip-label" htmlFor="aip-meals">Meals per person per day (PHP)</label><select id="aip-meals" className="aip-select" value={form.mealBudget} onChange={(e) => set("mealBudget", e.target.value)}>{[200, 300, 500, 750, 1000, 1500].map((amount) => <option key={amount} value={amount}>{peso(amount)} / person / day</option>)}</select>{fieldError("mealBudget")}</div>
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
                      {fieldError("transportModes")}
                      <ItineraryFareInputs errors={fieldErrors} modes={form.transportModes} tables={fareTables} values={form.fareInputs} onChange={value => set('fareInputs', value)} areaId={form.areaId} date={form.date} travelers={Number(form.travelers)} />
                    </div>
                  )}

                  <div className="aip-step-actions">
                    <button className="aip-btn aip-btn-outline" onClick={goBack}>← Back</button>
                    <button className="aip-btn aip-btn-gradient" disabled={!!phase || !catalog.length} onClick={generate}><Zap size={16} />{phase ? `Generating… ${elapsed}s` : 'Generate my itinerary'}</button>
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
/*  Stylesheet — mirrors the Figma tokens (Ocean Blue / Sunset Coral /  */
/*  Palm Green / Warm Sand / Seafoam / Golden, Playfair + DM Sans +     */
/*  JetBrains Mono)                                                     */
/* ------------------------------------------------------------------ */
function plannerCSS(palette, themeColor) {
  const colors = {
    oceanBlue: palette.ink, oceanBlueDark: palette.primary,
    sunsetCoral: palette.accent, palmGreen: palette.brand,
    warmSand: palette.paper, seafoam: palette.tint, golden: palette.accent,
    ink: palette.ink, border: palette.line, muted: palette.muted, page: palette.background,
  };
  const css = `
.aip-success { padding:12px 16px; border-radius:10px; color:#246346; background:#EAF5EE; font-size:14px; }.aip-chip:disabled { opacity:.45; cursor:not-allowed; }
.aip-description-backdrop { position:fixed; inset:0; z-index:1000; background:rgba(12,39,64,.6); display:flex; align-items:center; justify-content:center; padding:24px; }
.aip-description-card { background:white; border-radius:20px; padding:24px; width:100%; max-width:540px; max-height:85vh; overflow:auto; box-shadow:0 24px 70px #0003; }
.aip-description-card > button { float:right; }.aip-description-card h2 { padding-right:90px; }.aip-description-card p { line-height:1.75; color:#5C6D7A; white-space:pre-wrap; }

@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;600&display=swap');

.aip-shell, .aip-shell * { box-sizing: border-box; }
.aip-shell { display: flex; flex: 1; height: 100%; min-height: 0; overflow-y: auto; overflow-x: hidden; background: ${colors.page}; font-family: ${fonts.body}; font-size: 16px; line-height: 1.5; color: ${colors.ink}; }
.aip-shell svg { flex-shrink: 0; }
.aip-shell button, .aip-shell input, .aip-shell select { font-family: inherit; }
.aip-shell button { overflow-wrap: anywhere; }
.aip-shell button:focus-visible, .aip-shell input:focus-visible, .aip-shell select:focus-visible { outline: 3px solid ${colors.seafoam}; outline-offset: 3px; }

.aip-main { flex: 1; flex-shrink: 0; width: 100%; display: flex; flex-direction: column; min-width: 0; }
.aip-tool-header { position: relative; flex-shrink: 0; margin-bottom: 32px; }

.aip-content { flex-shrink: 0; max-width: 1200px; width: 100%; margin: 0 auto; padding: clamp(16px, 3vw, 36px) clamp(16px, 3vw, 40px) 60px; }
.aip-progress-header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 8px 20px; margin-bottom: 12px; }
.aip-step-title { font-family: ${fonts.display}; font-size: 20px; font-weight: 700; color: ${colors.oceanBlue}; }
.aip-progress-bars { display: flex; gap: 8px; margin-bottom: 28px; }
.aip-progress-bar { flex: 1; height: 6px; border-radius: 8px; background: ${colors.border}; }
.aip-progress-bar.is-active { background: ${colors.sunsetCoral}; }

.aip-card { background: #fff; border: 1px solid ${colors.border}; border-radius: 16px; padding: clamp(20px, 3vw, 36px); margin-bottom: 24px; min-width: 0; }
.aip-heading { font-family: ${fonts.display}; font-size: clamp(22px, 2.5vw, 28px); margin: 0 0 10px; color: ${colors.oceanBlue}; }
.aip-heading-sm { font-family: ${fonts.display}; font-size: 18px; margin: 0 0 12px; color: ${colors.oceanBlue}; }
.aip-subtitle { color: ${colors.muted}; font-size: 16px; line-height: 1.6; margin: 0 0 28px; }

.aip-field { min-width: 0; margin-bottom: 28px; }
.aip-field-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 24px; margin-bottom: 28px; }
.aip-field-row .aip-field { margin-bottom: 0; }
.aip-label { display: block; font-size: 15px; font-weight: 600; color: ${colors.oceanBlue}; margin-bottom: 10px; }
.aip-input, .aip-select, .aip-destination-select { position: relative; display: flex; align-items: center; border: 1px solid #D8E3E6; border-radius: 15px; background: #fff; box-shadow: 0 3px 12px #123A5E05; transition: border-color .15s, box-shadow .15s; }
.aip-destination-select:hover { border-color: #88AAA9; }
.aip-destination-select:focus-within { border-color: ${colors.oceanBlue}; box-shadow: 0 0 0 3px #123A5E18; }
.aip-destination-select.has-selection { border-color: #9DBDB0; background: #F8FCFA; }
.aip-destination-select.has-error { border-color: ${colors.sunsetCoral}; }
.aip-destination-icon { position: absolute; left: 14px; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; background: #EAF3EF; color: ${colors.palmGreen}; pointer-events: none; }
.aip-destination-select .aip-select { appearance: none; border: 0; border-radius: 15px; background: transparent; min-height: 64px; padding: 18px 46px 18px 64px; color: ${colors.oceanBlue}; font-size: 15px; font-weight: 600; cursor: pointer; outline: none; }
.aip-destination-select:not(.has-selection) .aip-select { color: #71838F; font-weight: 400; }
.aip-destination-select option { background: #fff; color: ${colors.ink}; }
.aip-destination-chevron { position: absolute; right: 17px; pointer-events: none; color: #71838F; }
.aip-destination-hint { margin: 9px 2px 0; color: #71838F; font-size: 12px; }
.aip-select-trigger {
  width: 100%; min-width: 0; max-width: 100%; min-height: 52px; padding: 14px 16px; border-radius: 10px; border: 1px solid ${colors.border};
  font-family: ${fonts.body}; font-size: 16px; background: #fff; color: ${colors.ink};
}
.aip-select-trigger { gap: 12px; text-align: left; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.aip-select-trigger > span { min-width: 0; overflow-wrap: anywhere; }
.aip-placeholder { color: ${colors.muted}; }

.aip-experience-field { min-width: 0; padding: 18px; margin: 0 0 28px; border: 1px solid #E3E9E5; border-radius: 20px; background: transparent; }
.aip-experience-field legend { padding: 0 8px; margin-bottom: 0; }
.aip-experience-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 16px; }
.aip-experience-heading p { margin: 0; font-size: 13px; color: #607482; }
.aip-experience-count { padding: 5px 10px; border-radius: 999px; background: #E9EEED; color: #607482; font-size: 12px; font-weight: 700; white-space: nowrap; }
.aip-experience-count.has-selection { background: #DDEEE6; color: ${colors.palmGreen}; }
.aip-experience-trigger { margin-bottom: 12px; }
.aip-experience-trigger:focus-visible { outline: 3px solid ${colors.oceanBlue}; outline-offset: 3px; }
.aip-experience-footer { display: flex; justify-content: flex-end; margin-top: 14px; }
.aip-experience-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr)); gap: 10px; }
.aip-experience-card { --experience-color: #236789; --experience-tint: #E6F2F8; position: relative; display: flex; align-items: center; gap: 11px; min-width: 0; min-height: 88px; padding: 14px 12px; border: 1px solid #E1E8E7; border-radius: 15px; background: #fff; color: ${colors.ink}; text-align: left; cursor: pointer; box-shadow: 0 2px 5px #16324A04; transition: border-color .15s, box-shadow .15s, background .15s; }
.aip-experience-card[data-tone="green"] { --experience-color: #2E7D5B; --experience-tint: #E7F3EC; }
.aip-experience-card[data-tone="coral"] { --experience-color: #BA5136; --experience-tint: #FCEDE7; }
.aip-experience-card[data-tone="gold"] { --experience-color: #906719; --experience-tint: #FAF1DB; }
.aip-experience-card:hover:not(:disabled) { border-color: var(--experience-color); box-shadow: 0 4px 12px #16324A0C; }
.aip-experience-card:focus-visible { outline: 3px solid ${colors.oceanBlue}; outline-offset: 3px; }
.aip-experience-card.is-selected { background: var(--experience-tint); border-color: var(--experience-color); box-shadow: inset 0 0 0 1px var(--experience-color); }
.aip-experience-card:disabled { opacity: .48; cursor: not-allowed; }
.aip-experience-icon { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; flex-shrink: 0; border-radius: 12px; background: var(--experience-tint); color: var(--experience-color); }
.aip-experience-card.is-selected .aip-experience-icon { background: #FFFFFFB3; }
.aip-experience-copy { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 4px; }
.aip-experience-copy strong { font-size: 13px; line-height: 1.35; }
.aip-experience-copy > span { font-size: 11px; line-height: 1.4; color: #607482; }
.aip-experience-check { width: 18px; height: 18px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid #CDD8DB; border-radius: 6px; background: #fff; }
.aip-experience-card.is-selected .aip-experience-check { background: var(--experience-color); border-color: var(--experience-color); }
.aip-experience-limit { margin: 12px 0 0; color: #607482; font-size: 12px; }
.aip-chip-row { display: flex; flex-wrap: wrap; gap: 10px; }
.aip-chip {
  border: 1px solid ${colors.border}; background: #fff; border-radius: 22px; min-height: 44px; max-width: 100%; padding: 10px 16px;
  font-size: 15px; cursor: pointer; color: ${colors.ink};
}
.aip-chip.is-selected { background: ${colors.oceanBlue}; border-color: ${colors.oceanBlue}; color: #fff; }

.aip-icon-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 110px), 1fr)); gap: 14px; }
.aip-icon-card { display: flex; flex-direction: column; align-items: center; gap: 12px; min-height: 100px; padding: 20px 12px; border-radius: 12px; border: 1px solid ${colors.border}; background: #fff; cursor: pointer; font-size: 16px; font-weight: 600; }
.aip-icon-card.is-selected { border-color: ${colors.oceanBlue}; background: ${colors.warmSand}; }

.aip-style-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr)); gap: 16px; }
.aip-style-card { text-align: left; display: flex; flex-direction: column; gap: 10px; min-height: 136px; padding: 22px; border-radius: 12px; border: 1px solid ${colors.border}; background: #fff; cursor: pointer; }
.aip-style-card strong { font-size: 17px; }
.aip-style-card span { font-size: 14px; color: ${colors.muted}; }
.aip-style-card.is-selected { background: ${colors.oceanBlue}; border-color: ${colors.oceanBlue}; color: #fff; }
.aip-style-card.is-selected span { color: #C9D6E3; }

.aip-error { color: ${colors.sunsetCoral}; font-size: 13px; margin: 4px 0 14px; }
.aip-budget-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; color: #70868E; font-size: 14px; font-weight: 600; margin: 28px 0 14px; }
.aip-budget-heading > span:last-child { font-size: 12px; font-weight: 400; }
.aip-budget-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.aip-budget-card { display: flex; flex-direction: column; align-items: flex-start; gap: 7px; padding: 16px 12px; border: 1px solid var(--tier-border); border-radius: 20px; background: var(--tier-tint); color: ${colors.ink}; text-align: left; cursor: pointer; min-width: 0; transition: background .15s, border-color .15s; }
.aip-budget-card:hover { border-color: var(--tier-color); background: var(--tier-icon-bg); }
.aip-budget-card > strong { font-size: 13px; }
.aip-budget-icon { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--tier-icon-bg); color: var(--tier-color); margin-bottom: 4px; }
.aip-budget-range { font-family: ${fonts.mono}; font-size: 11px; font-weight: 600; color: var(--tier-color); }
.aip-budget-person { font-size: 11px; line-height: 1.5; color: #70868E; }
.aip-budget-card.is-selected { background: var(--tier-color); border-color: var(--tier-color); color: #fff; box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--tier-color); }
.aip-budget-card.is-selected .aip-budget-icon { color: #fff; background: #FFFFFF20; }
.aip-budget-card.is-selected .aip-budget-range, .aip-budget-card.is-selected .aip-budget-person { color: #fff; }
.aip-budget-summary { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; padding: 12px 14px; margin-top: 14px; border-radius: 18px; background: #F7F9FA; font-size: 13px; }
.aip-budget-summary > span { color: #70868E; }
.aip-budget-summary strong > span { padding: 0 8px; color: #70868E; }
@media (max-width: 1100px) { .aip-budget-grid { grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)); } }
@media (max-width: 480px) { .aip-budget-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

.aip-btn { min-height: 48px; border-radius: 10px; padding: 14px 22px; font-size: 16px; font-weight: 600; cursor: pointer; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.aip-btn-block { width: 100%; margin-top: 6px; }
.aip-btn-sm { padding: 6px 14px; font-size: 13px; }
.aip-btn-dark { background: ${colors.oceanBlue}; color: #fff; }
.aip-btn-disabled { background: ${colors.border}; color: ${colors.muted}; cursor: not-allowed; }
.aip-btn-outline { background: #fff; border: 1px solid ${colors.border}; color: ${colors.ink}; }
.aip-btn-outline-coral { background: #fff; border: 1px solid ${colors.sunsetCoral}; color: ${colors.sunsetCoral}; }
.aip-btn-primary { background: #3450E0; color: #fff; }
.aip-btn-gradient { background: linear-gradient(90deg, ${colors.oceanBlueDark}, ${colors.sunsetCoral}); color: #fff; }

.aip-step-actions { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; margin-top: 28px; }
.aip-step-actions .aip-btn { flex: 1 1 220px; }
.aip-row-between { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px; }

.aip-lodging-row { width: 100%; display: flex; gap: 12px; align-items: flex-start; font-size: 16px; line-height: 1.5; color: ${colors.ink}; text-align: left; padding: 20px; border-radius: 12px; border: 1px solid ${colors.border}; background: #fff; margin-bottom: 10px; cursor: pointer; }
.aip-lodging-row.is-selected { border-color: ${colors.oceanBlue}; background: ${colors.warmSand}; }
.aip-lodging-info { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.aip-amenities { display: flex; gap: 10px; flex-wrap: wrap; font-size: 14px; color: ${colors.muted}; margin: 10px 0; }
.aip-amenity { display: inline-flex; align-items: center; gap: 4px; }
.aip-price { font-family: ${fonts.mono}; color: ${colors.sunsetCoral}; font-weight: 700; }
.aip-check { color: ${colors.oceanBlue}; }
.aip-hotel-budget-panel { background: ${colors.page}; border: 1px solid ${colors.border}; border-radius: 12px; padding: 16px; margin-bottom: 18px; }
.aip-hotel-budget-panel input { max-width: 120px; }
.aip-hotel-budget-panel p { font-size: 13px; line-height: 1.6; }
.aip-hotel-budget { display: flex; align-items: flex-start; gap: 7px; font-size: 12px; padding: 10px; border-radius: 8px; background: #EDF3F4; margin: 12px 0 0; }
.aip-hotel-budget.over { color: #A43724; background: #FFF0EB; }
.aip-hotel-budget.possible { color: #795416; background: #FFF6E3; }
.aip-hotel-budget.within { color: ${colors.palmGreen}; background: #EDF6F0; }
.aip-stay-card { border: 1px solid ${colors.border}; border-radius: 14px; margin-bottom: 14px; background: #fff; overflow: hidden; }
.aip-stay-card.is-selected { border-color: ${colors.oceanBlue}; background: #F5F9FA; box-shadow: inset 3px 0 ${colors.oceanBlue}; }
.aip-stay-select { display: flex; align-items: center; gap: 14px; width: 100%; padding: 20px 20px 12px; border: 0; background: transparent; color: ${colors.ink}; text-align: left; cursor: pointer; }
.aip-stay-select:disabled { cursor: not-allowed; opacity: .65; }
.aip-stay-select:focus-visible { outline-offset: -4px; }
.aip-stay-icon { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; flex-shrink: 0; background: #EDF3F4; color: ${colors.oceanBlue}; border-radius: 12px; }
.aip-stay-title { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.aip-stay-title strong { font-size: 17px; }
.aip-stay-tier { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px; background: ${colors.warmSand}; }
.aip-stay-radio { width: 22px; height: 22px; flex-shrink: 0; border: 1.5px solid #A7B6C0; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.aip-stay-radio.is-selected { background: ${colors.oceanBlue}; border-color: ${colors.oceanBlue}; }
.aip-stay-body { padding: 0 20px 16px; }
.aip-stay-location { display: flex; align-items: flex-start; gap: 7px; color: #5C6D7A; font-size: 12px; overflow-wrap: anywhere; }
.aip-stay-location svg { margin-top: 2px; }
.aip-stay-amenities { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
.aip-stay-amenity { display: inline-flex; align-items: center; gap: 7px; padding: 6px 10px; border-radius: 7px; background: #F0F4F5; color: #3C5668; font-size: 12px; }
.aip-stay-bottom { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px; }
.aip-stay-rate strong { font-size: 19px; font-weight: 700; color: ${colors.oceanBlue}; }
.aip-stay-rate > span { color: #5C6D7A; font-size: 12px; }
.aip-stay-selected { display: inline-flex; align-items: center; gap: 4px; color: ${colors.palmGreen}; font-size: 12px; font-weight: 600; }
.aip-stay-note { font-size: 12px; color: #79542A; margin: 10px 0 0; }
.aip-stay-details { border-top: 1px solid ${colors.border}; }
.aip-stay-details summary { display: flex; align-items: center; gap: 7px; padding: 12px 20px; min-height: 44px; cursor: pointer; color: ${colors.oceanBlue}; font-size: 12px; font-weight: 600; list-style: none; }
.aip-stay-details summary::-webkit-details-marker { display: none; }
.aip-stay-details summary > svg:last-child { margin-left: auto; }
.aip-stay-details summary:focus-visible { outline: 3px solid ${colors.seafoam}; outline-offset: -3px; }
.aip-stay-hide, .aip-stay-details[open] .aip-stay-show { display: none; }
.aip-stay-details[open] .aip-stay-hide { display: inline; }
.aip-stay-details[open] summary > svg:last-child { transform: rotate(180deg); }
.aip-stay-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 20px; padding: 8px 20px 20px; }
.aip-stay-fact { display: flex; align-items: flex-start; gap: 10px; min-width: 0; color: #5C6D7A; }
.aip-stay-fact > svg { margin-top: 3px; }
.aip-stay-fact > div { min-width: 0; }
.aip-stay-fact span { font-size: 11px; font-weight: 700; color: ${colors.oceanBlue}; }
.aip-stay-fact p { font-size: 13px; margin: 3px 0 0; overflow-wrap: anywhere; }
.aip-stay-times { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

.aip-info-box { background: ${colors.warmSand}; border-radius: 12px; padding: 24px; margin-bottom: 24px; font-size: 16px; overflow-wrap: anywhere; }
.aip-info-label { font-size: 13px; letter-spacing: .04em; color: ${colors.muted}; margin: 10px 0 4px; }
.aip-review-destination { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; color: ${colors.oceanBlue}; }
.aip-discovery-section { margin-bottom: 28px; }
.aip-more-discoveries { margin-top: 14px; font-size: 12px; color: #5C6D7A; }
.aip-more-discoveries summary { cursor: pointer; padding: 8px 0; color: ${colors.oceanBlue}; }
.aip-discovery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr)); gap: 16px; }
.aip-discovery-card { border: 1px solid ${colors.border}; border-radius: 14px; overflow: hidden; background: #fff; }
.aip-discovery-image { height: 155px; background: ${colors.warmSand}; }
.aip-discovery-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
.aip-photo-placeholder { height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 8px; color: #657B88; font-size: 12px; }
.aip-discovery-caption { display: flex; gap: 8px; padding: 14px; height: 88px; align-items: flex-start; }
.aip-discovery-caption h4 { margin: 0; font-size: 13px; line-height: 1.5; }
.aip-photo-credits { font-size: 11px; color: #5C6D7A; margin-bottom: 24px; }
.aip-photo-credits summary { cursor: pointer; padding: 8px 0; }
.aip-photo-credits a { color: ${colors.oceanBlue}; }
.aip-meal-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 16px; background: #F3F7F7; padding: 20px; border-radius: 12px; margin-bottom: 24px; }
.aip-meal-summary > div { display: flex; flex-direction: column; gap: 6px; }
.aip-meal-summary span, .aip-meal-summary small, .aip-meal-note { font-size: 12px; color: #5C6D7A; }
.aip-meal-summary strong { font-size: 21px; }
.aip-summary-chips { margin-bottom: 18px; }
.aip-summary-chip { background: ${colors.warmSand}; border-radius: 16px; padding: 10px 14px; font-size: 14px; max-width: 100%; overflow-wrap: anywhere; }

.aip-advanced { border-top: 1px solid ${colors.border}; padding-top: 28px; margin-top: 24px; margin-bottom: 28px; }
.aip-advanced > .aip-chip-row { margin-bottom: 28px; }

.aip-generating { display: flex; align-items: center; gap: 12px; }
.aip-spinner { width: 18px; height: 18px; border: 2px solid ${colors.border}; border-top-color: ${colors.sunsetCoral}; border-radius: 50%; animation: aip-spin 0.8s linear infinite; }
@keyframes aip-spin { to { transform: rotate(360deg); } }

.aip-result-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: 20px; }
.aip-timeline { display: flex; flex-direction: column; gap: 12px; }
.aip-stop-row { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid ${colors.border}; border-radius: 12px; padding: 12px 16px; }
.aip-stop-time { width: 70px; font-family: ${fonts.mono}; font-size: 12px; color: ${colors.muted}; flex-shrink: 0; }
.aip-stop-icon { width: 34px; height: 34px; border-radius: 50%; background: ${colors.warmSand}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.aip-stop-body { flex: 1; min-width: 0; }
.aip-stop-tags { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.aip-day-divider { font-size: 14px; color: ${colors.muted}; margin: 10px 0; }
.aip-pill { border-radius: 20px; padding: 4px 10px; font-size: 12px; font-weight: 600; }
.aip-pill-dark { background: ${colors.oceanBlueDark}; color: #fff; }
.aip-pill-green { background: rgba(46,125,91,0.15); color: ${colors.palmGreen}; }
.aip-pill-tan { background: ${colors.warmSand}; color: ${colors.ink}; }

.aip-side-col { display: flex; flex-direction: column; gap: 16px; }
.aip-summary-row { padding: 6px 0; border-bottom: 1px solid ${colors.border}; }
.aip-breakdown-row { margin-bottom: 12px; }
.aip-progress { height: 6px; border-radius: 6px; background: ${colors.border}; overflow: hidden; margin-top: 4px; }
.aip-progress-fill { height: 100%; background: ${colors.sunsetCoral}; border-radius: 6px; }
.aip-total-row { border-top: 1px solid ${colors.border}; padding-top: 10px; margin-top: 4px; }

.aip-muted { color: ${colors.muted}; }
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

  return css.replace(/(background(?:-color)?|color|border(?:-(?:top|bottom|left|right))?(?:-color)?|outline)\s*:\s*([^;{}]+)/g, (declaration, property, value) => {
    const role = property.startsWith("background") ? "backgroundColor" : property.startsWith("border") || property === "outline" ? "borderColor" : "color";
    const themed = value.replace(/#[0-9a-f]{6}\b|#fff\b/gi, hex => hex.toLowerCase() === "#fff" && role === "backgroundColor" ? palette.surface : themeColor(hex, role));
    return `${property}: ${themed}`;
  }) + `
.aip-shell { color-scheme: ${palette.dark ? "dark" : "light"}; }
.aip-btn-coral, .aip-btn-primary, .aip-btn-gradient { background: ${palette.button}; color: ${palette.onButton}; }
.aip-btn-dark { background: ${palette.primary}; color: ${palette.onPrimary}; }
.aip-destination-select, .aip-input, .aip-select-trigger { border-color: ${palette.line}; }
.aip-destination-select.has-selection { background: ${palette.tint}; }
.aip-destination-select option, .aip-destination-select optgroup { background: ${palette.surface}; color: ${palette.ink}; }
.aip-destination-hint, .aip-destination-chevron, .aip-destination-select:not(.has-selection) .aip-select { color: ${palette.muted}; }

.aip-area-picker { width: 100%; min-width: 0; }
.aip-area-trigger { display: flex; align-items: center; gap: 14px; width: 100%; padding: 14px 16px; min-height: 72px; border: 1px solid ${palette.line}; border-radius: 16px; background: ${palette.surface}; color: ${palette.ink}; cursor: pointer; text-align: left; }
.aip-area-trigger:hover, .aip-area-trigger[aria-expanded="true"] { border-color: ${palette.brand}; }
.aip-area-trigger.has-error { border-color: ${palette.accent}; }
.aip-area-icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: ${palette.tint}; color: ${palette.ink}; flex-shrink: 0; }
.aip-area-copy { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.aip-area-copy small { font-size: 10px; letter-spacing: 1px; color: ${palette.muted}; }
.aip-area-copy strong { font-size: 15px; overflow-wrap: anywhere; }
.aip-area-panel { margin-top: 8px; padding: 10px; border: 1px solid ${palette.line}; border-radius: 16px; background: ${palette.surface}; box-shadow: 0 8px 24px #0000000a; }
.aip-area-search { width: 100%; min-width: 0; padding: 12px 14px; border: 1px solid ${palette.line}; border-radius: 10px; font-size: 14px; background: ${palette.background}; color: ${palette.ink}; }
.aip-area-options { max-height: 300px; overflow-y: auto; overscroll-behavior: contain; margin-top: 8px; }
.aip-area-options h3 { display: flex; justify-content: space-between; margin: 0; padding: 12px; font-size: 11px; letter-spacing: .8px; color: ${palette.muted}; }
.aip-area-option { display: flex; justify-content: space-between; align-items: center; gap: 12px; width: 100%; padding: 12px; border: 0; border-radius: 9px; background: transparent; color: ${palette.ink}; text-align: left; font-size: 14px; cursor: pointer; }
.aip-area-option:hover, .aip-area-option:focus-visible, .aip-area-option.is-selected { background: ${palette.tint}; }
.aip-area-empty { padding: 12px; color: ${palette.muted}; font-size: 14px; }
`;
}
