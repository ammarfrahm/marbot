import { describe, expect, it } from 'vitest';
import source from '../src/lib/panel-boot.js?raw';
import table from '../src/data/hijri.json';
import { CITIES, placeById, titleCase } from '../src/lib/cities';
import { formatHijri, HIJRI_MONTHS, toHijri } from '../src/lib/hijri';
import { placeClock, placeDate, zoneLabel, ZONE_LABEL } from '../src/lib/schedule';

// The page inlines this file as a classic script, so the test runs that same source.
const { panelLines, resolvePlace, panelBoot, linkedId } = new Function(`${source}; return { panelLines, resolvePlace, panelBoot, linkedId };`)();

const cfg = { starts: table.starts, first: table.first, months: HIJRI_MONTHS, zones: ZONE_LABEL };
const jakarta = { id: '1301', name: 'Kota Jakarta', tz: 'Asia/Jakarta' };

describe('panelLines', () => {
  // A spread of instants and zones, including either side of a city's midnight and the table's edges.
  const instants = ['2026-11-04T09:00:00+07:00', '2026-11-04T23:59:00+07:00', '2026-11-04T17:30:00Z', '2027-02-15T00:05:00+09:00', '2027-03-12T09:00:00+07:00', '2022-07-30T00:00:00+07:00', '2022-07-29T12:00:00+07:00']
    .map((s) => Date.parse(s));
  for (const tz of ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']) {
    it(`matches the page scripts in ${tz}`, () => {
      for (const now of instants) {
        const lines = panelLines(now, { id: 'x', name: 'Kota X', tz }, cfg);
        const h = toHijri(placeDate(now, tz));
        expect(lines.hijri).toBe(h ? formatHijri(h) : '');
        expect(lines.today).toBe(`${new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeZone: tz }).format(now)} · ${placeClock(now, tz)} ${zoneLabel(tz, now)}`);
        expect(lines.greg).toBe(new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${placeDate(now, tz)}T00:00:00Z`)));
      }
    });
  }
  it('leaves the Hijri line empty outside the table', () => {
    expect(panelLines(Date.parse('2020-01-01T00:00:00Z'), jakarta, cfg).hijri).toBe('');
    expect(panelLines(Date.parse('2090-01-01T00:00:00Z'), jakarta, cfg).hijri).toBe('');
  });
  it('names the place', () => expect(panelLines(0, jakarta, cfg)).toMatchObject({ name: 'Kota Jakarta', from: 'dari Kota Jakarta' }));
  it('names a city as the page does', () => {
    const c = CITIES[5];
    expect(panelLines(0, { id: c.id, name: titleCase(c.name), tz: c.tz }, cfg).from).toBe(`dari ${titleCase(c.name)}`);
  });
});

describe('resolvePlace', () => {
  const def = { id: '1301', name: 'Kota Jakarta', tz: 'Asia/Jakarta' };
  const bandung = { id: '1', name: 'Kota Bandung', tz: 'Asia/Jakarta' };
  const makassar = { id: '2', name: 'Kota Makassar', tz: 'Asia/Makassar' };
  const cities = { '1': ['Kota Bandung', 'Asia/Jakarta'], '2': ['Kota Makassar', 'Asia/Makassar'] };
  const place = (...ids: (string | null)[]) => resolvePlace(ids, { def, cities });
  it('uses the default city on a first visit', () => expect(place(null, null)).toBe(def));
  it('finds the saved city by id', () => expect(place(null, '2')).toEqual(makassar));
  it('prefers a shared link over the saved city', () => expect(place('1', '2')).toEqual(bandung));
  it('skips an id it does not know', () => {
    expect(place('9999', '2')).toEqual(makassar);
    expect(place('constructor', null)).toBe(def);
  });
  it('finds a CITIES entry by its real id', () => {
    const c = CITIES.find((x) => x.tz === 'Asia/Jayapura')!;
    const all = Object.fromEntries(CITIES.map((x) => [x.id, [titleCase(x.name), x.tz]]));
    expect(resolvePlace([c.id], { def, cities: all })).toEqual({ id: c.id, name: titleCase(c.name), tz: 'Asia/Jayapura' });
  });
});

describe('spots', () => {
  const london = 'geo:51.51,-0.13@Europe/London';
  const def = { id: '1301', name: 'Kota Jakarta', tz: 'Asia/Jakarta' };
  it('resolves a geo id to a spot named by its coordinates', () => {
    expect(resolvePlace([london, null], { def, cities: {} })).toEqual({ id: london, name: '51,51° LU 0,13° BB', tz: 'Europe/London' });
  });
  it('agrees with placeById on what is valid', () => {
    for (const id of [london, 'geo:91,0@Europe/London', 'geo:0,0@Mars/Base', 'geo:51.51,-0.13@europe/london', 'geo:1e3,0@Asia/Tokyo', 'geo:-90,180@Pacific/Auckland', 'geo:x', 'geo:51.51,-0.13@+05', 'geo:51.51,-0.13@Etc/GMT+5']) {
      const spot = placeById(id);
      expect(resolvePlace([id], { def, cities: {} }).tz, id).toBe(spot ? spot.tz : def.tz);
    }
  });
  it('names a spot as the page does', () => {
    for (const id of ['geo:51.51,-0.13@Europe/London', 'geo:-6.2,106.82@Asia/Tokyo', 'geo:0,0@Asia/Tokyo', 'geo:-0.001,0.004@Asia/Tokyo', 'geo:-33.87,151.21@Australia/Sydney']) {
      expect(resolvePlace([id], { def, cities: {} }).name, id).toBe(placeById(id)!.name);
    }
  });
  it('skips a bad geo id for the next one', () => {
    expect(resolvePlace(['geo:99,0@Asia/Tokyo', '2'], { def, cities: { '2': ['Kota Makassar', 'Asia/Makassar'] } }).name).toBe('Kota Makassar');
  });
  it('matches the page for a spot across London\'s change', () => {
    const tz = 'Europe/London';
    for (const now of [Date.parse('2026-03-29T00:30:00Z'), Date.parse('2026-03-29T01:30:00Z'), Date.parse('2026-10-25T00:30:00Z'), Date.parse('2026-10-25T01:30:00Z')]) {
      const lines = panelLines(now, { id: london, name: '51,51° LU 0,13° BB', tz }, cfg);
      expect(lines.today).toBe(`${new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeZone: tz }).format(now)} · ${placeClock(now, tz)} ${zoneLabel(tz, now)}`);
      const h = toHijri(placeDate(now, tz));
      expect(lines.hijri).toBe(h ? formatHijri(h) : '');
    }
  });
  it('writes a saved spot\'s name and zone before paint', () => {
    const els: Record<string, { textContent: string }> = { 'city-name': { textContent: 'Kota Jakarta' }, today: { textContent: '' } };
    panelBoot(
      { ...cfg, cities: {}, def, fill: { 'city-name': 'name', today: 'today' } },
      { get: () => london, linked: null, now: Date.parse('2026-07-01T10:00:00Z'), doc: { getElementById: (id: string) => els[id] ?? null } },
    );
    expect(els['city-name'].textContent).toBe('51,51° LU 0,13° BB');
    expect(els.today.textContent).toMatch(/ · 11:00 GMT\+1$/);
  });
});

describe('linkedId', () => {
  it('decodes the id as the page does, so a shared geo link names its spot at first paint', () => {
    const id = 'geo:51.51,-0.13@Europe/London';
    const search = `?city=${encodeURIComponent(id)}`;
    expect(linkedId(search)).toBe(id);
    expect(resolvePlace([linkedId(search)], { def: jakarta, cities: {} }).tz).toBe('Europe/London');
    expect(linkedId('?city=1301&x=1')).toBe('1301');
    expect(linkedId('?city=1&kota=2')).toBe('1');
    expect(linkedId('')).toBeNull();
  });
});

describe('an old ?kota= link', () => {
  it('still selects the city', () => {
    expect(linkedId('?kota=1301')).toBe('1301');
    expect(resolvePlace([linkedId('?kota=2')], { def: { id: '1301', name: 'Kota Jakarta', tz: 'Asia/Jakarta' }, cities: { '2': ['Kota Makassar', 'Asia/Makassar'] } }).name).toBe('Kota Makassar');
  });
});

describe('panelBoot', () => {
  const now = Date.parse('2026-11-04T09:00:00+07:00');
  const cities = { '1': ['Kota Bandung', 'Asia/Jakarta'], '2': ['Kota Makassar', 'Asia/Makassar'] };
  const run = (data: Record<string, string>, linked: string | null) => {
    const els: Record<string, { textContent: string }> = { 'city-name': { textContent: 'Kota Jakarta' }, today: { textContent: '' }, hijri: { textContent: '' } };
    const def = { id: '1301', name: 'Kota Jakarta', tz: 'Asia/Jakarta' };
    panelBoot(
      { ...cfg, cities, def, fill: { 'city-name': 'name', today: 'today', hijri: 'hijri', missing: 'name' } },
      { get: (k: string) => data[k] ?? null, linked, now, doc: { getElementById: (id: string) => els[id] ?? null } },
    );
    return els;
  };
  it('writes the name and dates for the saved city, with no place note', () => {
    const els = run({ 'bedug:city': '1' }, null);
    expect(els['city-name'].textContent).toBe('Kota Bandung');
    expect(els.hijri.textContent).toBe('24 Jumadilawal 1448 H');
    expect(els.today.textContent).toMatch(/ · 09:00 WIB$/);
  });
  it('keeps working next to an old bedug:place key', () => {
    expect(run({ 'bedug:city': '2', 'bedug:place': '{"id":"1","name":"X","offset":7}' }, null)['city-name'].textContent).toBe('Kota Makassar');
  });
  it('writes a shared link\'s name and its zone', () => {
    const els = run({ 'bedug:city': '1' }, '2');
    expect(els['city-name'].textContent).toBe('Kota Makassar');
    expect(els.today.textContent).toMatch(/ · 10:00 WITA$/);
  });
  it('writes the default city on a first visit', () => expect(run({}, null)['city-name'].textContent).toBe('Kota Jakarta'));
});
