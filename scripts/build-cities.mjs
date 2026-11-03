// One-time build of src/data/cities.json: myQuran's kab/kota list + province,
// coordinates from OpenStreetMap Nominatim (max 1 req/s per its usage policy),
// and the UTC offset of the province. Re-runnable: responses are cached.
// Usage: node scripts/build-cities.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const UA = 'bedug-city-index/1.0 (+https://bedug.ammar.id)';
const CACHE = new URL('./.cache/', import.meta.url);
const OUT = new URL('../src/data/cities.json', import.meta.url);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cached(key, fn) {
  const file = new URL(`${key}.json`, CACHE);
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    const value = await fn();
    await writeFile(file, JSON.stringify(value));
    return value;
  }
}

async function getJson(url) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    if (attempt === 3) throw new Error(`${res.status} ${url}`);
    await sleep(5000);
  }
}

// Indonesia has no DST: WIB +7, WITA +8, WIT +9.
export function utcOffsetFor(region) {
  if (/PAPUA|MALUKU/.test(region)) return 9;
  if (/BALI|NUSA TENGGARA|KALIMANTAN (SELATAN|TIMUR|UTARA)|SULAWESI|GORONTALO/.test(region)) return 8;
  return 7;
}

function placeName(lokasi) {
  const title = (s) => s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  return title(lokasi.replace(/^KAB\.\s*/, 'Kabupaten ').replace(/^KOTA\s+/, 'Kota '));
}

// Names OpenStreetMap knows under a newer official name.
const RENAMED = {
  'KAB. MAMUJU UTARA': 'Kabupaten Pasangkayu',
  'KAB. MALUKU TENGGARA BARAT': 'Kabupaten Kepulauan Tanimbar',
  'KAB. TOBA SAMOSIR': 'Kabupaten Toba',
};

async function geocode(lokasi, region) {
  const queries = [
    ...(RENAMED[lokasi] ? [`${RENAMED[lokasi]}, ${placeName(region)}`] : []),
    `${placeName(lokasi)}, ${placeName(region)}`,
    // island entries like "PULAU TAMBELAN KAB. BINTAN": search the island itself
    `${placeName(lokasi.replace(/\s+KAB\..*$/, ''))}, ${placeName(region)}`,
    placeName(lokasi),
    `${placeName(lokasi).replace(/^(Kabupaten|Kota) /, '')}, ${placeName(region)}`,
  ];
  for (const q of queries) {
    const hits = await cached(`osm-${q}`, async () => {
      await sleep(1100);
      return getJson(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=id&q=${encodeURIComponent(q)}`,
      );
    });
    if (hits.length) return { lat: +(+hits[0].lat).toFixed(4), lon: +(+hits[0].lon).toFixed(4), q };
  }
  return null;
}

await mkdir(CACHE, { recursive: true });
const { data: list } = await cached('myquran-kota', () =>
  getJson('https://api.myquran.com/v2/sholat/kota/semua'),
);
const cities = [];
const missing = [];
for (const [i, { id, lokasi }] of list.entries()) {
  // myQuran reports errors with HTTP 200 and status:false; don't cache those.
  // Some listed cities (e.g. KOTA SOFIFI) have no schedule at all, so they're left out.
  const data = await cached(`myquran-${id}`, async () => {
    const json = await getJson(`https://api.myquran.com/v2/sholat/jadwal/${id}/2026-01-01`);
    if (!json.data?.daerah) throw new Error(json.message);
    return json;
  }).then((json) => json.data, (e) => missing.push(`${id} ${lokasi}: myQuran ${e.message}`));
  if (!data?.daerah) continue;
  const region = data.daerah;
  const geo = await geocode(lokasi, region);
  if (!geo) {
    missing.push(`${id} ${lokasi} (${region}): not found on OpenStreetMap`);
    continue;
  }
  cities.push({ id, name: lokasi, region, lat: geo.lat, lon: geo.lon, utcOffset: utcOffsetFor(region) });
  if (i % 25 === 0) console.log(`${i + 1}/${list.length} ${lokasi} -> ${geo.lat},${geo.lon}`);
}
cities.sort((a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name));
await writeFile(OUT, JSON.stringify(cities, null, 0).replaceAll('},{', '},\n{') + '\n');
console.log(`wrote ${cities.length} cities; missing ${missing.length}:`);
for (const m of missing) console.log('  ' + m);
console.log('regions:', [...new Set(cities.map((c) => `${c.region}=${c.utcOffset}`))].join(', '));
