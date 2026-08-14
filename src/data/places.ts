import type { PlaceIconKey } from "../utils/placeIcons";

export interface PlaceNode {
  id: string;
  name: string;
  x: number; // % from left
  y: number; // % from top
  icon: "waves" | "trees" | "anchor" | "landmark" | "church" | "building";
}

export const places: PlaceNode[] = [
  { id: "bolinao", name: "Bolinao", x: 16, y: 14, icon: "waves" },
  { id: "alaminos", name: "Alaminos", x: 18, y: 32, icon: "trees" },
  { id: "sual", name: "Sual", x: 20, y: 56, icon: "anchor" },
  { id: "dagupan", name: "Dagupan", x: 35, y: 65, icon: "building" },
  { id: "manaoag", name: "Manaoag", x: 51, y: 52, icon: "church" },
  { id: "lingayen", name: "Lingayen", x: 63, y: 32, icon: "landmark" },
  { id: "sancarlos", name: "San Carlos", x: 82, y: 62, icon: "building" },
];

// Dashed route chains drawn on the map
export const routeChainCoral = ["bolinao", "alaminos", "sual", "dagupan"];
export const routeChainNavy = ["dagupan", "manaoag", "lingayen"];

export interface PlaceDetail {
  name: string;
  address: string;
  tags: string[];
}

export const placeDetails: Record<string, PlaceDetail> = {
  alaminos: {
    name: "Hundred Islands",
    address: "Alaminos City, Pangasinan",
    tags: ["UNESCO", "Open", "₱200 boat"],
  },
  bolinao: {
    name: "Patar Beach",
    address: "Bolinao, Pangasinan",
    tags: ["Sunset spot", "Open"],
  },
  manaoag: {
    name: "Our Lady of Manaoag",
    address: "Manaoag, Pangasinan",
    tags: ["Pilgrimage", "Open"],
  },
  dagupan: {
    name: "Dagupan City",
    address: "Dagupan, Pangasinan",
    tags: ["Bangus Capital", "Food"],
  },
  sual: { name: "Sual Port", address: "Sual, Pangasinan", tags: ["Coastal"] },
  lingayen: {
    name: "Lingayen Capitol",
    address: "Lingayen, Pangasinan",
    tags: ["Provincial Gov."],
  },
  sancarlos: {
    name: "San Carlos City",
    address: "San Carlos, Pangasinan",
    tags: ["City Center"],
  },
};

export const savedTrips = [
  { title: "Hundred Islands Day Trip", status: "upcoming" as const, date: "Aug 15, 2026", progress: 30 },
  { title: "Patar Beach Weekend", status: "upcoming" as const, date: "Aug 22, 2026", progress: 10 },
  { title: "Dagupan Food Tour", status: "completed" as const, date: "Jul 28, 2026", progress: 100 },
];

export const budgetBreakdown = [
  { label: "Transit", amount: 340, color: "#8CA0AE" },
  { label: "Food & Drinks", amount: 480, color: "#2A7B4C" },
  { label: "Entry Fees", amount: 350, color: "#F16B4E" },
  { label: "Accom.", amount: 800, color: "#B7C4CC" },
  { label: "Misc.", amount: 120, color: "#E8A33D" },
];

/* ---------------------------------------------------------------------- */
/*  My Trips / Budget: full trip records (shared so figures stay in sync) */
/* ---------------------------------------------------------------------- */

export interface Trip {
  id: string;
  title: string;
  location: string;
  date: string;
  status: "upcoming" | "completed";
  budget: number;
  spent: number;
  stops: number;
  icon: PlaceIconKey;
}

