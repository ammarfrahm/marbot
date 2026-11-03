/** Why a geolocation request failed, in a short phrase ("Izin lokasi ditolak"). */
export const geoReason = (code: number) =>
  ({ 1: 'Izin lokasi ditolak', 2: 'Lokasi tidak ditemukan', 3: 'Lokasi terlalu lama dicari' } as Record<number, string>)[code] ?? 'Lokasi tidak tersedia';
