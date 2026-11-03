import { describe, expect, it } from 'vitest';
import { aladhan, myquran } from '../src/lib/sources';
import myquranMonth from './fixtures/myquran-1301-2026-11.json';
import aladhanMonth from './fixtures/aladhan-jakarta-2026-11.json';

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
