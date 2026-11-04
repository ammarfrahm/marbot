import { STRINGS, type Lang } from './i18n';

/** The Kaaba, Masjidil Haram. */
export const KAABA = { lat: 21.422487, lon: 39.826206 };

const rad = Math.PI / 180;

/** Great-circle direction to the Kaaba, in degrees clockwise from true north. */
export function qiblaBearing(lat: number, lon: number): number {
  const φ1 = lat * rad;
  const φ2 = KAABA.lat * rad;
  const Δλ = (KAABA.lon - lon) * rad;
  const y = Math.sin(Δλ);
  const x = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
  return (Math.atan2(y, x) / rad + 360) % 360;
}

/** Signed turn from `heading` to `bearing`, in (-180, 180]: positive turns right. */
export const turnTo = (heading: number, bearing: number) => 180 - ((((180 - bearing + heading) % 360) + 360) % 360);

export type Said = { turn: number; at: number; aligned: boolean };

/**
 * What a screen reader should hear for the current signed `turn` (null: nothing new). Orientation events
 * arrive ~60 times a second, so guidance is spoken only when the turn moved 10° or more and 2 s have passed;
 * reaching the qibla is spoken at once.
 */
export function announceTurn(prev: Said | null, turn: number, aligned: boolean, now: number, lang: Lang = 'id'): { say: string | null; next: Said | null } {
  const stay = { say: null, next: prev };
  const next = { turn, at: now, aligned };
  const t = STRINGS[lang].kiblat;
  if (aligned) return prev?.aligned ? stay : { say: t.announceAligned, next };
  const text = t.announceTurn(turn > 0, Math.round(Math.abs(turn) / 10) * 10);
  if (!prev || prev.aligned) return { say: text, next };
  if (now - prev.at < 2000 || Math.abs(turn - prev.turn) < 10) return stay;
  return { say: text, next };
}
