/*
 * Fills the panel's place and date text before first paint, so real text replaces the placeholders
 * without a reflow (at 200% text size these wrap to several lines, a one-line placeholder cannot hold them).
 * PanelBoot.astro inlines this file as a classic script, so it has no imports and no exports; the tests load it by source.
 * It mirrors schedule.ts (placeDate, placeClock, zoneLabel) and hijri.ts (toHijri, formatHijri), and reads the same city the page's
 * script will: a shared ?kota= link first, then the saved bedug:city, else the default.
 * `cfg.t` ({ locale, zoneLocale, decimal, hemisphere, era, fromPrefix }) is the page language's slice of the dictionary in i18n.ts;
 * without it the text is Indonesian.
 */

var INDONESIAN = { locale: 'id-ID', zoneLocale: 'en', decimal: ',', hemisphere: { N: 'LU', S: 'LS', E: 'BT', W: 'BB' }, era: 'H', fromPrefix: 'dari ' };

/** "51,51° LU 0,13° BB"; mirrors coordName in cities.ts. */
function coordName(lat, lon, t) {
  function part(n, pos, neg) {
    n = +n.toFixed(2) || 0;
    return Math.abs(n).toFixed(2).replace('.', t.decimal) + '° ' + (n < 0 ? neg : pos);
  }
  return part(lat, t.hemisphere.N, t.hemisphere.S) + ' ' + part(lon, t.hemisphere.E, t.hemisphere.W);
}

/** The place a `geo:<lat>,<lon>@<tz>` id names, or null; mirrors placeById in cities.ts. */
function spotOf(id, t) {
  var m = /^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)@([\w+\/-]+)$/.exec(id);
  if (!m || Math.abs(m[1]) > 90 || Math.abs(m[2]) > 180) return null;
  try {
    var tz = new Intl.DateTimeFormat('en', { timeZone: m[3] }).resolvedOptions().timeZone;
    // An offset zone ("+05:00") would not read back from storage, so it is no place.
    return /^[A-Za-z]/.test(tz) ? { id: id, name: coordName(+m[1], +m[2], t), tz: tz } : null;
  } catch (e) {
    return null;
  }
}

/** The place for the first of the link's and the saved id that is a `geo:` spot or that `cfg.cities` ({ id: [name, tz] }) knows, else the default. */
function resolvePlace(ids, cfg) {
  var t = cfg.t || INDONESIAN;
  for (var k = 0; k < ids.length; k++) {
    var spot = ids[k] && ids[k].indexOf('geo:') === 0 && spotOf(ids[k], t);
    if (spot) return spot;
    var c = ids[k] && Object.prototype.hasOwnProperty.call(cfg.cities, ids[k]) && cfg.cities[ids[k]];
    if (c) return { id: ids[k], name: c[0], tz: c[1] };
  }
  return cfg.def;
}

/** The panel's lines for a place at instant `now`; a line is '' when it is unknown. */
function panelLines(now, place, cfg) {
  var t = cfg.t || INDONESIAN;
  var tz = place.tz;
  var date = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz }).format(now);
  var clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz }).format(now);
  var zone = cfg.zones[tz] || new Intl.DateTimeFormat(t.zoneLocale, { timeZoneName: 'short', timeZone: tz }).formatToParts(now).filter(function (p) { return p.type === 'timeZoneName'; })[0].value;
  var hijri = '';
  var i = -1;
  for (var k = cfg.starts.length - 1; k >= 0 && i < 0; k--) if (cfg.starts[k] <= date) i = k;
  if (i >= 0 && i < cfg.starts.length - 1) {
    var month = cfg.first.month - 1 + i;
    var day = Math.round((Date.parse(date) - Date.parse(cfg.starts[i])) / 86400000) + 1;
    hijri = day + ' ' + cfg.months[month % 12] + ' ' + (cfg.first.year + Math.floor(month / 12)) + ' ' + t.era;
  }
  var long = new Intl.DateTimeFormat(t.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return {
    name: place.name,
    from: t.fromPrefix + place.name,
    today: new Intl.DateTimeFormat(t.locale, { dateStyle: 'full', timeZone: tz }).format(now) + ' · ' + clock + ' ' + zone,
    hijri: hijri,
    greg: long.format(new Date(date + 'T00:00:00Z')),
  };
}

/** The shared link's place id, decoded as the page's script reads it; null when absent. */
function linkedId(search) {
  return new URLSearchParams(search).get('kota');
}

/** Writes `cfg.fill` ({ element id: line name }) into the page. */
function panelBoot(cfg, env) {
  env = env || {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    linked: cfg.linked ? linkedId(location.search) : null,
    now: Date.now(),
    doc: document,
  };
  var lines = panelLines(env.now, resolvePlace([env.linked, env.get('bedug:city')], cfg), cfg);
  for (var id in cfg.fill) {
    var el = env.doc.getElementById(id);
    if (el && lines[cfg.fill[id]]) el.textContent = lines[cfg.fill[id]];
  }
}
