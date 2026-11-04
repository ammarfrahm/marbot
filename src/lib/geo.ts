import { STRINGS, type Lang } from './i18n';

/** Why a geolocation request failed, in a short phrase ("Izin lokasi ditolak"). */
export const geoReason = (code: number, lang: Lang = 'id') => STRINGS[lang].geo[code] ?? STRINGS[lang].geo.other;
