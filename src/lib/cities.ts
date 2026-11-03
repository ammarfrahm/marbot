import data from '../data/cities.json';
import type { UtcOffset } from './schedule';

/** A myQuran kab/kota: `id` is myQuran's city id, `lat`/`lon` from OpenStreetMap. */
export type City = { id: string; name: string; region: string; lat: number; lon: number; utcOffset: UtcOffset };

export const CITIES = data as City[];
export const DEFAULT_CITY_ID = '1301'; // KOTA JAKARTA

/** "KAB. BANDUNG BARAT" → "Kab. Bandung Barat"; acronyms stay: "DKI JAKARTA" → "DKI Jakarta" */
export const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s.(-])\p{L}/gu, (m) => m.toUpperCase()).replace(/\bDki\b/g, 'DKI');

export function cityById(id: string | null): City | undefined {
  return CITIES.find((c) => c.id === id);
}

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

/** Picker label: the province tells "Kab. Bandung" from "Kab. Bandung Barat" at a glance. */
export const cityLabel = (c: City) => `${titleCase(c.name)}, ${titleCase(c.region)}`;

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
export const offerLinked = (linked: City | undefined, stored: City | undefined) => !!linked && linked.id !== stored?.id;
