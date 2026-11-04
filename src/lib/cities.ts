import data from '../data/cities.json';

/** A myQuran kab/kota: `id` is myQuran's city id, `lat`/`lon` from OpenStreetMap, `tz` its IANA zone. */
export type City = { kind: 'city'; id: string; name: string; region: string; lat: number; lon: number; tz: string };
/** A located point outside the kab/kota list (a traveller abroad). Its id carries everything: `geo:<lat>,<lon>@<tz>`. */
export type Spot = { kind: 'spot'; id: string; name: string; region: string; lat: number; lon: number; tz: string };
export type Place = City | Spot;

// Indonesia has no DST, so the data file keeps the UTC offset: WIB 7, WITA 8, WIT 9.
const ZONE_OF_OFFSET: Record<number, string> = { 7: 'Asia/Jakarta', 8: 'Asia/Makassar', 9: 'Asia/Jayapura' };
export const CITIES: City[] = (data as (Omit<City, 'kind' | 'tz'> & { utcOffset: number })[]).map(({ utcOffset, ...c }) => ({ ...c, kind: 'city', tz: ZONE_OF_OFFSET[utcOffset] }));
export const DEFAULT_CITY_ID = '1301'; // KOTA JAKARTA

/** "KAB. BANDUNG BARAT" → "Kab. Bandung Barat"; acronyms stay: "DKI JAKARTA" → "DKI Jakarta" */
export const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s.(-])\p{L}/gu, (m) => m.toUpperCase()).replace(/\bDki\b/g, 'DKI');

export function cityById(id: string | null): City | undefined {
  return CITIES.find((c) => c.id === id);
}

const GEO_ID = /^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)@([\w+/-]+)$/;

/** The accepted spelling of a time zone, or undefined when Intl does not know it. */
function knownZone(tz: string): string | undefined {
  try {
    return new Intl.DateTimeFormat('en', { timeZone: tz }).resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/** "51,51° LU 0,13° BB": rounded coordinates with Indonesian hemisphere letters; panel-boot.js mirrors this. */
export function coordName(lat: number, lon: number): string {
  const part = (n: number, pos: string, neg: string) => `${Math.abs(n).toFixed(2).replace('.', ',')}° ${n < 0 ? neg : pos}`;
  return `${part(lat, 'LU', 'LS')} ${part(lon, 'BT', 'BB')}`;
}

/**
 * A Spot at these coordinates, rounded to 2 decimals (about 1 km, so GPS jitter keeps one cache key).
 * Undefined when its id would not read back (an offset zone such as "+05:00"): a saved Spot must be readable.
 */
export function spotAt(lat: number, lon: number, tz: string): Spot | undefined {
  const [la, lo] = [lat, lon].map((n) => +n.toFixed(2) || 0); // `|| 0` drops the sign of -0
  const id = `geo:${la},${lo}@${tz}`;
  if (!/^[A-Za-z]/.test(tz) || !GEO_ID.test(id)) return undefined;
  return { kind: 'spot', id, name: coordName(la, lo), region: tz.split('/').pop()!.replaceAll('_', ' '), lat: la, lon: lo, tz };
}

/** The Spot a `geo:` id names, or undefined when it is malformed or out of range: a link is untrusted input. */
function parseSpot(id: string): Spot | undefined {
  const m = GEO_ID.exec(id);
  if (!m) return undefined;
  const [lat, lon] = [Number(m[1]), Number(m[2])];
  const tz = knownZone(m[3]);
  return tz && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? spotAt(lat, lon, tz) : undefined;
}

/** The place a saved or linked id means: a kab/kota id, or a `geo:` id. */
export function placeById(id: string | null): Place | undefined {
  return id?.startsWith('geo:') ? parseSpot(id) : cityById(id);
}

/** What the page calls a place: "Kota Bandung", or a Spot's coordinates. */
export const placeName = (p: Place) => (p.kind === 'city' ? titleCase(p.name) : p.name);

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((bLat - aLat) * rad) / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(((bLon - aLon) * rad) / 2) ** 2;
  return 12_742 * Math.asin(Math.sqrt(h));
}

// shortcut: centroid distance can pick a neighbouring kab/kota near a border; the picker fixes that by hand.
/** Nearest city by centroid distance. */
export function nearestCity(lat: number, lon: number): { city: City; km: number } {
  let best = { city: CITIES[0], km: Infinity };
  for (const city of CITIES) {
    const km = distanceKm(lat, lon, city.lat, city.lon);
    if (km < best.km) best = { city, km };
  }
  return best;
}

const NEAR_KM = 150;

/** Where coordinates are: the nearest kab/kota if one is within 150 km, else a Spot in the device's time zone. */
export function placeAt(lat: number, lon: number, tz = Intl.DateTimeFormat().resolvedOptions().timeZone): Place | undefined {
  const { city, km } = nearestCity(lat, lon);
  return km <= NEAR_KM ? city : spotAt(lat, lon, tz);
}

/** Picker label: the province tells "Kab. Bandung" from "Kab. Bandung Barat" at a glance. */
export const cityLabel = (p: Place) => (p.kind === 'city' ? `${titleCase(p.name)}, ${titleCase(p.region)}` : `${p.name} (zona waktu ${p.region})`);

/**
 * What a typed name could mean, best match first. The first tier with any hit wins:
 * a picker label, a full name ("Kab. Bandung"), a bare name ("bandung"), then any label containing the text.
 * A bare name shared by a Kab. and a Kota resolves to the Kota: that is what people mean by "Bandung".
 */
export function matchCities(text: string): City[] {
  const t = text.trim().toLowerCase();
  if (!t) return [];
  const name = (c: City) => titleCase(c.name).toLowerCase();
  const bare = (c: City) => name(c).replace(/^(kab\.|kota) /, '');
  const tiers = [
    (c: City) => cityLabel(c).toLowerCase() === t,
    (c: City) => name(c) === t,
    (c: City) => bare(c) === t,
    (c: City) => cityLabel(c).toLowerCase().includes(t),
  ];
  for (const tier of tiers) {
    const hits = CITIES.filter(tier);
    const kota = hits.filter((c) => c.name.startsWith('KOTA '));
    if (hits.length) return kota.length === 1 && tier === tiers[2] ? kota : hits;
  }
  return [];
}

/** The one city a typed name means, if it is not ambiguous. */
export function findCity(text: string): City | undefined {
  const hits = matchCities(text);
  return hits.length === 1 ? hits[0] : undefined;
}

/** Hint for a name that is not one city: nothing found, or which ones fit. */
export function matchHint(hits: City[], locate = true): string {
  if (!hits.length) return `Kota tidak ditemukan. Coba nama lain${locate ? ', atau pakai Lokasi saya' : ''}.`;
  const shown = hits.slice(0, 3).map((c) => titleCase(c.name)).join(', ');
  return `${hits.length} kota cocok: ${shown}${hits.length > 3 ? ', dll.' : ''} — pilih dari daftar.`;
}

/** A city from a shared link is offered for saving, unless it is already the saved one. */
export const offerLinked = (linked: Place | undefined, stored: Place | undefined) => !!linked && linked.id !== stored?.id;
