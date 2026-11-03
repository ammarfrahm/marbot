import { describe, expect, it } from 'vitest';
import { CITIES, cityLabel, findCity, titleCase } from '../src/lib/cities';

describe('titleCase', () => {
  it('capitalises each word', () => expect(titleCase('KAB. BANDUNG BARAT')).toBe('Kab. Bandung Barat'));
  it('keeps acronyms upper', () => {
    expect(titleCase('DKI JAKARTA')).toBe('DKI Jakarta');
    expect(titleCase('D.I. YOGYAKARTA')).toBe('D.I. Yogyakarta');
  });
});

describe('findCity', () => {
  it('resolves a picker label', () => expect(findCity('Kab. Bandung, Jawa Barat')?.name).toBe('KAB. BANDUNG'));
  it('ignores case and spaces', () => expect(findCity('  kota jakarta, dki jakarta ')?.id).toBe('1301'));
  it('resolves a bare unique name', () => expect(findCity('Kab. Bandung Barat')?.name).toBe('KAB. BANDUNG BARAT'));
  it('refuses what does not match', () => {
    expect(findCity('Bandung')).toBeUndefined();
    expect(findCity('')).toBeUndefined();
  });
  it('labels every city uniquely', () => expect(new Set(CITIES.map(cityLabel)).size).toBe(CITIES.length));
});
