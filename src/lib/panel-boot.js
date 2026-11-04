/*
 * Fills the panel's place and date text before first paint, so real text replaces the placeholders
 * without a reflow (at 200% text size these wrap to several lines, a one-line placeholder cannot hold them).
 * PanelBoot.astro inlines this file as a classic script, so it has no imports and no exports; the tests load it by source.
 * It mirrors schedule.ts (placeDate, placeClock, zoneLabel) and hijri.ts (toHijri, formatHijri), and reads the same city the page's
 * script will: a shared ?kota= link first, then the saved bedug:city, else the default.
 */

/** The place for the first of the link's and the saved city id that `cfg.cities` ({ id: [name, tz] }) knows, else the default. */
function resolvePlace(ids, cfg) {
  for (var k = 0; k < ids.length; k++) {
    var c = ids[k] && Object.prototype.hasOwnProperty.call(cfg.cities, ids[k]) && cfg.cities[ids[k]];
    if (c) return { id: ids[k], name: c[0], tz: c[1] };
  }
  return cfg.def;
}

/** The panel's lines for a place at instant `now`; a line is '' when it is unknown. */
function panelLines(now, place, cfg) {
  var tz = place.tz;
  var date = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz }).format(now);
  var clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz }).format(now);
  var zone = cfg.zones[tz] || new Intl.DateTimeFormat('en', { timeZoneName: 'short', timeZone: tz }).formatToParts(now).filter(function (p) { return p.type === 'timeZoneName'; })[0].value;
  var hijri = '';
  var i = -1;
  for (var k = cfg.starts.length - 1; k >= 0 && i < 0; k--) if (cfg.starts[k] <= date) i = k;
  if (i >= 0 && i < cfg.starts.length - 1) {
    var month = cfg.first.month - 1 + i;
    var day = Math.round((Date.parse(date) - Date.parse(cfg.starts[i])) / 86400000) + 1;
    hijri = day + ' ' + cfg.months[month % 12] + ' ' + (cfg.first.year + Math.floor(month / 12)) + ' H';
  }
  var long = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return {
    name: place.name,
    from: 'dari ' + place.name,
    today: new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeZone: tz }).format(now) + ' · ' + clock + ' ' + zone,
    hijri: hijri,
    greg: long.format(new Date(date + 'T00:00:00Z')),
  };
}

/** Writes `cfg.fill` ({ element id: line name }) into the page. */
function panelBoot(cfg, env) {
  env = env || {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    linked: cfg.linked ? (/[?&]kota=([^&#]*)/.exec(location.search) || [])[1] : null,
    now: Date.now(),
    doc: document,
  };
  var lines = panelLines(env.now, resolvePlace([env.linked, env.get('bedug:city')], cfg), cfg);
  for (var id in cfg.fill) {
    var el = env.doc.getElementById(id);
    if (el && lines[cfg.fill[id]]) el.textContent = lines[cfg.fill[id]];
  }
}
