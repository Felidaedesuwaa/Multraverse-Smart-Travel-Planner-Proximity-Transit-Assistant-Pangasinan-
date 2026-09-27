import { useEffect, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";
import AIToolHeader from "../components/AIToolHeader";
import fareReference from "../../server/src/data/pangasinanFares.json";
import {
  Home, MapPin, Download as DownloadIcon,
  Sparkles, ChevronDown, ChevronRight, Check,
  Clock, Activity, Zap, User, Users, Star, Globe, Bus, Wifi, Wind, Waves,
  Eye, BedDouble, Camera, Utensils, Compass, ShoppingBag,
  BookmarkPlus, Share2,
} from "lucide-react-native";

/* ------------------------------------------------------------------ */
/*  Design tokens — pulled from the Figma "DESIGN TOKENS" footer       */
/* ------------------------------------------------------------------ */
const colors = {
  oceanBlue: "#123A5E",
  oceanBlueDark: "#0C2740",
  sunsetCoral: "#E8613F",
  palmGreen: "#2E7D5B",
  warmSand: "#F6F1E7",
  seafoam: "#8FD1C7",
  golden: "#E7A93E",
  ink: "#16324A",
  border: "#E4E1D8",
  muted: "#8A8F98",
  page: "#FAF9F5",
};

const fonts = {
  display: '"Playfair Display", Georgia, serif',
  body: '"DM Sans", -apple-system, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

/* ------------------------------------------------------------------ */
/*  Static reference data (would come from the catalog API)            */
/* ------------------------------------------------------------------ */
const AREAS = [
  { id: "dagupan", name: "Dagupan", group: "Cities" },
  { id: "alaminos", name: "Alaminos", group: "Cities" },
  { id: "urdaneta", name: "Urdaneta", group: "Cities" },
  { id: "sancarlos", name: "San Carlos", group: "Cities" },
  { id: "bolinao", name: "Bolinao", group: "Municipalities" },
  { id: "lingayen", name: "Lingayen", group: "Municipalities" },
  { id: "manaoag", name: "Manaoag", group: "Municipalities" },
];

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
const PREFERENCES = ["Budget-friendly", "Island hopping", "Accessible routes", "Photography spots", "Cultural sites"];

const DESTINATION_INFO = {
  alaminos: {
    famousPlaces: ["Hundred Islands NP", "Governor Island", "Children's Island", "Isdaan Floating Restaurant"],
    foods: ["Fresh seafood", "Sinanglay na tilapia", "Buko pie", "Salted egg"],
  },
  dagupan: { famousPlaces: ["Bonuan Beach", "Dagupan Public Market"], foods: ["Bangus", "Pigar-pigar"] },
  urdaneta: { famousPlaces: ["Robinsons Place Urdaneta", "St. William Cathedral"], foods: ["Urdaneta longganisa"] },
  sancarlos: { famousPlaces: ["Baguio-Pangasinan lookout"], foods: ["Fresh produce"] },
  bolinao: { famousPlaces: ["Patar Beach", "Cape Bolinao Lighthouse"], foods: ["Grilled seafood"] },
  lingayen: { famousPlaces: ["Lingayen Gulf", "Capitol Building"], foods: ["Boneless bangus"] },
  manaoag: { famousPlaces: ["Our Lady of Manaoag Church"], foods: ["Puto", "Kalamay"] },
};

const LODGING_OPTIONS = {
  alaminos: [
    { id: "starview", name: "Star View Hotel", tier: "Budget", amenities: ["Wi-Fi", "A/C", "Restaurant"], price: 900 },
    { id: "hundredislands", name: "Hundred Islands Hotel", tier: "Mid-range", amenities: ["Wi-Fi", "A/C", "Pool", "Sea View"], price: 1500 },
    { id: "pensionpanamica", name: "Pension Panamica", tier: "Budget", amenities: ["Wi-Fi", "Fan room"], price: 600 },
  ],
};
const defaultLodging = (areaId) => LODGING_OPTIONS[areaId] || [
  { id: "generic1", name: "Local Inn", tier: "Budget", amenities: ["Wi-Fi", "Fan room"], price: 700 },
  { id: "generic2", name: "Town Hotel", tier: "Mid-range", amenities: ["Wi-Fi", "A/C"], price: 1300 },
];

const AMENITY_ICON = { "Wi-Fi": Wifi, "A/C": Wind, "Restaurant": Utensils, "Pool": Waves, "Sea View": Eye, "Fan room": BedDouble };
const TAG_COLOR = { Transit: colors.oceanBlue, Attraction: colors.sunsetCoral, Food: colors.palmGreen, Shopping: colors.golden, Lodging: colors.seafoam };

const toggleValue = (values, value) => values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
const peso = (n) => `₱${Number(n).toLocaleString()}`;

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */
function Chip({ selected, onClick, children }) {
  return (
    <button type="button" className={`aip-chip ${selected ? "is-selected" : ""}`} onClick={onClick}>
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
const initialForm = () => ({
  areaId: "",
  tripTypes: [],
  activities: [],
  travelerType: "couple",
  travelStyle: "balanced",
  date: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10),
  travelers: 2,
  budget: "3000",
  days: 1,
  lodgingId: null,
  startTime: "07:00",
  mealBudget: "300",
  transportModes: ["Bus", "Jeepney"],
  preferences: ["Island hopping"],
  returnToOrigin: true,
});

export default function AIItinerary() {
  const { width } = useWindowDimensions();
  const contentWidth = width >= 768 ? width - 280 : width;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [phase, setPhase] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [plan, setPlan] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef(null);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const area = AREAS.find((a) => a.id === form.areaId);
  const info = DESTINATION_INFO[form.areaId];
  const lodgingList = form.areaId ? defaultLodging(form.areaId) : [];
  const lodging = lodgingList.find((l) => l.id === form.lodgingId);

  useEffect(() => {
    if (!phase) return;
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const stepLabel = { 1: "Destination & preferences", 2: "Trip details & lodging", 3: "Review & personalize" }[step];

  const goNext = () => {
    if (step === 1 && !form.areaId) { setAttemptedNext(true); return; }
    setAttemptedNext(false);
    setStep((s) => Math.min(3, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  /* ---------------- itinerary generation (mocked) ------------------ */
  const buildAlaminosPlan = () => {
    const stops = [
      { time: "07:00", title: "Dagupan Bus Terminal", subtitle: "Bus to Alaminos", tag: "Transit", price: 95, Icon: Bus },
      { time: "09:15 AM", title: "Alaminos — Arrival", subtitle: "Arrive and orient with local guide", tag: "Transit", price: 0, Icon: MapPin },
      { time: "09:30 AM", title: "Hundred Islands NP", subtitle: "Morning exploration", tag: "Attraction", price: 80, Icon: Compass },
      { time: "11:00 AM", title: "Governor Island", subtitle: "Mid-morning activity", tag: "Attraction", price: 50, Icon: Camera },
      { time: "12:30 PM", title: "Local Restaurant", subtitle: "Fresh seafood · Sinanglay na tilapia", tag: "Food", price: 300, Icon: Utensils },
      { time: "02:00 PM", title: "Children's Island", subtitle: "Afternoon highlight", tag: "Attraction", price: 60, Icon: Compass },
      { time: "04:30 PM", title: "Pasalubong Center", subtitle: "Local products and souvenir shopping", tag: "Shopping", price: 200, Icon: ShoppingBag },
      { time: "06:00 PM", title: "Star View Hotel", subtitle: "Budget · ₱900/night × 1 night · Wi-Fi, A/C, Restaurant", tag: "Lodging", price: 900, Icon: Home },
      { time: "Next day", title: "Return Transit", subtitle: "Return bus to Dagupan", tag: "Transit", price: 95, Icon: Bus },
    ];
    const breakdown = { Transit: 190, Attraction: 190, Food: 300, Shopping: 200, Lodging: 900 };
    const estimated = Object.values(breakdown).reduce((a, b) => a + b, 0);
    return { stops, breakdown, estimated };
  };

  const buildGenericPlan = () => {
    const infoLocal = info || { famousPlaces: [], foods: [] };
    const stops = [
      { time: "07:00", title: `${AREAS.find((a) => a.id === "dagupan")?.name} Bus Terminal`, subtitle: `Bus to ${area?.name}`, tag: "Transit", price: 90, Icon: Bus },
      { time: "09:00 AM", title: `${area?.name} — Arrival`, subtitle: "Arrive and orient with local guide", tag: "Transit", price: 0, Icon: MapPin },
      ...(infoLocal.famousPlaces.slice(0, 2).map((p, i) => ({
        time: i === 0 ? "09:30 AM" : "11:00 AM", title: p, subtitle: i === 0 ? "Morning exploration" : "Mid-morning activity",
        tag: "Attraction", price: 50 + i * 20, Icon: Compass,
      }))),
      { time: "12:30 PM", title: "Local Restaurant", subtitle: infoLocal.foods.slice(0, 2).join(" · ") || "Local specialties", tag: "Food", price: Number(form.mealBudget) || 300, Icon: Utensils },
      ...(lodging ? [{ time: "06:00 PM", title: lodging.name, subtitle: `${lodging.tier} · ${peso(lodging.price)}/night × ${Math.max(1, form.days - 1) || 1} night · ${lodging.amenities.join(", ")}`, tag: "Lodging", price: lodging.price, Icon: Home }] : []),
      ...(form.returnToOrigin ? [{ time: "Next day", title: "Return Transit", subtitle: "Return bus to Dagupan", tag: "Transit", price: 90, Icon: Bus }] : []),
    ];
    const breakdown = stops.reduce((acc, s) => { acc[s.tag] = (acc[s.tag] || 0) + s.price; return acc; }, {});
    const estimated = Object.values(breakdown).reduce((a, b) => a + b, 0);
    return { stops, breakdown, estimated };
  };

  const generate = () => {
    setPhase("Planning your trip");
    setTimeout(() => {
      const built = form.areaId === "alaminos" ? buildAlaminosPlan() : buildGenericPlan();
      // The preview has no billed route distances or confirmed attraction fees.
      built.stops = built.stops.map(stop => ["Transit", "Attraction"].includes(stop.tag) ? { ...stop, price: null } : stop);
      built.breakdown = built.stops.reduce((totals, stop) => {
        if (stop.price != null) totals[stop.tag] = (totals[stop.tag] || 0) + stop.price;
        return totals;
      }, {});
      built.estimated = Object.values(built.breakdown).reduce((sum, price) => sum + price, 0);
      setPlan({ ...built, request: { ...form } });
      setPhase("");
      setShowForm(false);
      setSaved(false);
    }, 1400);
  };

  /* -------------------------- render -------------------------- */
  return (
    <div className="aip-shell">
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
                        <button type="button" key={id} className={`aip-icon-card ${form.travelerType === id ? "is-selected" : ""}`} onClick={() => set("travelerType", id)}>
                          <Icon size={20} /><span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="aip-field">
                    <label className="aip-label">What's your travel style?</label>
                    <div className="aip-style-grid">
                      {TRAVEL_STYLES.map(({ id, label, desc, Icon }) => (
                        <button type="button" key={id} className={`aip-style-card ${form.travelStyle === id ? "is-selected" : ""}`} onClick={() => set("travelStyle", id)}>
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
                      <div className="aip-field"><label className="aip-label">Travel date</label><input type="date" className="aip-input" value={form.date} onChange={(e) => set("date", e.target.value)} /></div>
                      <div className="aip-field"><label className="aip-label">Travelers</label><input type="number" min={1} className="aip-input" value={form.travelers} onChange={(e) => set("travelers", e.target.value)} /></div>
                      <div className="aip-field"><label className="aip-label">Total trip budget (PHP)</label><input type="number" className="aip-input" value={form.budget} onChange={(e) => set("budget", e.target.value)} /></div>
                    </div>
                    <label className="aip-label">How many days?</label>
                    <div className="aip-chip-row">
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <Chip key={n} selected={form.days === n} onClick={() => set("days", n)}>{n} day{n === 1 ? "" : "s"}</Chip>
                      ))}
                    </div>
                  </div>

                  <div className="aip-card">
                    <div className="aip-row-between">
                      <h2 className="aip-heading">Where will you stay?</h2>
                      {lodging && <span className="aip-pill aip-pill-tan">{lodging.tier} · {peso(lodging.price)} total</span>}
                    </div>
                    <p className="aip-subtitle">Hotels and accommodations in {area?.name || "your destination"}</p>

                    <button type="button" className={`aip-lodging-row ${!form.lodgingId ? "is-selected" : ""}`} onClick={() => set("lodgingId", null)}>
                      <Bus size={18} />
                      <div><strong>Day trip — no lodging</strong><div className="aip-muted aip-small">Return to Dagupan same day</div></div>
                    </button>

                    {lodgingList.map((l) => (
                      <button type="button" key={l.id} className={`aip-lodging-row ${form.lodgingId === l.id ? "is-selected" : ""}`} onClick={() => set("lodgingId", l.id)}>
                        <Home size={18} />
                        <div className="aip-lodging-info">
                          <div className="aip-row-between"><strong>{l.name}</strong><span className="aip-pill aip-pill-tan">{l.tier}</span></div>
                          <div className="aip-amenities">
                            {l.amenities.map((a) => { const AIcon = AMENITY_ICON[a] || Wifi; return <span key={a} className="aip-amenity"><AIcon size={12} /> {a}</span>; })}
                          </div>
                          <div className="aip-price">{peso(l.price)}/night</div>
                        </div>
                        {form.lodgingId === l.id && <Check size={18} className="aip-check" />}
                      </button>
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
                    <div className="aip-info-box">
                      <strong>Your selected place: {area?.name}</strong>
                      <div className="aip-info-label">Famous places nearby</div>
                      <div>{info.famousPlaces.join(" · ")}</div>
                      <div className="aip-info-label">Foods to try</div>
                      <div>{info.foods.join(" · ")}</div>
                    </div>
                  )}

                  <div className="aip-chip-row aip-summary-chips">
                    {[area?.name, TRAVELER_TYPES.find((t) => t.id === form.travelerType)?.label, `${form.days} day${form.days === 1 ? "" : "s"}`,
                      `${form.travelers} travelers`, `${peso(form.budget)} budget`, TRAVEL_STYLES.find((t) => t.id === form.travelStyle)?.label,
                      lodging ? `${lodging.name} (${peso(lodging.price)})` : null, ...form.tripTypes, ...form.activities]
                      .filter(Boolean).map((t, i) => <span key={i} className="aip-summary-chip">{t}</span>)}
                  </div>

                  <button type="button" className="aip-btn aip-btn-outline-coral aip-btn-block" onClick={() => setShowAdvanced((v) => !v)}>
                    {showAdvanced ? "Hide extra options" : "Show extra options"} <ChevronDown size={14} style={{ transform: showAdvanced ? "rotate(180deg)" : "none" }} />
                  </button>

                  {showAdvanced && (
                    <div className="aip-advanced">
                      <div className="aip-field-row">
                        <div className="aip-field"><label className="aip-label">Start time (HH:MM)</label><input type="time" className="aip-input" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} /></div>
                        <div className="aip-field"><label className="aip-label">Meals per person per day (PHP)</label><input type="number" className="aip-input" value={form.mealBudget} onChange={(e) => set("mealBudget", e.target.value)} /></div>
                      </div>
                      <label className="aip-label">Transport</label>
                      <div className="aip-chip-row">
                        {TRANSPORT_MODES.map((m) => <Chip key={m} selected={form.transportModes.includes(m)} onClick={() => set("transportModes", toggleValue(form.transportModes, m))}>{m}</Chip>)}
                      </div>
                      <label className="aip-label">Additional preferences</label>
                      <div className="aip-chip-row">
                        {PREFERENCES.map((p) => <Chip key={p} selected={form.preferences.includes(p)} onClick={() => set("preferences", toggleValue(form.preferences, p))}>{p}</Chip>)}
                        <Chip selected={form.returnToOrigin} onClick={() => set("returnToOrigin", !form.returnToOrigin)}>Include return trip</Chip>
                      </div>
                    </div>
                  )}

                  <div className="aip-step-actions">
                    <button className="aip-btn aip-btn-outline" onClick={goBack}>← Back</button>
                    <button className="aip-btn aip-btn-gradient" onClick={generate}><Zap size={16} /> Generate my itinerary</button>
                  </div>
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

          {!showForm && plan && (
            <>
              <div className="aip-row-between">
                <button className="aip-btn aip-btn-outline" onClick={() => setShowForm(true)}>Edit trip details</button>
                <button className="aip-btn aip-btn-outline"><DownloadIcon size={14} /> Export / Share</button>
              </div>

              <section className="aip-card" style={{ padding: 20, marginTop: 16 }}>
                <strong>Pangasinan fare reference (PHP)</strong>
                <p>Sample itinerary preview. Transport and attraction charges are unconfirmed and excluded from the subtotal. Budget remaining cannot be confirmed.</p>
                <p>{fareReference.note}</p>
                <p>Source: {fareReference.source_file}. Provincial bus NEW columns apply from September 28, 2026; older dates must not use those columns.</p>
                {fareReference.sections.map(section => (
                  <details key={section.id}>
                    <summary>{section.scope} (pages {section.first_page}–{section.last_page})</summary>
                    <pre style={{ whiteSpace: "pre-wrap", overflowX: "auto", fontSize: 12 }}>{section.text}</pre>
                  </details>
                ))}
              </section>
              <div className="aip-result-grid">
                <div className="aip-timeline">
                  {plan.stops.map((stop, i) => {
                    const isNextDay = stop.time === "Next day";
                    return (
                      <div key={i}>
                        {isNextDay && <div className="aip-day-divider">Next day</div>}
                        <div className="aip-stop-row">
                          <div className="aip-stop-time">{isNextDay ? "" : stop.time}</div>
                          <div className="aip-stop-icon"><stop.Icon size={16} /></div>
                          <div className="aip-stop-body">
                            <strong>{stop.title}</strong>
                            <div className="aip-muted aip-small">{stop.subtitle}</div>
                          </div>
                          <div className="aip-stop-tags">
                            <span className="aip-pill" style={{ background: `${TAG_COLOR[stop.tag]}22`, color: TAG_COLOR[stop.tag] }}>{stop.tag}</span>
                            {stop.price > 0 && <span className="aip-price">{peso(stop.price)}</span>}
                            {stop.price == null && <span className="aip-price">Confirm fare / fee</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="aip-side-col">
                  <div className="aip-card">
                    <h3 className="aip-heading-sm">Trip Summary</h3>
                    <SummaryRow label="Destination" value={area?.name} />
                    <SummaryRow label="Traveling as" value={TRAVELER_TYPES.find((t) => t.id === form.travelerType)?.label} />
                    <SummaryRow label="Duration" value={`${form.days} day${form.days === 1 ? "" : "s"}`} />
                    <SummaryRow label="Travelers" value={form.travelers} />
                    <SummaryRow label="Trip type" value={form.tripTypes[0] || "—"} />
                    <SummaryRow label="Travel style" value={TRAVEL_STYLES.find((t) => t.id === form.travelStyle)?.label} />
                    <SummaryRow label="Lodging" value={lodging?.name || "None"} />
                    <SummaryRow label="Estimated cost" value={peso(plan.estimated)} strong />
                    <SummaryRow label="Budget left" value="Unconfirmed" strong />
                    <button className="aip-btn aip-btn-gradient aip-btn-block" disabled={saved} onClick={() => setSaved(true)}>
                      <BookmarkPlus size={16} /> {saved ? "Saved to My Trips" : "Save to My Trips"}
                    </button>
                    <button className="aip-btn aip-btn-outline aip-btn-block"><Share2 size={16} /> Share Plan</button>
                  </div>

                  <div className="aip-card">
                    <h3 className="aip-heading-sm">Cost Breakdown</h3>
                    {Object.entries(plan.breakdown).map(([k, v]) => (
                      <div key={k} className="aip-breakdown-row">
                        <div className="aip-row-between"><span>{k}</span><span className="aip-price">{peso(v)}</span></div>
                        <div className="aip-progress"><div className="aip-progress-fill" style={{ width: `${(v / plan.estimated) * 100}%`, background: TAG_COLOR[k] }} /></div>
                      </div>
                    ))}
                    <div className="aip-row-between aip-total-row"><strong>Total estimate</strong><strong className="aip-price">{peso(plan.estimated)}</strong></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function SummaryRow({ label, value, strong }) {
  return (
    <div className="aip-row-between aip-summary-row">
      <span className="aip-muted aip-small">{label}</span>
      <span style={{ fontWeight: strong ? 700 : 500 }}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stylesheet — mirrors the Figma tokens (Ocean Blue / Sunset Coral /  */
/*  Palm Green / Warm Sand / Seafoam / Golden, Playfair + DM Sans +     */
/*  JetBrains Mono)                                                     */
/* ------------------------------------------------------------------ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;600&display=swap');

.aip-shell, .aip-shell * { box-sizing: border-box; }
.aip-shell { display: flex; flex: 1; min-height: 0; overflow-y: auto; background: ${colors.page}; font-family: ${fonts.body}; font-size: 16px; line-height: 1.5; color: ${colors.ink}; }
.aip-shell svg { flex-shrink: 0; }
.aip-shell button, .aip-shell input, .aip-shell select { font-family: inherit; }
.aip-shell button { overflow-wrap: anywhere; }
.aip-shell button:focus-visible, .aip-shell input:focus-visible, .aip-shell select:focus-visible { outline: 3px solid ${colors.seafoam}; outline-offset: 3px; }

.aip-main { flex: 1; width: 100%; display: flex; flex-direction: column; min-width: 0; }
.aip-tool-header { margin-bottom: 32px; }

.aip-content { max-width: 1200px; width: 100%; margin: 0 auto; padding: clamp(16px, 3vw, 36px) clamp(16px, 3vw, 40px) 60px; }
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
.aip-input, .aip-select, .aip-select-trigger {
  width: 100%; min-width: 0; max-width: 100%; min-height: 52px; padding: 14px 16px; border-radius: 10px; border: 1px solid ${colors.border};
  font-family: ${fonts.body}; font-size: 16px; background: #fff; color: ${colors.ink};
}
.aip-select-trigger { gap: 12px; text-align: left; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.aip-select-trigger > span { min-width: 0; overflow-wrap: anywhere; }
.aip-placeholder { color: ${colors.muted}; }

.aip-multiselect-panel { border: 1px solid ${colors.border}; border-radius: 12px; padding: 20px; margin-top: 12px; }
.aip-multiselect-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
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

.aip-info-box { background: ${colors.warmSand}; border-radius: 12px; padding: 24px; margin-bottom: 24px; font-size: 16px; overflow-wrap: anywhere; }
.aip-info-label { font-size: 13px; letter-spacing: .04em; color: ${colors.muted}; margin: 10px 0 4px; }
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
