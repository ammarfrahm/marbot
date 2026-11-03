import { cityById, titleCase, type City } from './cities';

/** Legacy name from the app's first title, kept so what people already saved survives the rename. */
const PREFIX = 'bedug:';
export const storeKey = (...parts: (string | number)[]) => PREFIX + parts.join(':');

// Storage can be unavailable (private mode, blocked site data); the app must still work.
export const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* not persisted */ } },
};

const placeOf = (c: City) => JSON.stringify({ id: c.id, name: titleCase(c.name), offset: c.utcOffset });

/** Saves the city, with a note of its name and zone that panel-boot.js reads before the page's scripts have loaded. */
export function saveCity(c: City) {
  store.set(storeKey('city'), c.id);
  store.set(storeKey('place'), placeOf(c));
}

/** The saved city. Data saved before the place note existed gets its note here, so the next visit paints it early. */
export function savedCity(): City | undefined {
  const c = cityById(store.get(storeKey('city')));
  if (c && store.get(storeKey('place')) !== placeOf(c)) saveCity(c);
  return c;
}
