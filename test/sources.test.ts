import { describe, expect, it } from 'vitest';
import { aladhan, creditFor, myquran, sourcesFor } from '../src/lib/sources';
import { placeById } from '../src/lib/cities';
import myquranMonth from './fixtures/myquran-1301-2026-11.json';
import aladhanMonth from './fixtures/aladhan-jakarta-2026-11.json';
import londonMonth from './fixtures/aladhan-london-2026-03.json';

describe('sources', () => {
  it('reads a myQuran month', () => {
    const days = myquran.parse(myquranMonth);
    expect(days).toHaveLength(30);
    expect(days[2]).toEqual({
      date: '2026-11-03', imsak: '03:58', subuh: '04:08', terbit: '05:23',
      dzuhur: '11:40', ashar: '14:56', maghrib: '17:50', isya: '19:01',
    });
  });

  it('reads an Aladhan month, dropping the "(WIB)" suffix', () => {
    const days = aladhan.parse(aladhanMonth);
    expect(days).toHaveLength(30);
    expect(days[0].date).toBe('2026-11-01');
    expect(Object.values(days[0]).slice(1).every((t) => /^\d\d:\d\d$/.test(t))).toBe(true);
  });

  it('rejects malformed responses so the other source can take over', () => {
    expect(() => myquran.parse({ status: false, message: 'error' })).toThrow();
    const broken = structuredClone(myquranMonth);
    broken.data.jadwal[5].isya = '-';
    expect(() => myquran.parse(broken)).toThrow(/bad isya/);
  });
});

describe('places', () => {
  const jakarta = placeById('1301')!;
  const london = placeById('geo:51.51,-0.13@Europe/London')!;
  const offJava = placeById('geo:-8.5,114.5@Asia/Jakarta')!;

  it('reads a London month, dropping the "(BST)" suffix', () => {
    const days = aladhan.parse(londonMonth);
    expect(days).toHaveLength(31);
    expect(days[28]).toEqual({ date: '2026-03-29', imsak: '04:36', subuh: '04:46', terbit: '06:43', dzuhur: '13:05', ashar: '16:33', maghrib: '19:29', isya: '21:19' });
    expect(days[27].subuh).toBe('03:49'); // GMT the day before the change
  });
  it('asks Aladhan for Kemenag angles in a kab/kota', () => {
    expect(aladhan.url(jakarta, 2026, 11)).toBe(
      `https://api.aladhan.com/v1/calendar/2026/11?latitude=${jakarta.lat}&longitude=${jakarta.lon}&method=20&timezonestring=Asia/Jakarta`,
    );
  });
  it('asks Aladhan for MWL with angle-based adjustment abroad', () => {
    expect(aladhan.url(london, 2026, 3)).toBe(
      'https://api.aladhan.com/v1/calendar/2026/3?latitude=51.51&longitude=-0.13&method=3&latitudeAdjustmentMethod=3&timezonestring=Europe/London',
    );
  });
  it('keeps method 20 for a spot in an Indonesian zone', () => expect(aladhan.url(offJava, 2026, 3)).toContain('&method=20&'));
  it('uses myQuran only for a kab/kota', () => {
    expect(myquran.covers(jakarta)).toBe(true);
    expect(myquran.covers(london)).toBe(false);
    expect(sourcesFor(jakarta, 'aladhan').map((s) => s.id)).toEqual(['aladhan', 'myquran']);
    expect(sourcesFor(jakarta, 'myquran').map((s) => s.id)).toEqual(['myquran', 'aladhan']);
    expect(sourcesFor(london, 'myquran').map((s) => s.id)).toEqual(['aladhan']);
  });
  it('says a located place is calculated, not Kemenag', () => {
    expect(creditFor(jakarta, myquran)).toBe('Sumber: myQuran (Kemenag)');
    expect(creditFor(london, aladhan)).toBe('Dihitung dari lokasi Anda (Aladhan, metode MWL). Bukan jadwal Kemenag.');
    expect(creditFor(offJava, aladhan)).toContain('metode Kemenag');
  });
});
