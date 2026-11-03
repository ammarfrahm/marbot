import { describe, expect, it } from 'vitest';
import { addDays, formatHijri, hijriMonthOf, shiftMonth, toHijri, upcomingDays } from '../src/lib/hijri';

// Dates Kemenag announced after sidang isbat, or national holidays set by SKB.
const ANNOUNCED: [string, string][] = [
  ['2022-07-30', '1 Muharam 1444 H'],
  ['2023-03-23', '1 Ramadan 1444 H'],
  ['2023-04-22', '1 Syawal 1444 H'],
  ['2023-06-29', '10 Zulhijah 1444 H'],
  ['2023-07-19', '1 Muharam 1445 H'],
  ['2024-03-12', '1 Ramadan 1445 H'],
  ['2024-04-10', '1 Syawal 1445 H'],
  ['2024-06-17', '10 Zulhijah 1445 H'],
  ['2024-07-07', '1 Muharam 1446 H'],
  ['2025-03-01', '1 Ramadan 1446 H'],
  ['2025-03-31', '1 Syawal 1446 H'],
  ['2025-06-06', '10 Zulhijah 1446 H'],
  ['2025-06-27', '1 Muharam 1447 H'],
  ['2026-02-19', '1 Ramadan 1447 H'], // Umm al-Qura has 18 February
];

describe('toHijri', () => {
  it.each(ANNOUNCED)('%s is %s', (date, hijri) => {
    expect(formatHijri(toHijri(date)!)).toBe(hijri);
  });

  it('turns the month over between the 29th or 30th and the 1st', () => {
    expect(formatHijri(toHijri('2026-11-03')!)).toBe('23 Jumadilawal 1448 H');
    expect(formatHijri(toHijri('2026-10-11')!)).toBe('29 Rabiulakhir 1448 H');
    expect(formatHijri(toHijri('2026-10-12')!)).toBe('1 Jumadilawal 1448 H');
  });

  it('returns null outside the table', () => {
    expect(toHijri('2020-01-01')).toBeNull();
    expect(toHijri('2045-01-01')).toBeNull();
  });
});

describe('months', () => {
  it('last 29 or 30 days, back to back', () => {
    let m = hijriMonthOf('2022-07-30');
    for (; m; m = shiftMonth(m, 1)) {
      expect([29, 30]).toContain(m.length);
      const next = shiftMonth(m, 1);
      if (next) expect(next.start).toBe(addDays(m.start, m.length));
    }
  });

  it('shifts across the year boundary', () => {
    const zulhijah = hijriMonthOf('2026-05-27')!;
    expect(shiftMonth(zulhijah, 1)).toMatchObject({ year: 1448, month: 1 });
    expect(shiftMonth(shiftMonth(zulhijah, 1)!, -1)).toEqual(zulhijah);
  });
});

describe('upcomingDays', () => {
  it('lists marked days from today on, in order, flagging the ones set by sidang isbat', () => {
    const days = upcomingDays('2026-11-03', 4);
    expect(days.map((d) => d.name)).toEqual(['Isra Mikraj', 'Nisfu Syakban', 'Awal Ramadan', 'Nuzulul Quran']);
    expect(days[2]).toMatchObject({ date: '2027-02-08', isbat: true });
    expect(days[0].isbat).toBe(false);
  });

  it('includes a marked day that is today', () => {
    expect(upcomingDays('2026-05-27', 1)[0]).toMatchObject({ name: 'Iduladha', date: '2026-05-27' });
  });
});
