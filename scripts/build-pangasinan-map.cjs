// Rebuild the bundled vector map and Wikimedia photo metadata. No runtime map API key.
const fs = require('node:fs/promises');
const path = require('node:path');
const source = 'https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/provdists/hires/municities-provdist-105500000.0.1.json';
const out = path.join(__dirname, '../src/data');
async function get(url) {
  const cache = path.join(__dirname, '../.expo/map-source-cache');
  await fs.mkdir(cache, { recursive: true });
  const cacheFile = path.join(cache, require('node:crypto').createHash('sha256').update(url).digest('hex') + '.json');
  const cached = await fs.readFile(cacheFile, 'utf8').catch(() => null);
  if (cached) return JSON.parse(cached);
  for (let attempt = 0; attempt < 3; attempt++) {
    await new Promise(resolve => setTimeout(resolve, attempt ? 45000 : 4000));
    const response = await fetch(url, { headers: { 'User-Agent': 'MultraverseMap/1.0 (educational travel project)' }, signal: AbortSignal.timeout(30000) });
    if (response.status === 429) continue;
    if (!response.ok) throw new Error(`${response.status}: ${url}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error.info);
    await fs.writeFile(cacheFile, JSON.stringify(data));
    return data;
  }
  throw new Error(`Rate limit reached: ${url}`);
}
async function wiki(params) {
  return get('https://en.wikipedia.org/w/api.php?' + new URLSearchParams({ action: 'query', format: 'json', ...params }));
}
async function main() {
  const geo = process.argv[2] ? JSON.parse(await fs.readFile(process.argv[2], 'utf8')) : await get(source);
  const points = geo.features.flatMap(f => f.geometry.coordinates.flat(f.geometry.type === 'Polygon' ? 1 : 2));
  const xs = points.map(p => p[0] * Math.cos(16 * Math.PI / 180));
  const ys = points.map(p => -p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const scale = 920 / (Math.max(...xs) - minX);
  const height = Math.ceil((Math.max(...ys) - minY) * scale + 80);
  const project = p => [+(40 + (p[0] * Math.cos(16 * Math.PI / 180) - minX) * scale).toFixed(1), +(40 + (-p[1] - minY) * scale).toFixed(1)];
  const areas = geo.features.map(f => {
    const name = f.properties.adm3_en.replace('City of ', '');
    const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const rings = polygons.map(poly => poly.map(ring => ring.map(project)));
    const outer = rings.map(poly => poly[0]).sort((a, b) => {
      const area = r => Math.abs(r.reduce((sum, p, i) => {const q = r[(i + 1) % r.length]; return sum + p[0] * q[1] - q[0] * p[1];}, 0));
      return area(b) - area(a);
    })[0];
    const bounds = [Math.min(...outer.map(p => p[0])), Math.min(...outer.map(p => p[1])), Math.max(...outer.map(p => p[0])), Math.max(...outer.map(p => p[1]))];
    return { id: name.toLowerCase().replaceAll(' ', '-'), name, kind: f.properties.geo_level === 'City' || f.properties.adm3_en.startsWith('City of') ? 'City' : 'Municipality', d: rings.flat().map(r => 'M' + r.map(p => p.join(',')).join('L') + 'Z').join(''), center: [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2] };
  }).sort((a, b) => a.name.localeCompare(b.name));
  await fs.writeFile(path.join(out, 'pangasinanMap.json'), JSON.stringify({ width: 1000, height, source, areas }));
  const photos = await fs.readFile(path.join(out, 'pangasinanPhotos.json'), 'utf8').then(JSON.parse).catch(() => ({}));
  const pending = areas;
  const titles = pending.map(area => area.name === 'Dagupan' ? 'Dagupan' : `${area.name}, Pangasinan`);
  const data = pending.length ? await wiki({ titles: titles.join('|'), redirects: '1', prop: 'images|pageimages', imlimit: '500', piprop: 'name' }) : { query: { pages: {} } };
  let continuation = data.continue;
  while (continuation) {
    const next = await wiki({ titles: titles.join('|'), redirects: '1', prop: 'images|pageimages', imlimit: '500', piprop: 'name', ...continuation });
    for (const [id, page] of Object.entries(next.query.pages)) {
      const previous = data.query.pages[id];
      data.query.pages[id] = { ...previous, ...page, images: [...(previous?.images || []), ...(page.images || [])] };
    }
    continuation = next.continue;
  }
  const allCandidates = {};
  for (const area of pending) {
    const title = area.name === 'Dagupan' ? 'Dagupan' : `${area.name}, Pangasinan`;
    const resolved = data.query.redirects?.find(r => r.from === title)?.to || title;
    const page = Object.values(data.query.pages).find(p => p.title === resolved) || {};
    const candidates = [...new Set([page.pageimage && `File:${page.pageimage}`, ...(page.images || []).map(p => p.title)].filter(Boolean))]
      .filter(name => /\.(jpg|jpeg|png)$/i.test(name) && !/flag|seal|logo|\bmap\b|locator|coat|icon|symbol/i.test(name))
      .filter(name => name === `File:${page.pageimage}` || name.toLowerCase().replace(/[^a-z]/g, '').includes(area.name.toLowerCase().replace(/[^a-z]/g, '')) || (area.id === 'alaminos' && /hundred|100islands/i.test(name)) || (area.id === 'alcala' && /HolyCrossParish/i.test(name)))
      .slice(0, 4);
    allCandidates[area.id] = candidates;
  }
  const files = {};
  const candidates = [...new Set(Object.values(allCandidates).flat())];
  for (let i = 0; i < candidates.length; i += 20) {
      const info = await get('https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ action: 'query', format: 'json', titles: candidates.slice(i, i + 20).join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '960' }));
      Object.assign(files, Object.fromEntries(Object.values(info.query.pages).map(p => [p.title.replaceAll('_', ' '), p])));
  }
  for (const area of pending) {
    photos[area.id] = [];
    for (const title of allCandidates[area.id]) {
        const file = files[title.replaceAll('_', ' ')];
        if (!file) continue;
        const img = file.imageinfo?.[0];
        const meta = img?.extmetadata;
        if (!img || !meta?.LicenseShortName?.value) continue;
        const clean = s => (s || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
        photos[area.id].push({ uri: (img.thumburl || img.url).split('?')[0], title: file.title.replace('File:', ''), credit: clean(meta.Artist?.value), license: clean(meta.LicenseShortName.value), source: img.descriptionurl });
    }
    photos[area.id] = [...new Map(photos[area.id].map(photo => [photo.source, photo])).values()].slice(0, 3);
    if (photos[area.id].length < 2) {
      const more = await get('https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrsearch: `intitle:"${area.name}" "Pangasinan" -intitle:Flag -intitle:Seal -intitle:Map -intitle:River -intitle:Order -intitle:Ordinance`, gsrnamespace: '6', gsrlimit: '10', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '960' }));
      for (const file of Object.values(more.query?.pages || {})) {
        const img = file.imageinfo?.[0], meta = img?.extmetadata;
        if (!img || !meta?.LicenseShortName?.value || !/\.(jpg|jpeg)$/i.test(file.title) || photos[area.id].some(photo => photo.source === img.descriptionurl)) continue;
        if (!file.title.toLowerCase().replace(/[^a-z]/g, '').includes(area.name.toLowerCase().replace(/[^a-z]/g, ''))) continue;
        const clean = s => (s || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
        photos[area.id].push({ uri: (img.thumburl || img.url).split('?')[0], title: file.title.replace('File:', ''), credit: clean(meta.Artist?.value), license: clean(meta.LicenseShortName.value), source: img.descriptionurl });
        if (photos[area.id].length >= 2) break;
      }
    }
    console.log(`${area.name}: ${photos[area.id].length} photos`);
    await fs.writeFile(path.join(out, 'pangasinanPhotos.json'), JSON.stringify(photos, null, 2));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
