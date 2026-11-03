import table from '../data/hijri.json';

/** Month names as Kemenag's calendar spells them. */
export const HIJRI_MONTHS = [
  'Muharam', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jumadilawal', 'Jumadilakhir',
  'Rajab', 'Syakban', 'Ramadan', 'Syawal', 'Zulkaidah', 'Zulhijah',
] as const;

export type HijriDate = { year: number; month: number; day: number };
export type HijriMonth = { year: number; month: number; start: string; length: number };
export type HariPenting = { date: string; hijri: HijriDate; name: string; isbat: boolean };

/** Days marked on the calendar. `isbat`: the month's start is set by Kemenag's sidang isbat. */
const MARKED: { month: number; day: number; name: string }[] = [
  { month: 1, day: 1, name: 'Tahun Baru Islam' },
  { month: 1, day: 10, name: 'Asyura' },
  { month: 3, day: 12, name: 'Maulid Nabi' },
  { month: 7, day: 27, name: 'Isra Mikraj' },
  { month: 8, day: 15, name: 'Nisfu Syakban' },
  { month: 9, day: 1, name: 'Awal Ramadan' },
  { month: 9, day: 17, name: 'Nuzulul Quran' },
  { month: 10, day: 1, name: 'Idulfitri' },
  { month: 12, day: 9, name: 'Hari Arafah' },
  { month: 12, day: 10, name: 'Iduladha' },
];
const ISBAT_MONTHS = [9, 10, 12];

const DAY = 86_400_000;
const ms = (date: string) => Date.parse(`${date}T00:00:00Z`);
/** yyyy-mm-dd plus n days. */
export const addDays = (date: string, n: number) => new Date(ms(date) + n * DAY).toISOString().slice(0, 10);

const { first, starts } = table;
const monthAt = (i: number): HijriMonth => ({
  year: first.year + Math.floor((first.month - 1 + i) / 12),
  month: ((first.month - 1 + i) % 12) + 1,
  start: starts[i],
  length: (ms(starts[i + 1]) - ms(starts[i])) / DAY,
});
// The last start only closes the month before it.
const monthCount = starts.length - 1;

/** The Hijri month a Gregorian date (yyyy-mm-dd) falls in; null outside the table (1444–1460 H). */
export function hijriMonthOf(date: string): HijriMonth | null {
  const i = starts.findLastIndex((s) => s <= date);
  return i >= 0 && i < monthCount ? monthAt(i) : null;
}

export function toHijri(date: string): HijriDate | null {
  const m = hijriMonthOf(date);
  return m && { year: m.year, month: m.month, day: (ms(date) - ms(m.start)) / DAY + 1 };
}

/** The month `offset` months after the one holding `date`. */
export function shiftMonth(m: HijriMonth, offset: number): HijriMonth | null {
  const i = (m.year - first.year) * 12 + m.month - first.month + offset;
  return i >= 0 && i < monthCount ? monthAt(i) : null;
}

export const formatHijri = (h: HijriDate) => `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} H`;

/** Marked days in a month, in order. */
export function markedDays(m: HijriMonth): HariPenting[] {
  return MARKED.filter((d) => d.month === m.month).map((d) => ({
    date: addDays(m.start, d.day - 1),
    hijri: { year: m.year, month: m.month, day: d.day },
    name: d.name,
    isbat: ISBAT_MONTHS.includes(d.month),
  }));
}

/** The next `count` marked days from `date` on, today included. */
export function upcomingDays(date: string, count: number): HariPenting[] {
  const found: HariPenting[] = [];
  for (let m = hijriMonthOf(date); m && found.length < count; m = shiftMonth(m, 1)) {
    found.push(...markedDays(m).filter((d) => d.date >= date));
  }
  return found.slice(0, count);
}
