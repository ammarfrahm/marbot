/*
 * Fills the panel's place and date text before first paint, so real text replaces the placeholders
 * without a reflow (at 200% text size these wrap to several lines, a one-line placeholder cannot hold them).
 * PanelBoot.astro inlines this file as a classic script, so it has no imports and no exports; the tests load it by source.
 * It mirrors schedule.ts (cityDate, cityClock), hijri.ts (toHijri, formatHijri) and store.ts (the place note).
 */

/** The place note `saveCity` keeps next to the saved city; null when the full script has to decide (old data without a note). */
function resolvePlace(get, def) {
  var id = get('bedug:city');
  if (!id) return def;
  try {
    var place = JSON.parse(get('bedug:place'));
    if (place && place.id === id) return place;
  } catch (e) { /* no note yet: data saved before it existed */ }
  return null;
}

/** The panel's lines for a place at instant `now`; a line is '' when it is unknown. */
function panelLines(now, place, cfg) {
  var shifted = new Date(now + place.offset * 3600000).toISOString();
  var date = shifted.slice(0, 10);
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
    today: new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeZone: cfg.iana[place.offset] }).format(now) + ' · ' + shifted.slice(11, 16) + ' ' + cfg.zones[place.offset],
    hijri: hijri,
    greg: long.format(new Date(date + 'T00:00:00Z')),
  };
}

/**
 * Writes `cfg.fill` ({ element id: line name }) into the page. On a shared link (?kota=) the city is only known to the
 * full script, so the name is left alone; the dates still come from the saved city, which keeps the lines the right length.
 */
function panelBoot(cfg, env) {
  env = env || {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    linked: cfg.linked && /[?&]kota=/.test(location.search),
    now: Date.now(),
    doc: document,
  };
  var place = resolvePlace(env.get, cfg.def);
  if (!place) return;
  var lines = panelLines(env.now, place, cfg);
  for (var id in cfg.fill) {
    var el = env.doc.getElementById(id);
    var line = cfg.fill[id];
    if (el && lines[line] && !(env.linked && line === 'name')) el.textContent = lines[line];
  }
}
