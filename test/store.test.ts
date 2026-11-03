import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CITIES } from '../src/lib/cities';
import { saveCity, savedCity, storeKey } from '../src/lib/store';

// Saved data lives under these names; changing them would silently drop every user's city and cached months.
describe('storeKey', () => {
  it('keeps the legacy prefix', () => {
    expect(storeKey('city')).toBe('bedug:city');
    expect(storeKey('source')).toBe('bedug:source');
  });
  it('joins a cached month the way it was always saved', () => expect(storeKey('myquran', '1301', '2026-11')).toBe('bedug:myquran:1301:2026-11'));
});

describe('saveCity / savedCity', () => {
  const data = new Map<string, string>();
  beforeEach(() => {
    data.clear();
    vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) });
  });
  afterEach(() => vi.unstubAllGlobals());
  const jakarta = CITIES.find((c) => c.id === '1301')!;

  it('keeps just the city id', () => {
    saveCity(jakarta);
    expect([...data.keys()]).toEqual(['bedug:city']);
    expect(data.get('bedug:city')).toBe('1301');
  });
  it('reads a city saved by an older version, ignoring its place note', () => {
    data.set('bedug:city', '1301');
    data.set('bedug:place', JSON.stringify({ id: '9999', name: 'X', offset: 9 }));
    expect(savedCity()?.id).toBe('1301');
    expect(data.get('bedug:place')).toContain('9999'); // left alone
  });
  it('is undefined with nothing saved', () => {
    expect(savedCity()).toBeUndefined();
    expect(data.size).toBe(0);
  });
});
