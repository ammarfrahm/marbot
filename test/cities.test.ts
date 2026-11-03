import { describe, expect, it } from 'vitest';
import { titleCase } from '../src/lib/cities';

describe('titleCase', () => {
  it('capitalises each word', () => expect(titleCase('KAB. BANDUNG BARAT')).toBe('Kab. Bandung Barat'));
  it('keeps acronyms upper', () => {
    expect(titleCase('DKI JAKARTA')).toBe('DKI Jakarta');
    expect(titleCase('D.I. YOGYAKARTA')).toBe('D.I. Yogyakarta');
  });
});
