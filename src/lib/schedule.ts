export const TIMES = ['imsak', 'subuh', 'terbit', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const;
export const PRAYERS = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const;

export type TimeName = (typeof TIMES)[number];
export type PrayerName = (typeof PRAYERS)[number];
/** One day of times in the city's local wall clock: date "YYYY-MM-DD", times "HH:MM". */
export type DaySchedule = { date: string } & Record<TimeName, string>;
/** Indonesia has no DST, so a fixed offset is the whole timezone: WIB 7, WITA 8, WIT 9. */
export type UtcOffset = 7 | 8 | 9;

export const ZONE_LABEL: Record<UtcOffset, string> = { 7: 'WIB', 8: 'WITA', 9: 'WIT' };
export const ZONE_IANA: Record<UtcOffset, string> = {
  7: 'Asia/Jakarta',
  8: 'Asia/Makassar',
  9: 'Asia/Jayapura',
};

const DAY_MS = 86_400_000;

/** The city's calendar date ("YYYY-MM-DD") at instant `now`, `addDays` later. */
export function cityDate(now: number, offset: UtcOffset, addDays = 0): string {
  return new Date(now + offset * 3_600_000 + addDays * DAY_MS).toISOString().slice(0, 10);
}

/** The city's wall-clock time ("HH:MM") at instant `now`. */
export function cityClock(now: number, offset: UtcOffset): string {
  return new Date(now + offset * 3_600_000).toISOString().slice(11, 16);
}

/** The instant (ms) of a city wall-clock time. */
export function toInstant(date: string, hhmm: string, offset: UtcOffset): number {
  return Date.parse(`${date}T${hhmm}:00+0${offset}:00`);
}

export type NextPrayer = { name: PrayerName; date: string; time: string; at: number };

/** First prayer strictly after `now`, or null when `days` doesn't reach that far. */
export function nextPrayer(days: DaySchedule[], now: number, offset: UtcOffset): NextPrayer | null {
  for (const day of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const name of PRAYERS) {
      const at = toInstant(day.date, day[name], offset);
      if (at > now) return { name, date: day.date, time: day[name], at };
    }
  }
  return null;
}

/** "HH:MM:SS" until the target, clamped at zero. */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return [s / 3600, (s % 3600) / 60, s % 60].map((n) => String(Math.floor(n)).padStart(2, '0')).join(':');
}
