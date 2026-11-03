import { TIMES, ZONE_IANA, type DaySchedule, type TimeName } from './schedule';
import type { City } from './cities';

export type SourceId = 'myquran' | 'aladhan';
export type Source = {
  id: SourceId;
  label: string;
  url(city: City, year: number, month: number): string;
  parse(json: unknown): DaySchedule[];
};

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
  label: 'myQuran · jadwal resmi Kemenag',
  url: (city, year, month) => `https://api.myquran.com/v2/sholat/jadwal/${city.id}/${year}/${pad(month)}`,
  parse(json) {
    const jadwal = (json as { data?: { jadwal?: Record<string, unknown>[] } })?.data?.jadwal;
    if (!Array.isArray(jadwal)) throw new Error('myQuran: no jadwal');
    const keys = Object.fromEntries(TIMES.map((t) => [t, t])) as Record<TimeName, string>;
    return checked(jadwal.map((d) => ({ date: String(d.date), ...pick(d, keys) })));
  },
};

/** Calculated with Kemenag angles (method 20), without Kemenag's ihtiyat, so 2–4 min earlier. */
export const aladhan: Source = {
  id: 'aladhan',
  label: 'Aladhan · hitungan Kemenag',
  url: (city, year, month) =>
    `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${city.lat}&longitude=${city.lon}` +
    `&method=20&timezonestring=${ZONE_IANA[city.utcOffset]}`,
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
