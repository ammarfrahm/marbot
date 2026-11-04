import { STRINGS, type Lang } from './i18n';

export const TIMES = ['imsak', 'subuh', 'terbit', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const;
export const PRAYERS = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const;

export type TimeName = (typeof TIMES)[number];
export type PrayerName = (typeof PRAYERS)[number];
/** One day of times in the place's local wall clock: date "YYYY-MM-DD", times "HH:MM". */
export type DaySchedule = { date: string } & Record<TimeName, string>;

/** Indonesia's three zones, which the app calls by their Indonesian names. */
export const ZONE_LABEL: Record<string, string> = { 'Asia/Jakarta': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' };

const DAY_MS = 86_400_000;

// tick() asks every second, and a formatter is costly to build.
const formats = new Map<string, Intl.DateTimeFormat>();
function format(kind: string, tz: string, locale: string, opts: Intl.DateTimeFormatOptions) {
  const key = `${kind}|${tz}`;
  let f = formats.get(key);
  if (!f) formats.set(key, (f = new Intl.DateTimeFormat(locale, { ...opts, timeZone: tz })));
  return f;
}

/** The place's calendar date ("YYYY-MM-DD") at instant `now`, `addDays` calendar days later (not 24 h steps, so DST days are right). */
export function placeDate(now: number, tz: string, addDays = 0): string {
  const date = format('date', tz, 'en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return addDays ? new Date(Date.parse(`${date}T00:00:00Z`) + addDays * DAY_MS).toISOString().slice(0, 10) : date;
}

/** The place's wall-clock time ("HH:MM") at instant `now`. */
export function placeClock(now: number, tz: string): string {
  return format('clock', tz, 'en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
}

/** WIB, WITA or WIT in Indonesia; elsewhere the zone's short name at `now` ("GMT", "GMT+1"), in the page's language. */
export function zoneLabel(tz: string, now: number, lang: Lang = 'id'): string {
  const locale = STRINGS[lang].zoneLocale;
  return ZONE_LABEL[tz] ?? format(`zone|${locale}`, tz, locale, { timeZoneName: 'short' }).formatToParts(now).find((p) => p.type === 'timeZoneName')?.value ?? tz;
}

/** How far the place's wall clock is ahead of UTC at instant `t`, in ms. */
function offsetAt(t: number, tz: string): number {
  const p = Object.fromEntries(
    format('wall', tz, 'en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' })
      .formatToParts(t).map((x) => [x.type, Number(x.value)]),
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000;
}

/** The instant (ms) of a place wall-clock time. A second pass settles times just after a DST change. */
export function toInstant(date: string, hhmm: string, tz: string): number {
  const wall = Date.parse(`${date}T${hhmm}:00Z`);
  const first = wall - offsetAt(wall, tz);
  return wall - offsetAt(first, tz);
}

/**
 * The instant of one of a row's times. Far from the equator Maghrib and Isya can pass midnight yet sit in the day's own row
 * (Oslo in June: Isya 00:11), so one earlier than the row's Dzuhur belongs to the next calendar day.
 */
export function rowInstant(day: DaySchedule, name: TimeName, tz: string): number {
  const late = (name === 'maghrib' || name === 'isya') && day[name] < day.dzuhur;
  return toInstant(late ? placeDate(Date.parse(`${day.date}T12:00:00Z`), 'UTC', 1) : day.date, day[name], tz);
}

export type PrayerTime = { name: PrayerName; date: string; time: string; at: number };

/** Every prayer in `days`, in time order. */
function prayerTimes(days: DaySchedule[], tz: string): PrayerTime[] {
  return days
    .flatMap((day) => PRAYERS.map((name) => ({ name, date: day.date, time: day[name], at: rowInstant(day, name, tz) })))
    .sort((a, b) => a.at - b.at);
}

/** First prayer strictly after `now`, or null when `days` doesn't reach that far. */
export function nextPrayer(days: DaySchedule[], now: number, tz: string): PrayerTime | null {
  return prayerTimes(days, tz).find((p) => p.at > now) ?? null;
}

/** Latest prayer at or before `now`, or null when `days` doesn't reach back that far. */
export function lastPrayer(days: DaySchedule[], now: number, tz: string): PrayerTime | null {
  return prayerTimes(days, tz).findLast((p) => p.at <= now) ?? null;
}

/** Time left until the target: "HH:MM:SS"; partial seconds round up, clamped at zero. */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const parts = [s / 3600, (s % 3600) / 60, s % 60].map((n) => String(Math.floor(n)).padStart(2, '0'));
  return parts.join(':');
}

export type MergedMonths<T> = { ok: true; days: DaySchedule[]; today: T; partial: boolean } | { ok: false; error: unknown };

/**
 * Combine the months fetched for yesterday, today and tomorrow (`months[i]` ↔ `results[i]`).
 * Only today's month is essential: a missing neighbour is `partial`, its days are simply absent.
 */
export function mergeMonths<T extends { days: DaySchedule[] }>(
  wanted: string[],
  todayDate: string,
  months: string[],
  results: PromiseSettledResult<T>[],
): MergedMonths<T> {
  const own = results[months.indexOf(todayDate.slice(0, 7))];
  if (own.status === 'rejected') return { ok: false, error: own.reason };
  const loaded = results.filter((r) => r.status === 'fulfilled');
  return {
    ok: true,
    days: loaded.flatMap((r) => r.value.days).filter((d) => wanted.includes(d.date)),
    today: own.value,
    partial: loaded.length < results.length,
  };
}

/** A cached month: the old shape was a bare array (no fetch time), the new one is `{ fetched, days }`. */
export function parseCachedMonth(raw: string): { fetched: number; days: DaySchedule[] } {
  const v = JSON.parse(raw);
  if (Array.isArray(v)) return { fetched: 0, days: v };
  if (Array.isArray(v?.days)) return { fetched: Number(v.fetched) || 0, days: v.days };
  throw new Error('bad cached month');
}

/** "subuh" → "Subuh" */
export const capitalise = (t: string) => t[0].toUpperCase() + t.slice(1);

/** The days to show while city `to` loads: those held for it when going back to a city just left, else none, so old times never sit under a new name. */
export const daysWhileLoading = (held: { cityId: string; days: DaySchedule[] } | undefined, to: string): DaySchedule[] =>
  held?.cityId === to ? held.days : [];
