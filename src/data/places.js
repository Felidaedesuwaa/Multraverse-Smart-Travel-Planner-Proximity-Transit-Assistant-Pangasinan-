export const places = [
  { id: "bolinao", name: "Bolinao", x: 16, y: 14, icon: "waves" },
  { id: "alaminos", name: "Alaminos", x: 18, y: 32, icon: "trees" },
  { id: "sual", name: "Sual", x: 20, y: 56, icon: "anchor" },
  { id: "dagupan", name: "Dagupan", x: 35, y: 65, icon: "building" },
  { id: "manaoag", name: "Manaoag", x: 51, y: 52, icon: "church" },
  { id: "lingayen", name: "Lingayen", x: 63, y: 32, icon: "landmark" },
  { id: "sancarlos", name: "San Carlos", x: 82, y: 62, icon: "building" },
];

export const routeChainCoral = ["bolinao", "alaminos", "sual", "dagupan"];
export const routeChainNavy = ["dagupan", "manaoag", "lingayen"];

export const placeDetails = {
  alaminos: { name: "Hundred Islands", address: "Alaminos City, Pangasinan", tags: ["UNESCO", "Open", "₱200 boat"] },
  bolinao: { name: "Patar Beach", address: "Bolinao, Pangasinan", tags: ["Sunset spot", "Open"] },
  manaoag: { name: "Our Lady of Manaoag", address: "Manaoag, Pangasinan", tags: ["Pilgrimage", "Open"] },
  dagupan: { name: "Dagupan City", address: "Dagupan, Pangasinan", tags: ["Bangus Capital", "Food"] },
  sual: { name: "Sual Port", address: "Sual, Pangasinan", tags: ["Coastal"] },
  lingayen: { name: "Lingayen Capitol", address: "Lingayen, Pangasinan", tags: ["Provincial Gov."] },
  sancarlos: { name: "San Carlos City", address: "San Carlos, Pangasinan", tags: ["City Center"] },
};

export const offlineRegions = [
  { id: "dagupan-region", name: "Dagupan City", description: "City Core", sizeMB: 24, downloaded: true },
  { id: "alaminos-region", name: "Alaminos", description: "Hundred Islands", sizeMB: 38, downloaded: true },
  { id: "bolinao-region", name: "Bolinao", description: "Patar Coast", sizeMB: 31, downloaded: false },
  { id: "lingayen-region", name: "Lingayen", description: "Gulf Province", sizeMB: 18, downloaded: false },
  { id: "manaoag-region", name: "Manaoag", description: "Shrine District", sizeMB: 12, downloaded: false },
  { id: "sancarlos-region", name: "San Carlos City", description: "Eastern Pan.", sizeMB: 22, downloaded: false },
];

export const offlineStorageCapMB = 500;
