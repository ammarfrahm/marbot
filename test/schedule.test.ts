import { describe, expect, it } from 'vitest';
import { daysWhileLoading, formatCountdown, lastPrayer, mergeMonths, nextPrayer, parseCachedMonth, placeClock, placeDate, rowInstant, toInstant, zoneLabel, type DaySchedule } from '../src/lib/schedule';

const day = (date: string, over: Partial<DaySchedule> = {}): DaySchedule => ({
  date, imsak: '03:58', subuh: '04:08', terbit: '05:23', dzuhur: '11:40',
  ashar: '14:56', maghrib: '17:50', isya: '19:01', ...over,
});
const at = (iso: string) => Date.parse(iso);
const WIB = 'Asia/Jakarta';
const WITA = 'Asia/Makassar';
const WIT = 'Asia/Jayapura';

describe('place time', () => {
  it('reads the calendar date in the place, not in UTC', () => {
    // 2026-11-03 18:30 UTC is already 4 Nov in Jakarta (WIB) and Jayapura (WIT)
    expect(placeDate(at('2026-11-03T18:30:00Z'), WIB)).toBe('2026-11-04');
    expect(placeDate(at('2026-11-03T16:30:00Z'), WIB)).toBe('2026-11-03');
    expect(placeDate(at('2026-11-03T16:30:00Z'), WIT)).toBe('2026-11-04');
  });

  it('steps calendar days, which are not always 24 hours', () => {
    expect(placeDate(at('2026-03-28T12:00:00Z'), 'Europe/London', 1)).toBe('2026-03-29');
    expect(placeDate(at('2026-03-28T12:00:00Z'), 'Europe/London', 2)).toBe('2026-03-30');
    expect(placeDate(at('2026-03-30T12:00:00Z'), 'Europe/London', -2)).toBe('2026-03-28');
    expect(placeDate(at('2026-10-25T00:30:00Z'), 'Europe/London', 1)).toBe('2026-10-26');
    expect(placeDate(at('2026-12-31T12:00:00Z'), WIB, 1)).toBe('2027-01-01');
  });

  it('reads the clock in the place', () => {
    expect(placeClock(at('2026-11-03T18:30:00Z'), WIB)).toBe('01:30');
    expect(placeClock(at('2026-11-03T15:05:00Z'), 'Asia/Tokyo')).toBe('00:05');
    expect(placeClock(at('2026-07-01T23:30:00Z'), 'Europe/London')).toBe('00:30');
  });

  it('turns a wall-clock time into an instant', () => {
    expect(toInstant('2026-11-03', '04:08', WIB)).toBe(at('2026-11-02T21:08:00Z'));
    expect(toInstant('2026-11-03', '04:08', WITA)).toBe(at('2026-11-02T20:08:00Z'));
    expect(toInstant('2026-11-03', '04:08', 'Asia/Tokyo')).toBe(at('2026-11-02T19:08:00Z'));
    expect(toInstant('2026-11-03', '04:08', 'America/New_York')).toBe(at('2026-11-03T09:08:00Z'));
  });

  it('follows London across the spring change (29 Mar 2026, 01:00 UTC)', () => {
    expect(toInstant('2026-03-28', '12:00', 'Europe/London')).toBe(at('2026-03-28T12:00:00Z'));
    expect(toInstant('2026-03-29', '04:46', 'Europe/London')).toBe(at('2026-03-29T03:46:00Z'));
    expect(toInstant('2026-03-29', '00:30', 'Europe/London')).toBe(at('2026-03-29T00:30:00Z'));
    expect(toInstant('2026-03-30', '05:00', 'Europe/London')).toBe(at('2026-03-30T04:00:00Z'));
  });

  it('follows London across the autumn change (25 Oct 2026, 01:00 UTC)', () => {
    expect(toInstant('2026-10-24', '12:00', 'Europe/London')).toBe(at('2026-10-24T11:00:00Z'));
    expect(toInstant('2026-10-25', '06:00', 'Europe/London')).toBe(at('2026-10-25T06:00:00Z'));
    expect(toInstant('2026-10-26', '06:00', 'Europe/London')).toBe(at('2026-10-26T06:00:00Z'));
  });

  it('follows New York across its change (8 Mar 2026)', () => {
    expect(toInstant('2026-03-07', '12:00', 'America/New_York')).toBe(at('2026-03-07T17:00:00Z'));
    expect(toInstant('2026-03-08', '12:00', 'America/New_York')).toBe(at('2026-03-08T16:00:00Z'));
  });

  it('names the zone: WIB, WITA, WIT in Indonesia, the Intl name elsewhere', () => {
    expect(zoneLabel(WIB, 0)).toBe('WIB');
    expect(zoneLabel(WITA, 0)).toBe('WITA');
    expect(zoneLabel(WIT, 0)).toBe('WIT');
    expect(zoneLabel('Europe/London', at('2026-01-15T12:00:00Z'))).toBe('GMT');
    expect(zoneLabel('Europe/London', at('2026-07-15T12:00:00Z'))).toBe('GMT+1');
    expect(zoneLabel('Asia/Tokyo', at('2026-07-15T12:00:00Z'))).toBe('GMT+9');
  });
});

