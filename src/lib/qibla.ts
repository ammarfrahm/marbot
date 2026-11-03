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
