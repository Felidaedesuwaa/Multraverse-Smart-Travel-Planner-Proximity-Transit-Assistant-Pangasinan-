export function tripDisplayTitle(trip) {
  const original = trip.title || '';
  const generated = /\btrip$/i.test(original.trim()) || /\s\|\s[0-9a-f]{6}$/i.test(original.trim());
  const r = trip.plan?.guided?.request;
  if (!r || !generated) return original.replace(/\s\|\s[0-9a-f]{6}$/i, '');
  const area = r.areaId.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(' ');
  const theme = r.tripTypes?.slice(0,2).join(' & ') || r.activities?.slice(0,2).join(' & ') || 'Discovery';
  const date = new Date(`${r.date}T00:00:00+08:00`).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric',timeZone:'Asia/Manila'});
  return `${area} ${theme} | ${date} | ${r.days} ${Number(r.days) === 1 ? 'day' : 'days'}`;
}