describe('nextPrayer', () => {
  const days = [day('2026-11-04', { subuh: '04:07' }), day('2026-11-03')];

  it('skips Imsak and Terbit and picks the next of the five prayers', () => {
    // 05:00 WIB: Subuh has passed, Terbit is not a prayer, so Dzuhur is next
    expect(nextPrayer(days, at('2026-11-03T05:00:00+07:00'), WIB)).toMatchObject({
      name: 'dzuhur', date: '2026-11-03', time: '11:40',
    });
  });

  it('rolls over to tomorrow’s Subuh after Isya', () => {
    expect(nextPrayer(days, at('2026-11-03T19:01:00+07:00'), WIB)).toMatchObject({
      name: 'subuh', date: '2026-11-04', time: '04:07', at: at('2026-11-04T04:07:00+07:00'),
    });
  });

  it('returns null when tomorrow is not loaded yet', () => {
    expect(nextPrayer([day('2026-11-03')], at('2026-11-03T20:00:00+07:00'), WIB)).toBeNull();
  });

  it('counts down in the city’s zone even when the viewer is elsewhere', () => {
    // 11:00 WITA in Makassar = 10:00 WIB; Dzuhur 11:40 WITA is 40 minutes away
    const next = nextPrayer([day('2026-11-03')], at('2026-11-03T11:00:00+08:00'), WITA)!;
    expect(next.name).toBe('dzuhur');
    expect(next.at - at('2026-11-03T11:00:00+08:00')).toBe(40 * 60_000);
  });
});

describe('prayers after midnight', () => {
  // Oslo in June (Aladhan, MWL, angle-based): Isya is listed in the row of the day it follows, but falls just after midnight.
  const oslo = 'Europe/Oslo';
  const days = [
    day('2026-06-21', { subuh: '02:21', dzuhur: '13:20', ashar: '17:30', maghrib: '22:50', isya: '00:12' }),
    day('2026-06-22', { subuh: '02:21', dzuhur: '13:20', ashar: '17:30', maghrib: '22:50', isya: '00:12' }),
  ];
  it('puts Isya at 00:12 the same night, in the next calendar day', () => {
    expect(nextPrayer(days, at('2026-06-21T23:30:00+02:00'), oslo)).toMatchObject({ name: 'isya', date: '2026-06-21', at: at('2026-06-22T00:12:00+02:00') });
  });
  it('then Subuh follows that Isya', () => {
    const now = at('2026-06-22T00:30:00+02:00');
    expect(lastPrayer(days, now, oslo)).toMatchObject({ name: 'isya', at: at('2026-06-22T00:12:00+02:00') });
    expect(nextPrayer(days, now, oslo)).toMatchObject({ name: 'subuh', date: '2026-06-22', time: '02:21' });
  });
  it('leaves a row whose Isya is in the evening alone', () => {
    expect(rowInstant(day('2026-11-03'), 'isya', WIB)).toBe(at('2026-11-03T19:01:00+07:00'));
  });
});

