import Constants from "expo-constants";
import { Platform } from "react-native";
import { storage } from "./storage";

function getExpoDevHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri;

  return hostUri?.split(":")[0];
}

function getBaseUrl() {
  // Use this for deployed APIs or when the backend runs on another machine.
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  if (Platform.OS === "web") return "http://localhost:3001";

  // Expo Go exposes Metro's LAN host, which is also the computer running
  // Express when the phone and computer are on the same Wi-Fi network.
  const expoHost = getExpoDevHost();
  // Android Studio's emulator reaches the development computer at 10.0.2.2
  // when Metro is started with --localhost.
  if (Platform.OS === "android" && (expoHost === "localhost" || expoHost === "127.0.0.1")) {
    return "http://10.0.2.2:3001";
  }
  if (expoHost && expoHost !== "localhost" && expoHost !== "127.0.0.1") {
    return `http://${expoHost}:3001`;
  }

  // Standalone Android builds do not have Expo's development host metadata.
  // Use this computer's LAN address when the phone and backend share Wi-Fi.
  if (Platform.OS === "android") return "http://192.168.18.7:3001";

  // iOS simulator shares localhost with the development machine.
  return "http://localhost:3001";
}

export const BASE_URL = getBaseUrl();

async function getToken() {
  return storage.getItem("token");
}

async function request(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error || "Request failed");
    error.fieldErrors = data.fieldErrors;
    error.status = res.status;
    throw error;
  }
  return data;
}

async function profileRequest(method, data) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    return await request('/api/users/me', { method, signal: controller.signal, ...(data ? { body: JSON.stringify(data) } : {}) });
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Request timed out. Check your connection and try again.');
    throw error;
  } finally { clearTimeout(timeout); }
}

export const api = {
  getManagedAccounts: (type = 'lgu') => request(`/api/users/${type}-accounts`),
  createManagedAccount: (type, data) => request(`/api/users/${type}-accounts`, { method: 'POST', body: JSON.stringify(data) }),
  getAuditLogs: ({ page = 1, action = '', actor = '' } = {}) => request(`/api/audit-logs?page=${page}&limit=25${action ? `&action=${encodeURIComponent(action)}` : ''}${actor ? `&actor=${encodeURIComponent(actor)}` : ''}`),
  getLGUResources: resource => request(`/api/lgu/${resource}`),
  submitLGUResource: (resource, data, id) => request(`/api/lgu/${resource}${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }),
  deleteLGUResource: (resource, id) => request(`/api/lgu/${resource}/${id}`, { method: 'DELETE' }),
  getApprovals: resource => request(`/api/admin/approvals/${resource}`),
  reviewSubmission: (resource, id, decision, reason, revision) => request(`/api/admin/approvals/${resource}/${id}/${decision}`, { method: 'POST', body: JSON.stringify({ reason, revision }) }),
  // Auth
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (fields) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(fields) }),
  verifyRegistration: (challengeId, code) =>
    request('/api/auth/register/verify', { method: 'POST', body: JSON.stringify({ challengeId, code }) }),
  resendRegistration: (challengeId) =>
    request('/api/auth/register/resend', { method: 'POST', body: JSON.stringify({ challengeId }) }),

  // User
  getMe: () => profileRequest('GET'),
  updateMe: (data) => profileRequest('PUT', data),
  deleteMe: (password) => profileRequest('DELETE', { password, confirmation: true }),
  searchLocations: (query, signal) => request(`/api/locations/search?q=${encodeURIComponent(query)}`, { signal }),

  // Trips
  getTrips: () => request('/api/trips'),
  createTrip: (data) =>
    request('/api/trips', { method: 'POST', body: JSON.stringify(data) }),
  updateTrip: (id, data) =>
    request(`/api/trips/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTrip: (id) =>
    request(`/api/trips/${id}`, { method: 'DELETE' }),

  // Budget
  getBudget: () => request('/api/budget'),
  getBudgetSettings: () => request('/api/budget/settings'),
  updateBudgetSettings: data => request('/api/budget/settings', { method: 'PUT', body: JSON.stringify(data) }),
  createBudgetEntry: (data) =>
    request('/api/budget', { method: 'POST', body: JSON.stringify(data) }),
  deleteBudgetEntry: (id) =>
    request(`/api/budget/${id}`, { method: 'DELETE' }),

  // Saved Places
  getSavedPlaces: () => request('/api/places'),
  createSavedPlace: (data) =>
    request('/api/places', { method: 'POST', body: JSON.stringify(data) }),
  updateSavedPlace: (id, data) =>
    request(`/api/places/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSavedPlace: (id) =>
    request(`/api/places/${id}`, { method: 'DELETE' }),
  getPublicPlaces: (options = {}) => request('/api/places/public', options),

  // Transit Routes
  getTransitRoutes: () => request('/api/transit-routes'),

  // Geofences
  getGeofences: () => request('/api/geofences'),
  updateGeofence: (id, data) =>
    request(`/api/geofences/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // AI
  getPlannerCatalog: (options = {}) => request('/api/ai/planner/catalog', options),
  getAISettings: () => request('/api/ai/settings'),
  updateAISettings: data => request('/api/ai/settings', { method: 'PUT', body: JSON.stringify(data) }),
  generateItinerary: (data, options = {}) =>
    request('/api/ai/itinerary', { ...options, method: 'POST', body: JSON.stringify(data) }),
  generateModelItinerary: (data, options = {}) =>
    request('/api/ai/itinerary/model', { ...options, method: 'POST', body: JSON.stringify(data) }),
  enrichItinerary: (id, options = {}) => request(`/api/ai/planner/${id}/narrative`, { ...options, method: 'POST', body: '{}' }),
  saveItinerary: (id, acceptIncomplete) => request(`/api/ai/planner/${id}/save`, { method: 'POST', body: JSON.stringify({ acceptIncomplete }) }),
  translate: (text, from, to) =>
    request('/api/ai/translate', { method: 'POST', body: JSON.stringify({ text, from, to }) }),
  transcribe: (audio, mimeType) =>
    request('/api/ai/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audio, mimeType }),
    }),
  getPhrasebook: () => request('/api/ai/phrasebook'),
  speech: (text, language) => request('/api/ai/speech', { method: 'POST', body: JSON.stringify({ text, language }) }),

  // Admin
  getAllUsers: () => request('/api/users'),
  getAnalytics: () => request('/api/analytics'),
  getDashboardAnalytics: () => request('/api/analytics/dashboard'),
}
