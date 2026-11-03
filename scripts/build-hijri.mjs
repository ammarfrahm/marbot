// Builds src/data/hijri.json: the Gregorian date each Hijri month starts in Indonesia,
// by Kemenag's MABIMS criteria (2021): on the evening of the 29th, after the conjunction,
// the moon stands at least 3° high and 6.4° from the sun. Checked at Banda Aceh, the
// country's west end, where the young moon stands highest. Otherwise the month runs 30 days.
// Usage: node scripts/build-hijri.mjs
import { writeFile } from 'node:fs/promises';
import { AngleFromSun, Body, Equator, Horizon, Observer, SearchMoonPhase, SearchRiseSet } from 'astronomy-engine';

const ACEH = new Observer(5.55, 95.32, 0);
const DAY = 86_400_000;
const WIB = 7 * 3_600_000;
const FIRST = { year: 1444, month: 1 }; // 1 Muharram 1444, the first year under the 2021 criteria
const MONTHS = 12 * 17; // through 1460 H (2039)

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const wibMidnight = (date) => Date.parse(`${date}T00:00:00Z`) - WIB;

/** Does the new moon meet the criteria at sunset on this date (WIB)? */
function hilalVisible(date) {
  const sunset = SearchRiseSet(Body.Sun, ACEH, -1, new Date(wibMidnight(date)), 1);
  const conjunction = SearchMoonPhase(0, new Date(sunset.date.getTime() - 3 * DAY), 3);
  if (!conjunction || conjunction.date > sunset.date) return false;
  const moon = Equator(Body.Moon, sunset, ACEH, true, true);
  const altitude = Horizon(sunset, ACEH, moon.ra, moon.dec, 'normal').altitude;
  return altitude >= 3 && AngleFromSun(Body.Moon, sunset) >= 6.4;
}

// Seed: the first evening after the conjunction near the end of Zulhijah 1443.
const seedConjunction = SearchMoonPhase(0, new Date('2022-07-20T00:00:00Z'), 20).date;
let evening = iso(seedConjunction.getTime() + WIB);
while (!hilalVisible(evening)) evening = iso(Date.parse(evening) + DAY);
let start = Date.parse(evening) + DAY;

const starts = [];
for (let i = 0; i <= MONTHS; i++) { // one extra start closes the last month
  starts.push(iso(start));
  start += (hilalVisible(iso(start + 28 * DAY)) ? 29 : 30) * DAY;
}
await writeFile(new URL('../src/data/hijri.json', import.meta.url), JSON.stringify({ first: FIRST, starts }, null, 0) + '\n');
console.log(`${MONTHS} months, ${starts[0]} to ${starts.at(-1)}`);