export const trips: Trip[] = [
  {
    id: "hundred-islands",
    title: "Hundred Islands Day Trip",
    location: "Alaminos",
    date: "Aug 15, 2026",
    status: "upcoming",
    budget: 2000,
    spent: 950,
    stops: 5,
    icon: "trees",
  },
  {
    id: "patar-beach",
    title: "Patar Beach Weekend",
    location: "Bolinao",
    date: "Aug 22, 2026",
    status: "upcoming",
    budget: 3500,
    spent: 0,
    stops: 3,
    icon: "waves",
  },
  {
    id: "dagupan-food",
    title: "Dagupan Food Tour",
    location: "Dagupan",
    date: "Jul 28, 2026",
    status: "completed",
    budget: 1200,
    spent: 1180,
    stops: 6,
    icon: "utensils",
  },
  {
    id: "lingayen-gulf",
    title: "Lingayen Gulf Escape",
    location: "Lingayen",
    date: "Jul 10, 2026",
    status: "completed",
    budget: 2800,
    spent: 2540,
    stops: 4,
    icon: "landmark",
  },
  {
    id: "manaoag-pilgrimage",
    title: "Manaoag Pilgrimage",
    location: "Manaoag",
    date: "Jun 20, 2026",
    status: "completed",
    budget: 800,
    spent: 760,
    stops: 2,
    icon: "church",
  },
];

/* ---------------------------------------------------------------------- */
/*  Budget: monthly spend trend                                          */
/* ---------------------------------------------------------------------- */

export interface MonthlySpend {
  month: string;
  spent: number;
  budget: number;
}

export const monthlyTrend: MonthlySpend[] = [
  { month: "May", spent: 1800, budget: 2500 },
  { month: "Jun", spent: 2100, budget: 2500 },
  { month: "Jul", spent: 3440, budget: 3000 },
  { month: "Aug", spent: 2090, budget: 2500 },
];

export const monthlyBudgetTotal = 2500; // Aug total budget shown in the stat cards

/* ---------------------------------------------------------------------- */
/*  Saved Places                                                         */
/* ---------------------------------------------------------------------- */

export interface SavedPlace {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: PlaceIconKey;
}

export const savedPlaces: SavedPlace[] = [
  {
    id: "hundred-islands-np",
    name: "Hundred Islands NP",
    category: "Nature Park",
    description: "UNESCO site, boat rentals available",
    icon: "trees",
  },
  {
    id: "patar-white-beach",
    name: "Patar White Beach",
    category: "Beach",
    description: "Best sunset spot in Bolinao",
    icon: "waves",
  },
  {
    id: "manaoag-shrine",
    name: "Manaoag Shrine",
    category: "Religious",
    description: "Major pilgrimage site in Pangasinan",
    icon: "church",
  },
  {
    id: "maang-kanors",
    name: "Maang Kanor's Resto",
    category: "Restaurant",
    description: "Best bangus (milkfish) in Dagupan",
    icon: "utensils",
  },
  {
    id: "cape-bolinao",
    name: "Cape Bolinao",
    category: "Landmark",
    description: "Historic lighthouse, cliffside views",
    icon: "landmark",
  },
  {
    id: "lingayen-gulf-place",
    name: "Lingayen Gulf",
    category: "Waterway",
    description: "Historic bay, great for water sports",
    icon: "anchor",
  },
];

/* ---------------------------------------------------------------------- */
/*  Offline Maps                                                         */
/* ---------------------------------------------------------------------- */

export interface OfflineRegion {
  id: string;
  name: string;
  description: string;
  sizeMB: number;
  downloaded: boolean;
}

export const offlineRegions: OfflineRegion[] = [
  { id: "dagupan-region", name: "Dagupan City", description: "City Core", sizeMB: 24, downloaded: true },
  { id: "alaminos-region", name: "Alaminos", description: "Hundred Islands", sizeMB: 38, downloaded: true },
  { id: "bolinao-region", name: "Bolinao", description: "Patar Coast", sizeMB: 31, downloaded: false },
  { id: "lingayen-region", name: "Lingayen", description: "Gulf Province", sizeMB: 18, downloaded: false },
  { id: "manaoag-region", name: "Manaoag", description: "Shrine District", sizeMB: 12, downloaded: false },
  { id: "sancarlos-region", name: "San Carlos City", description: "Eastern Pan.", sizeMB: 22, downloaded: false },
];

export const offlineStorageCapMB = 500;