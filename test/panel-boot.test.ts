import { describe, expect, it } from 'vitest';
import source from '../src/lib/panel-boot.js?raw';
import table from '../src/data/hijri.json';
import { CITIES, titleCase } from '../src/lib/cities';
import { formatHijri, HIJRI_MONTHS, toHijri } from '../src/lib/hijri';
import { cityClock, cityDate, ZONE_IANA, ZONE_LABEL, type UtcOffset } from '../src/lib/schedule';

// The page inlines this file as a classic script, so the test runs that same source.
const { panelLines, resolvePlace, panelBoot } = new Function(`${source}; return { panelLines, resolvePlace, panelBoot };`)();

const cfg = { starts: table.starts, first: table.first, months: HIJRI_MONTHS, zones: ZONE_LABEL, iana: ZONE_IANA };
const jakarta = { id: '1301', name: 'Kota Jakarta', offset: 7 };

describe('panelLines', () => {
  // A spread of instants and zones, including either side of a city's midnight and the table's edges.
  const instants = ['2026-11-04T09:00:00+07:00', '2026-11-04T23:59:00+07:00', '2026-11-04T17:30:00Z', '2027-02-15T00:05:00+09:00', '2027-03-12T09:00:00+07:00', '2022-07-30T00:00:00+07:00', '2022-07-29T12:00:00+07:00']
    .map((s) => Date.parse(s));
  for (const offset of [7, 8, 9] as UtcOffset[]) {
    it(`matches the page scripts in UTC+${offset}`, () => {
      for (const now of instants) {
        const lines = panelLines(now, { id: 'x', name: 'Kota X', offset }, cfg);
        const h = toHijri(cityDate(now, offset));
        expect(lines.hijri).toBe(h ? formatHijri(h) : '');
        expect(lines.today).toBe(`${new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeZone: ZONE_IANA[offset] }).format(now)} · ${cityClock(now, offset)} ${ZONE_LABEL[offset]}`);
        expect(lines.greg).toBe(new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${cityDate(now, offset)}T00:00:00Z`)));
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
    expect(panelLines(0, { id: c.id, name: titleCase(c.name), offset: c.utcOffset }, cfg).from).toBe(`dari ${titleCase(c.name)}`);
  });
});

describe('resolvePlace', () => {
  const store = (data: Record<string, string>) => (k: string) => data[k] ?? null;
  const def = { id: '1301', name: 'Kota Jakarta', offset: 7 };
  const bandung = { id: '1', name: 'Kota Bandung', offset: 7 };
  it('uses the default city on a first visit', () => expect(resolvePlace(store({}), def)).toBe(def));
  it('uses the saved place note', () => {
    expect(resolvePlace(store({ 'bedug:city': '1', 'bedug:place': JSON.stringify(bandung) }), def)).toEqual(bandung);
  });
  it('defers when the city was saved before the note existed', () => expect(resolvePlace(store({ 'bedug:city': '1' }), def)).toBeNull());
  it('defers when the note belongs to another city', () => {
    expect(resolvePlace(store({ 'bedug:city': '2', 'bedug:place': JSON.stringify(bandung) }), def)).toBeNull();
  });
  it('defers when the note is not JSON', () => expect(resolvePlace(store({ 'bedug:city': '1', 'bedug:place': '{' }), def)).toBeNull());
});

describe('panelBoot', () => {
  const now = Date.parse('2026-11-04T09:00:00+07:00');
  const run = (data: Record<string, string>, linked: boolean) => {
    const els: Record<string, { textContent: string }> = { 'city-name': { textContent: 'Kota Jakarta' }, today: { textContent: '' }, hijri: { textContent: '' } };
    const def = { id: '1301', name: 'Kota Jakarta', offset: 7 };
    panelBoot(
      { ...cfg, linked: true, def, fill: { 'city-name': 'name', today: 'today', hijri: 'hijri', missing: 'name' } },
      { get: (k: string) => data[k] ?? null, linked, now, doc: { getElementById: (id: string) => els[id] ?? null } },
    );
    return els;
  };
  const bandung = { 'bedug:city': '1', 'bedug:place': JSON.stringify({ id: '1', name: 'Kota Bandung', offset: 7 }) };
  it('writes the name and dates for the saved city', () => {
    const els = run(bandung, false);
    expect(els['city-name'].textContent).toBe('Kota Bandung');
    expect(els.hijri.textContent).toBe('24 Jumadilawal 1448 H');
    expect(els.today.textContent).toMatch(/ · 09:00 WIB$/);
  });
  it('keeps the name on a shared link but still writes the dates', () => {
    const els = run(bandung, true);
    expect(els['city-name'].textContent).toBe('Kota Jakarta');
    expect(els.hijri.textContent).toBe('24 Jumadilawal 1448 H');
  });
  it('writes nothing when the saved city has no note yet', () => {
    const els = run({ 'bedug:city': '1' }, false);
    expect(els.hijri.textContent).toBe('');
  });
});
