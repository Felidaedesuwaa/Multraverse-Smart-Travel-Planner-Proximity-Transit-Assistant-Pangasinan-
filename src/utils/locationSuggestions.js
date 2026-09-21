import pangasinan from "../data/pangasinanMap.json";

const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function localLocationSuggestions(query) {
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  if (query.trim().length < 3) return [];
  return pangasinan.areas.map(area => ({ id: `local:${area.id}`, label: `${area.name}, Pangasinan, Philippines` }))
    .filter(place => words.every(word => normalize(place.label).includes(word))).slice(0, 6);
}

export function mergeLocationSuggestions(local, online) {
  const seen = new Set();
  return [...local, ...online].filter(place => {
    if (typeof place?.label !== "string" || !place.label.trim() || place.label.length > 120) return false;
    const key = normalize(place.label);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}
