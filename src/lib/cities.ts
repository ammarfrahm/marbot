import data from '../data/cities.json';
import type { UtcOffset } from './schedule';

/** A myQuran kab/kota: `id` is myQuran's city id, `lat`/`lon` from OpenStreetMap. */
export type City = { id: string; name: string; region: string; lat: number; lon: number; utcOffset: UtcOffset };

export const CITIES = data as City[];
export const DEFAULT_CITY_ID = '1301'; // KOTA JAKARTA

/** "KAB. BANDUNG BARAT" → "Kab. Bandung Barat" */
export const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s.(-])\p{L}/gu, (m) => m.toUpperCase());

export function cityById(id: string | null): City | undefined {
  return CITIES.find((c) => c.id === id);
}

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
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
