# Marbot

Prayer times, qibla direction and the Hijri calendar for every kabupaten and kota in Indonesia, and for wherever you are abroad. It is a small installable web app that opens on the countdown to the next prayer and keeps working offline.

**Live:** [marbot.ammar.id](https://marbot.ammar.id)

## What it does

- **Jadwal:** today's Imsak, Subuh, Terbit, Dzuhur, Ashar, Maghrib and Isya, plus a countdown to the next prayer. The countdown also shows in the tab title. Times are always in the city's own zone (WIB, WITA or WIT).
- **Kiblat:** the great-circle bearing to the Ka'bah from your city or from your current location. On phones with a compass, the arrow turns as you turn.
- **Kalender:** today's Hijri date, the next important days, and a month view.
- **City:** found by location on the first visit, or picked from 517 kab/kota. A `?kota=<id>` link opens another city without changing your saved one.
- **Abroad:** when no kab/kota is within 150 km, the app uses your coordinates and your device's time zone, daylight saving included. It names the place by its coordinates and labels the times as calculated, not Kemenag.
- **Offline:** the app installs to the home screen, and the current month's schedule is cached on the device.

The interface is in Indonesian and English. English lives under `/en/` (`/en/kiblat/`, `/en/kalender/`), and the link in the top corner of each page opens the other language and remembers your choice on the device. All text is in `src/lib/i18n.ts`: the Indonesian object defines the shape and English must fill it. There are no accounts, no tracking and no backend.

## Sources

- **Times:** the official Kemenag schedule from [myQuran](https://api.myquran.com). If myQuran fails, the app falls back to [Aladhan](https://aladhan.com) (method 20) and says so on screen. Aladhan's times can run 2 to 4 minutes early. Abroad, times come from Aladhan with the Muslim World League method and its high-latitude rule.
- **Hijri dates:** computed at build time by Kemenag's MABIMS criteria with [astronomy-engine](https://github.com/cosinekitty/astronomy). The start of Ramadan, Syawal and Zulhijah is still decided by sidang isbat, and the calendar says so.
- **City list:** from myQuran. The coordinates come from OpenStreetMap Nominatim.

## Develop

You need Node 24 and pnpm 12. The exact versions are pinned in `.node-version` and `packageManager`.

```sh
pnpm install
pnpm dev       # http://localhost:4321
pnpm check     # astro check
pnpm test      # vitest
pnpm build     # static site in dist/
```

`node scripts/build-hijri.mjs` and `pnpm cities` regenerate the data in `src/data/`. You only need them when the rules or the city list change.

Built with [Astro](https://astro.build) as a static site, with no client framework.

## Deploy

The site is served as a Cloudflare Worker with static assets (see `wrangler.jsonc`). Cloudflare Workers Builds deploys every push to `main`, after the check and the tests pass. To deploy by hand, run `pnpm run deploy`.

## Notes

- Saved data uses `bedug:*` localStorage keys, from the app's old name. They stay that way so saved cities survive the rename.
