import { describe, expect, it } from 'vitest';
import { geoReason } from '../src/lib/geo';

describe('geoReason', () => {
  it('names each geolocation error', () => {
    expect(geoReason(1)).toBe('Izin lokasi ditolak');
    expect(geoReason(2)).toBe('Lokasi tidak ditemukan');
    expect(geoReason(3)).toBe('Lokasi terlalu lama dicari');
  });
  it('falls back for an unknown code', () => expect(geoReason(99)).toBe('Lokasi tidak tersedia'));
});