describe('lastPrayer', () => {
  const days = [day('2026-11-03'), day('2026-11-02', { isya: '19:00' })];

  it('picks the prayer that has just begun, counting its exact minute', () => {
    expect(lastPrayer(days, at('2026-11-03T11:40:00+07:00'), WIB)).toMatchObject({ name: 'dzuhur', date: '2026-11-03' });
  });

  it('reaches back to yesterday’s Isya before Subuh', () => {
    expect(lastPrayer(days, at('2026-11-03T02:00:00+07:00'), WIB)).toMatchObject({
      name: 'isya', date: '2026-11-02', time: '19:00',
    });
  });

  it('returns null when yesterday is not loaded', () => {
    expect(lastPrayer([day('2026-11-03')], at('2026-11-03T02:00:00+07:00'), WIB)).toBeNull();
  });
});

describe('formatCountdown', () => {
  it('formats as HH:MM:SS from an hour up', () => {
    expect(formatCountdown(3_723_000)).toBe('01:02:03');
    expect(formatCountdown(3_600_000)).toBe('01:00:00');
  });

  it('keeps the hours under an hour, rounding partial seconds up', () => {
    expect(formatCountdown(3_599_000)).toBe('00:59:59');
    expect(formatCountdown(500)).toBe('00:00:01');
    expect(formatCountdown(-5)).toBe('00:00:00');
  });
});

describe('mergeMonths', () => {
  // last day of November: yesterday and today are in 2026-11, tomorrow in 2026-12
  const wanted = ['2026-11-29', '2026-11-30', '2026-12-01'];
  const months = ['2026-11', '2026-12'];
  const nov = { days: [day('2026-11-29'), day('2026-11-30'), day('2026-11-28')] };
  const dec = { days: [day('2026-12-01'), day('2026-12-02')] };
  const ok = (value: typeof nov): PromiseSettledResult<typeof nov> => ({ status: 'fulfilled', value });
  const fail = (reason: unknown): PromiseSettledResult<typeof nov> => ({ status: 'rejected', reason });

  it('merges every month that loaded and keeps only the wanted days', () => {
    const m = mergeMonths(wanted, '2026-11-30', months, [ok(nov), ok(dec)]);
    expect(m).toMatchObject({ ok: true, partial: false, today: nov });
    expect(m.ok && m.days.map((d) => d.date)).toEqual(['2026-11-29', '2026-11-30', '2026-12-01']);
  });

  it('shows today when only next month is missing', () => {
    const m = mergeMonths(wanted, '2026-11-30', months, [ok(nov), fail(new Error('offline'))]);
    expect(m).toMatchObject({ ok: true, partial: true });
    expect(m.ok && m.days.map((d) => d.date)).toEqual(['2026-11-29', '2026-11-30']);
  });

  it('fails with the reason when today\'s month is missing', () => {
    const err = new Error('offline');
    expect(mergeMonths(wanted, '2026-11-30', months, [fail(err), ok(dec)])).toEqual({ ok: false, error: err });
  });

  it('handles a single month', () => {
    const m = mergeMonths(['2026-11-03'], '2026-11-03', ['2026-11'], [ok(nov)]);
    expect(m).toMatchObject({ ok: true, partial: false });
  });
});

describe('parseCachedMonth', () => {
  const days = [day('2026-11-03')];
  it('reads the old plain array', () => {
    expect(parseCachedMonth(JSON.stringify(days))).toEqual({ fetched: 0, days });
  });
  it('reads the { fetched, days } shape', () => {
    expect(parseCachedMonth(JSON.stringify({ fetched: 5, days }))).toEqual({ fetched: 5, days });
  });
  it('rejects anything else', () => {
    expect(() => parseCachedMonth('{"x":1}')).toThrow();
    expect(() => parseCachedMonth('not json')).toThrow();
  });
});

describe('daysWhileLoading', () => {
  const days = [day('2026-11-03')];
  const held = { cityId: '1301', days };
  it('clears the days when another city loads', () => {
    expect(daysWhileLoading(held, '0101')).toEqual([]);
    expect(daysWhileLoading(undefined, '0101')).toEqual([]);
  });
  it('restores the held days when going back to that city', () => expect(daysWhileLoading(held, '1301')).toBe(days));
});
