import { TIMES, ZONE_LABEL, type DaySchedule, type TimeName } from './schedule';
import type { Place } from './cities';

export type SourceId = 'myquran' | 'aladhan';
export type Source = {
  id: SourceId;
  /** Short name for status messages. */
  name: string;
  /** The credit line under the times. */
  credit: string;
  label: string;
  /** Whether this source has times for the place. */
  covers(place: Place): boolean;
  url(place: Place, year: number, month: number): string;
  parse(json: unknown): DaySchedule[];
};

/** Kemenag's angles apply to the kab/kota and to anywhere in an Indonesian zone (a Spot at sea off Indonesia). */
export const isKemenag = (place: Place) => place.kind === 'city' || Object.hasOwn(ZONE_LABEL, place.tz);

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const pad = (n: number) => String(n).padStart(2, '0');

// API responses are untrusted: reject anything that isn't a full, well-formed month.
function checked(days: DaySchedule[]): DaySchedule[] {
  if (days.length < 28) throw new Error(`expected a month of days, got ${days.length}`);
  for (const day of days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date)) throw new Error(`bad date ${day.date}`);
    for (const t of TIMES) if (!HHMM.test(day[t])) throw new Error(`bad ${t} on ${day.date}: ${day[t]}`);
  }
  return days;
}

const pick = (raw: Record<string, unknown>, keys: Record<TimeName, string>) =>
  Object.fromEntries(TIMES.map((t) => [t, String(raw[keys[t]] ?? '').slice(0, 5)])) as Record<TimeName, string>;

/** Official Kemenag RI (Bimas Islam) schedule, includes ihtiyat. */
export const myquran: Source = {
  id: 'myquran',
  name: 'myQuran',
  credit: 'myQuran (Kemenag)',
  label: 'myQuran · jadwal resmi Kemenag',
  covers: (place) => place.kind === 'city',
  url: (place, year, month) => `https://api.myquran.com/v2/sholat/jadwal/${place.id}/${year}/${pad(month)}`,
  parse(json) {
    const jadwal = (json as { data?: { jadwal?: Record<string, unknown>[] } })?.data?.jadwal;
    if (!Array.isArray(jadwal)) throw new Error('myQuran: no jadwal');
    const keys = Object.fromEntries(TIMES.map((t) => [t, t])) as Record<TimeName, string>;
    return checked(jadwal.map((d) => ({ date: String(d.date), ...pick(d, keys) })));
  },
};

/**
 * Calculated, anywhere. In Indonesia it uses Kemenag angles (method 20) without Kemenag's ihtiyat, so 2–4 min earlier.
 * Elsewhere it uses the Muslim World League (method 3), with angle-based adjustment because the sun barely sets in high latitudes.
 */
export const aladhan: Source = {
  id: 'aladhan',
  name: 'Aladhan',
  credit: 'Aladhan',
  label: 'Aladhan · hitungan, bisa 2–4 menit lebih awal',
  covers: () => true,
  url: (place, year, month) =>
    `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${place.lat}&longitude=${place.lon}` +
    (isKemenag(place) ? '&method=20' : '&method=3&latitudeAdjustmentMethod=3') +
    `&timezonestring=${encodeURIComponent(place.tz)}`,
  parse(json) {
    type Day = { timings: Record<string, unknown>; date: { gregorian: { date: string } } };
    const data = (json as { data?: Day[] })?.data;
    if (!Array.isArray(data)) throw new Error('Aladhan: no data');
    const keys = {
      imsak: 'Imsak', subuh: 'Fajr', terbit: 'Sunrise', dzuhur: 'Dhuhr',
      ashar: 'Asr', maghrib: 'Maghrib', isya: 'Isha',
    };
    return checked(
      data.map((d) => {
        const [dd, mm, yyyy] = String(d.date?.gregorian?.date).split('-');
        return { date: `${yyyy}-${mm}-${dd}`, ...pick(d.timings ?? {}, keys) };
      }),
    );
  },
};

export const SOURCES: Record<SourceId, Source> = { myquran, aladhan };

/** The sources that can serve the place, the preferred one first. */
export const sourcesFor = (place: Place, preferred: SourceId): Source[] =>
  [SOURCES[preferred], ...Object.values(SOURCES).filter((s) => s.id !== preferred)].filter((s) => s.covers(place));

/** The line under the times: who made them, and for a Spot that they are calculated, not Kemenag's. */
export const creditFor = (place: Place, source: Source) =>
  place.kind === 'city'
    ? `Sumber: ${source.credit}`
    : `Dihitung dari titik ini (Aladhan, metode ${isKemenag(place) ? 'sudut Kemenag' : 'MWL'}). Bukan jadwal Kemenag.`;
