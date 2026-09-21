const aliases = {
  alaminos: ["hundred islands"],
  bolinao: ["patar beach", "cape bolinao"],
  manaoag: ["our lady of manaoag"],
};

export function placesForArea(area, places) {
  const names = [area.name.toLowerCase(), ...(aliases[area.id] || [])];
  return places.filter(place => {
    const location = [place.name, place.municipality, place.city, place.address, place.description].filter(Boolean).join(" ").toLowerCase();
    return names.some(name => new RegExp(`(^|[^a-z])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(location));
  });
}

export function summarizeRatings(places) {
  const seen = new Set();
  const ratings = places.filter(place => {
    const id = place.id || place._id;
    if (id && seen.has(id)) return false;
    if (id) seen.add(id);
    return typeof place.rating === "number" && place.rating > 0 && place.rating <= 5;
  }).map(place => place.rating);
  return { count: ratings.length, average: ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null };
}
