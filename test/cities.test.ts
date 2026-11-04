import { describe, expect, it } from 'vitest';
import { locatedChange } from '../src/lib/city-dialog';
import { CITIES, cityLabel, findCity, matchCities, matchHint, offerLinked, placeAt, placeById, placeName, spotAt, titleCase } from '../src/lib/cities';

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
  it('leaves out Lokasi saya where the dialog has no such button', () => expect(matchHint([], false)).toBe('Kota tidak ditemukan. Coba nama lain.'));
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

describe('locatedChange', () => {
  const jakarta = CITIES.find((c) => c.id === '1301')!;
  const bandung = CITIES.find((c) => c.name === 'KOTA BANDUNG')!;
  const london = placeById('geo:51.51,-0.13@Europe/London')!;
  it('says what was chosen and offers the way back', () => {
    expect(locatedChange(jakarta, bandung)).toEqual({ note: 'Lokasi Anda: Kota Bandung.', back: jakarta });
  });
  it('says a place abroad is calculated from the location', () => {
    expect(locatedChange(jakarta, london)).toEqual({ note: 'Di luar Indonesia: jadwal dihitung dari lokasi Anda.', back: jakarta });
  });
  it('offers no way back when the place did not change', () => {
    expect(locatedChange(jakarta, jakarta).back).toBeUndefined();
    expect(locatedChange(london, placeById(london.id)!).back).toBeUndefined();
  });
});

describe('placeAt', () => {
  it('picks the kab/kota within 150 km', () => {
    expect(placeAt(-6.2, 106.8166, 'Asia/Jakarta')).toMatchObject({ kind: 'city', id: '1301' });
    expect(placeAt(-6.2, 106.8166, 'Europe/London').kind).toBe('city'); // inside Indonesia the device zone is ignored
  });
  it('makes a spot in the device zone farther out', () => {
    expect(placeAt(51.5074, -0.1278, 'Europe/London')).toMatchObject({ kind: 'spot', id: 'geo:51.51,-0.13@Europe/London' });
    expect(placeAt(35.6762, 139.6503, 'Asia/Tokyo').id).toBe('geo:35.68,139.65@Asia/Tokyo');
  });
  it('makes a spot for a fix at sea beyond the nearest kab/kota', () => {
    expect(placeAt(-20, 105, 'Asia/Jakarta').kind).toBe('spot');
  });
});

describe('placeById', () => {
  const london = { kind: 'spot', id: 'geo:51.51,-0.13@Europe/London', name: 'Lokasi Anda', region: 'London', lat: 51.51, lon: -0.13, tz: 'Europe/London' };
  it('finds a kab/kota by id, with its zone', () => {
    expect(placeById('1301')).toMatchObject({ kind: 'city', name: 'KOTA JAKARTA', tz: 'Asia/Jakarta' });
    expect(new Set(CITIES.map((c) => c.tz))).toEqual(new Set(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']));
  });
  it('parses a geo id into a spot', () => expect(placeById('geo:51.51,-0.13@Europe/London')).toEqual(london));
  it('names the spot after the last segment of its zone', () => {
    expect(placeById('geo:40.71,-74.01@America/New_York')?.region).toBe('New York');
    expect(placeById('geo:-34.6,-58.38@America/Argentina/Buenos_Aires')?.region).toBe('Buenos Aires');
  });
  it('round-trips the id of a spot made from raw coordinates', () => {
    const spot = spotAt(51.5074, -0.1278, 'Europe/London');
    expect(spot.id).toBe('geo:51.51,-0.13@Europe/London');
    expect(placeById(spot.id)).toEqual(spot);
    expect(spotAt(-0.001, 0.004, 'Asia/Tokyo').id).toBe('geo:0,0@Asia/Tokyo');
  });
  it('rounds a longer link to the same spot', () => expect(placeById('geo:51.5074,-0.1278@Europe/London')?.id).toBe(london.id));
  it('reads the zone in its proper spelling', () => expect(placeById('geo:51.51,-0.13@europe/london')?.tz).toBe('Europe/London'));
  it('refuses what a link could smuggle in', () => {
    for (const id of [
      'geo:91,0@Europe/London', 'geo:0,181@Europe/London', 'geo:-90.5,0@Asia/Tokyo',
      'geo:51.51,-0.13@Mars/Base', 'geo:51.51,-0.13@', 'geo:51.51@Europe/London', 'geo:a,b@Asia/Tokyo',
      'geo:51.51,-0.13@Europe/London<script>', 'geo:1e3,0@Asia/Tokyo', 'geo:', '9999', '', 'constructor',
    ]) expect(placeById(id), id).toBeUndefined();
    expect(placeById(null)).toBeUndefined();
  });
  it('accepts the edges of the range', () => expect(placeById('geo:-90,180@Pacific/Auckland')).toBeDefined());
});

describe('place labels', () => {
  it('names a spot and a city', () => {
    const spot = placeById('geo:51.51,-0.13@Europe/London')!;
    expect(placeName(spot)).toBe('Lokasi Anda');
    expect(cityLabel(spot)).toBe('Lokasi Anda (sekitar London)');
    expect(placeName(CITIES[0])).toBe(titleCase(CITIES[0].name));
  });
  it('offers a linked spot unless it is the saved one', () => {
    const spot = placeById('geo:51.51,-0.13@Europe/London');
    expect(offerLinked(spot, undefined)).toBe(true);
    expect(offerLinked(spot, placeById('geo:51.51,-0.13@Europe/London'))).toBe(false);
  });
});
