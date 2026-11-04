import { placeById, type Place } from './cities';

/** Legacy name from the app's first title, kept so what people already saved survives the rename. */
const PREFIX = 'bedug:';
export const storeKey = (...parts: (string | number)[]) => PREFIX + parts.join(':');

// Storage can be unavailable (private mode, blocked site data); the app must still work.
export const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* not persisted */ } },
};

export const saveCity = (c: Place) => store.set(storeKey('city'), c.id);

export const savedCity = (): Place | undefined => placeById(store.get(storeKey('city')));
