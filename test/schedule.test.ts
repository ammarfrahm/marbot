import { describe, expect, it } from 'vitest';
import { cityDate, formatCountdown, lastPrayer, nextPrayer, toInstant, type DaySchedule } from '../src/lib/schedule';

const day = (date: string, over: Partial<DaySchedule> = {}): DaySchedule => ({
  date, imsak: '03:58', subuh: '04:08', terbit: '05:23', dzuhur: '11:40',
  ashar: '14:56', maghrib: '17:50', isya: '19:01', ...over,
});
const at = (iso: string) => Date.parse(iso);

describe('city time', () => {
  it('reads the calendar date in the city, not in UTC', () => {
    // 2026-11-03 18:30 UTC is already 4 Nov in Jakarta (WIB) and Jayapura (WIT)
    expect(cityDate(at('2026-11-03T18:30:00Z'), 7)).toBe('2026-11-04');
    expect(cityDate(at('2026-11-03T16:30:00Z'), 7)).toBe('2026-11-03');
    expect(cityDate(at('2026-11-03T16:30:00Z'), 9)).toBe('2026-11-04');
  });

  it('turns a wall-clock time into an instant using the city offset', () => {
    expect(toInstant('2026-11-03', '04:08', 7)).toBe(at('2026-11-02T21:08:00Z'));
    expect(toInstant('2026-11-03', '04:08', 8)).toBe(at('2026-11-02T20:08:00Z'));
  });
});

describe('nextPrayer', () => {
  const days = [day('2026-11-04', { subuh: '04:07' }), day('2026-11-03')];

  it('skips Imsak and Terbit and picks the next of the five prayers', () => {
    // 05:00 WIB: Subuh has passed, Terbit is not a prayer, so Dzuhur is next
    expect(nextPrayer(days, at('2026-11-03T05:00:00+07:00'), 7)).toMatchObject({
      name: 'dzuhur', date: '2026-11-03', time: '11:40',
    });
  });

  it('rolls over to tomorrow’s Subuh after Isya', () => {
    expect(nextPrayer(days, at('2026-11-03T19:01:00+07:00'), 7)).toMatchObject({
      name: 'subuh', date: '2026-11-04', time: '04:07', at: at('2026-11-04T04:07:00+07:00'),
    });
  });

  it('returns null when tomorrow is not loaded yet', () => {
    expect(nextPrayer([day('2026-11-03')], at('2026-11-03T20:00:00+07:00'), 7)).toBeNull();
  });

  it('counts down in the city’s zone even when the viewer is elsewhere', () => {
    // 11:00 WITA in Makassar = 10:00 WIB; Dzuhur 11:40 WITA is 40 minutes away
    const next = nextPrayer([day('2026-11-03')], at('2026-11-03T11:00:00+08:00'), 8)!;
    expect(next.name).toBe('dzuhur');
    expect(next.at - at('2026-11-03T11:00:00+08:00')).toBe(40 * 60_000);
  });
});

describe('lastPrayer', () => {
  const days = [day('2026-11-03'), day('2026-11-02', { isya: '19:00' })];

  it('picks the prayer that has just begun, counting its exact minute', () => {
    expect(lastPrayer(days, at('2026-11-03T11:40:00+07:00'), 7)).toMatchObject({ name: 'dzuhur', date: '2026-11-03' });
  });

  it('reaches back to yesterday’s Isya before Subuh', () => {
    expect(lastPrayer(days, at('2026-11-03T02:00:00+07:00'), 7)).toMatchObject({
      name: 'isya', date: '2026-11-02', time: '19:00',
    });
  });

  it('returns null when yesterday is not loaded', () => {
    expect(lastPrayer([day('2026-11-03')], at('2026-11-03T02:00:00+07:00'), 7)).toBeNull();
  });
});

describe('formatCountdown', () => {
  it('formats as HH:MM:SS from an hour up', () => {
    expect(formatCountdown(3_723_000)).toBe('01:02:03');
    expect(formatCountdown(3_600_000)).toBe('01:00:00');
  });

  it('drops the hours under an hour, rounding partial seconds up', () => {
    expect(formatCountdown(3_599_000)).toBe('59:59');
    expect(formatCountdown(500)).toBe('00:01');
    expect(formatCountdown(-5)).toBe('00:00');
  });
});
