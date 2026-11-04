import { describe, expect, it } from 'vitest';
import source from '../src/lib/panel-boot.js?raw';
import table from '../src/data/hijri.json';
import { coordName, matchHint, placeLabel, placeById } from '../src/lib/cities';
import { locatedChange } from '../src/lib/city-dialog';
import { geoReason } from '../src/lib/geo';
import { formatHijri, hijriMonthName, hijriMonthOf, markedDays, toHijri, upcomingDays } from '../src/lib/hijri';
import { STRINGS } from '../src/lib/i18n';
import { announceTurn } from '../src/lib/qibla';
import { placeClock, placeDate, zoneLabel, ZONE_LABEL } from '../src/lib/schedule';

const { panelLines, resolvePlace } = new Function(`${source}; return { panelLines, resolvePlace };`)();

type Tree = { [key: string]: unknown };
const walk = (a: unknown, b: unknown, path: string, visit: (a: unknown, b: unknown, path: string) => void) => {
  if (a && typeof a === 'object' && !Array.isArray(a)) {
    expect(Object.keys(b as Tree).sort(), path).toEqual(Object.keys(a).sort());
    for (const k of Object.keys(a)) walk((a as Tree)[k], (b as Tree)[k], `${path}.${k}`, visit);
  } else visit(a, b, path);
};

describe('dictionary', () => {
  const sample = [2, 'a', true] as const;
  const call = (f: unknown) => (f as (...args: unknown[]) => unknown)(...sample);
  it('gives every English key a non-empty value', () => {
    walk(STRINGS.id, STRINGS.en, 'strings', (id, en, path) => {
      if (Array.isArray(id)) {
        expect(en, path).toHaveLength(id.length);
        for (const item of en as string[]) expect(item.length, path).toBeGreaterThan(0);
      } else if (typeof id === 'function') {
        expect(typeof en, path).toBe('function');
        expect(String(call(en)).length, path).toBeGreaterThan(0);
      } else expect((en as string).length, path).toBeGreaterThan(0);
    });
  });
  it('translates every sentence', () => {
    // Names that read the same in both languages.
    const same = new Set(['strings.menu', 'strings.prayer.imsak', 'strings.prayer.maghrib', 'strings.sources.mwl', 'strings.hijri.months', 'strings.hijri.days.ashura']);
    const untranslated: string[] = [];
    walk(STRINGS.id, STRINGS.en, 'strings', (id, en, path) => {
      const [a, b] = typeof id === 'function' ? [call(id), call(en)] : [id, en];
      if (JSON.stringify(a) === JSON.stringify(b) && !same.has(path)) untranslated.push(path);
    });
    expect(untranslated).toEqual([]);
  });
});

describe('English helpers', () => {
  it('names the Hijri months and era', () => {
    expect(hijriMonthName(9, 'en')).toBe('Ramadan');
    expect(hijriMonthName(9)).toBe('Ramadan');
    expect(hijriMonthName(3, 'en')).toBe("Rabi' al-Awwal");
    expect(formatHijri({ day: 24, month: 5, year: 1448 }, 'en')).toBe('24 Jumada al-Ula 1448 AH');
    expect(formatHijri({ day: 24, month: 5, year: 1448 })).toBe('24 Jumadilawal 1448 H');
  });
  it('names marked days in the language', () => {
    expect(upcomingDays('2026-11-04', 2, 'en').every((d) => /^[\x20-\x7e]+$/.test(d.name) && !/Hari|Idul|Tahun/.test(d.name))).toBe(true);
    const m = hijriMonthOf('2027-03-12')!;
    const days = (lang: 'id' | 'en') => markedDays(m, lang);
    expect(days('en').map((d) => d.date)).toEqual(days('id').map((d) => d.date));
    expect(days('en').length).toBeGreaterThan(0);
    expect(days('en').map((d) => d.name)).not.toEqual(days('id').map((d) => d.name));
  });
  it('names a spot by coordinates with English letters', () => {
    expect(coordName(51.51, -0.13, 'en')).toBe('51.51° N 0.13° W');
    expect(coordName(-6.2, 106.82, 'en')).toBe('6.20° S 106.82° E');
    expect(coordName(51.51, -0.13)).toBe('51,51° LU 0,13° BB');
    expect(placeLabel(placeById('geo:51.51,-0.13@Europe/London')!, 'en')).toBe('51.51° N 0.13° W (London time zone)');
  });
  it('speaks English in hints, reasons and announcements', () => {
    expect(matchHint([], true, 'en')).toBe('No city found. Try another name, or use My location.');
    expect(matchHint([], false, 'en')).toBe('No city found. Try another name.');
    expect(geoReason(1, 'en')).toBe('Location permission denied');
    expect(geoReason(99, 'en')).toBe('Location unavailable');
    expect(announceTurn(null, 30, false, 0, 'en').say).toBe('Turn right 30°');
    const spot = placeById('geo:51.51,-0.13@Europe/London')!;
    const city = placeById('1301')!;
    expect(locatedChange(city, spot, 'en').note).toBe('Outside Indonesia: times are calculated from your location.');
  });
  it('labels a foreign zone in the page language and keeps WIB', () => {
    expect(zoneLabel('Asia/Jakarta', 0, 'en')).toBe('WIB');
    expect(zoneLabel('Europe/London', Date.parse('2026-07-01T10:00:00Z'), 'en')).toBe('BST');
    expect(zoneLabel('Europe/London', Date.parse('2026-07-01T10:00:00Z'))).toBe('GMT+1');
  });
});

describe('panelLines in English', () => {
  const t = (lang: 'en') => {
    const s = STRINGS[lang];
    return { locale: s.locale, zoneLocale: s.zoneLocale, decimal: s.decimal, hemisphere: s.hemisphere, era: s.hijri.era, fromPrefix: s.fromPlace('') };
  };
  const cfg = { starts: table.starts, first: table.first, months: STRINGS.en.hijri.months, zones: ZONE_LABEL, t: t('en') };
  const jakarta = { id: '1301', name: 'Kota Jakarta', tz: 'Asia/Jakarta' };
  it('matches the page scripts in the page language', () => {
    for (const now of [Date.parse('2026-11-04T09:00:00+07:00'), Date.parse('2026-11-04T23:59:00+07:00')]) {
      const lines = panelLines(now, jakarta, cfg);
      const h = toHijri(placeDate(now, jakarta.tz))!;
      expect(lines.hijri).toBe(formatHijri(h, 'en'));
      expect(lines.today).toBe(`${new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeZone: jakarta.tz }).format(now)} · ${placeClock(now, jakarta.tz)} WIB`);
      expect(lines.greg).toBe(new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${placeDate(now, jakarta.tz)}T00:00:00Z`)));
    }
  });
  it('says "from" and names a London spot in English', () => {
    expect(panelLines(0, jakarta, cfg).from).toBe('from Kota Jakarta');
    const id = 'geo:51.51,-0.13@Europe/London';
    const place = resolvePlace([id], { def: jakarta, cities: {}, t: cfg.t });
    expect(place.name).toBe('51.51° N 0.13° W');
    const now = Date.parse('2026-07-01T10:00:00Z');
    expect(panelLines(now, place, cfg).today).toMatch(/ · 11:00 BST$/);
    expect(place.name).toBe(coordName(51.51, -0.13, 'en'));
  });
});
