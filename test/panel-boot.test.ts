import { describe, expect, it } from 'vitest';
import source from '../src/lib/panel-boot.js?raw';
import table from '../src/data/hijri.json';
import { CITIES, titleCase } from '../src/lib/cities';
import { formatHijri, HIJRI_MONTHS, toHijri } from '../src/lib/hijri';
import { placeClock, placeDate, zoneLabel, ZONE_LABEL } from '../src/lib/schedule';

// The page inlines this file as a classic script, so the test runs that same source.
const { panelLines, resolvePlace, panelBoot } = new Function(`${source}; return { panelLines, resolvePlace, panelBoot };`)();

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
