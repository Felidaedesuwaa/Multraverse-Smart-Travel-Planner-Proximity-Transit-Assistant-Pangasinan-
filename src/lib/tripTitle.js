export function tripDisplayTitle(trip) {
  const original = trip.title || '';
  const generated = /\btrip$/i.test(original.trim()) || /\s\|\s[0-9a-f]{6}$/i.test(original.trim());
  const r = trip.plan?.guided?.request;
  const title = original.replace(/\s\|\s[0-9a-f]{6}$/i, '').split(/\s*\|\s*/)
    .filter(part => !/^\d+ days?$/i.test(part.trim()) && !/^\d{4}-\d{2}-\d{2}$/.test(part.trim()) && !/^[A-Za-z]{3,9} \d{1,2}, \d{4}$/.test(part.trim()))
    .join(' | ').trim();
  if (!r?.areaId || !generated) return title;
  const area = r.areaId.split('-').map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(' ');
  const theme = r.tripTypes?.slice(0,2).join(' & ') || r.activities?.slice(0,2).join(' & ') || 'Discovery';
  return `${area} ${theme}`;
}

export function tripDurationDays(trip) {
  const days = Number(trip.plan?.guided?.request?.days ?? trip.plan?.request?.days ?? (Array.isArray(trip.plan?.days) ? trip.plan.days.length : undefined));
  return Number.isInteger(days) && days > 0 ? days : null;
}
