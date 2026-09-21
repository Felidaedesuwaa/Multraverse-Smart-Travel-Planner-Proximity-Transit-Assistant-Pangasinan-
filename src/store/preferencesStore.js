import { create } from "zustand";
import { storage } from "../lib/storage";
import currencies from "../data/currencies.json";

const KEY = "multraverse.preferences.v1";
const supported = new Set(currencies.map(item => item.code));
let initialization;
let ratesRequest;
let writes = Promise.resolve();

function save(state) {
  const data = JSON.stringify({ darkMode: state.darkMode, currency: state.currency, rates: state.rates, ratesUpdatedAt: state.ratesUpdatedAt, ratesFetchedAt: state.ratesFetchedAt });
  writes = writes.catch(() => {}).then(() => storage.setItem(KEY, data));
  return writes;
}

export function validRates(rates) {
  if (!rates || typeof rates !== "object" || rates.PHP !== 1) return false;
  return Object.entries(rates).every(([code, rate]) => /^[A-Z]{3}$/.test(code) && typeof rate === "number" && Number.isFinite(rate) && rate > 0);
}

export const usePreferencesStore = create((set, get) => ({
  darkMode: false,
  currency: "PHP",
  rates: { PHP: 1 },
  ratesUpdatedAt: null,
  ratesFetchedAt: 0,
  ratesLoading: false,
  ratesError: null,
  storageError: null,
  ready: false,
  init: () => {
    initialization ??= (async () => {
      try {
        const raw = await storage.getItem(KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          set({ darkMode: saved.darkMode === true, currency: supported.has(saved.currency) ? saved.currency : "PHP", ...(validRates(saved.rates) ? { rates: saved.rates, ratesUpdatedAt: saved.ratesUpdatedAt || null, ratesFetchedAt: Number(saved.ratesFetchedAt) || 0 } : {}) });
        }
      } catch { set({ storageError: "Saved preferences could not be loaded." }); }
      set({ ready: true });
      if (get().currency !== "PHP") get().refreshRates();
    })();
    return initialization;
  },
  setDarkMode: darkMode => { set({ darkMode }); save(get()).catch(() => set({ storageError: "Your preference changed, but could not be saved on this device." })); },
  setCurrency: currency => {
    if (!supported.has(currency)) return;
    set({ currency });
    save(get()).catch(() => set({ storageError: "Your preference changed, but could not be saved on this device." }));
    if (currency !== "PHP") get().refreshRates();
  },
  refreshRates: (force = false) => {
    if (ratesRequest) return ratesRequest;
    if (!force && Date.now() - get().ratesFetchedAt < 24 * 60 * 60 * 1000 && Object.keys(get().rates).length > 1) return Promise.resolve();
    ratesRequest = (async () => {
      set({ ratesLoading: true, ratesError: null });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch("https://open.er-api.com/v6/latest/PHP", { signal: controller.signal });
        if (!response.ok) throw new Error("Rate service unavailable");
        const data = await response.json();
        if (data.result !== "success" || data.base_code !== "PHP" || !validRates(data.rates) || !Number.isFinite(data.time_last_update_unix)) throw new Error("Invalid exchange rates");
        set({ rates: data.rates, ratesUpdatedAt: new Date(data.time_last_update_unix * 1000).toISOString(), ratesFetchedAt: Date.now() });
        await save(get());
      } catch { set({ ratesError: "Could not refresh exchange rates. Cached rates are used when available; otherwise prices remain in PHP." }); }
      finally { clearTimeout(timeout); set({ ratesLoading: false }); ratesRequest = null; }
    })();
    return ratesRequest;
  },
}));
