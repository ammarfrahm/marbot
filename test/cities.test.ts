import { describe, expect, it } from 'vitest';
import { CITIES, cityLabel, findCity, matchCities, matchHint, offerLinked, titleCase } from '../src/lib/cities';

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
  it('prefers the Kota for a bare name shared with a Kab.', () => {
    expect(findCity('bandung')?.name).toBe('KOTA BANDUNG');
    expect(findCity('BANDUNG')?.name).toBe('KOTA BANDUNG');
  });
  it('resolves a full name without the province', () => expect(findCity('kab. bandung')?.name).toBe('KAB. BANDUNG'));
  it('resolves a unique fragment', () => expect(findCity('jakarta')?.id).toBe('1301'));
  it('refuses what does not match', () => {
    expect(findCity('xyz')).toBeUndefined();
    expect(findCity('')).toBeUndefined();
    expect(findCity('   ')).toBeUndefined();
  });
  it('refuses an ambiguous fragment and lists the candidates', () => {
    const hits = matchCities('bandung barat');
    expect(hits.map((c) => c.name)).toEqual(['KAB. BANDUNG BARAT']);
    expect(matchCities('jawa barat').length).toBeGreaterThan(3);
    expect(findCity('jawa barat')).toBeUndefined();
  });
});

describe('matchHint', () => {
  it('says nothing matched', () => expect(matchHint([])).toBe('Kota tidak ditemukan. Coba nama lain, atau pakai Lokasi saya.'));
  it('names up to three matches', () => {
    expect(matchHint(CITIES.filter((c) => /BANDUNG/.test(c.name)).slice(0, 2))).toBe('2 kota cocok: Kab. Bandung, Kab. Bandung Barat — pilih dari daftar.');
    expect(matchHint(matchCities('jawa barat'))).toMatch(/^\d+ kota cocok: [^,]+, [^,]+, [^,]+, dll\. — pilih dari daftar\.$/);
  });
});

describe('cityLabel', () => {
  it('labels every city uniquely', () => expect(new Set(CITIES.map(cityLabel)).size).toBe(CITIES.length));
});

describe('offerLinked', () => {
  const [a, b] = CITIES;
  it('offers a linked city when nothing is saved', () => expect(offerLinked(a, undefined)).toBe(true));
  it('offers a linked city that differs from the saved one', () => expect(offerLinked(a, b)).toBe(true));
  it('stays quiet when the link is the saved city', () => expect(offerLinked(a, a)).toBe(false));
  it('stays quiet without a link', () => expect(offerLinked(undefined, a)).toBe(false));
});
