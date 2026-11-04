import { geoReason } from './geo';
import { STRINGS, pageLang, type Lang } from './i18n';
import { placeLabel, matchCities, matchHint, placeAt, placeName, type Place } from './cities';

/** The device's place: a kab/kota near it, else a located Spot; rejects with a short reason ("Izin lokasi ditolak"). */
export function locatePlace(lang: Lang = 'id'): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error(STRINGS[lang].noGeolocation));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const place = placeAt(coords.latitude, coords.longitude);
        if (place) resolve(place);
        else reject(new Error(STRINGS[lang].noTimeZone));
      },
      (e) => reject(new Error(geoReason(e.code, lang))),
      { timeout: 10_000, maximumAge: 3_600_000 },
    );
  });
}

/** What a geolocation pick says; `back` is the place to return to, unless nothing changed. */
export function locatedChange(prev: Place, place: Place, lang: Lang = 'id'): { note: string; back?: Place } {
  const t = STRINGS[lang].located;
  return {
    note: place.kind === 'spot' ? t.outside : t.city(placeName(place, lang)),
    back: prev.id === place.id ? undefined : prev,
  };
}

type Options = {
  current: () => Place;
  /** Called with the chosen city; `back` is set when a location fix replaced another city. */
  pick: (city: Place, note?: string, back?: Place) => void;
};

/** Wires the shared #settings dialog and every [data-open-city] button on the page. */
export function initCityDialog({ current, pick }: Options) {
  const lang = pageLang();
  const t = STRINGS[lang];
  const dialog = document.getElementById('settings') as HTMLDialogElement;
  const input = document.getElementById('city') as HTMLInputElement;
  const announceEl = document.getElementById('city-announce')!;
  const form = dialog.querySelector('form')!;
  const hint = document.getElementById('city-hint')!;
  const locateButton = document.getElementById('dlg-locate');
  let opener: HTMLElement | null = null;

  /** The status line under the field; an error reads in ink at 600, the helper above stays muted. */
  function setHint(text: string, error = false) {
    hint.textContent = text;
    hint.classList.toggle('error', error && !!text);
  }
  function setInvalid(on: boolean) {
    if (on) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function open() {
    opener = document.activeElement as HTMLElement | null;
    setHint('');
    setInvalid(false);
    input.value = '';
    // Android Chrome opens the whole datalist on focus while the box is empty; attach it once something is typed.
    input.removeAttribute('list');
    input.placeholder = placeLabel(current(), lang);
    dialog.showModal();
  }
  /** The dialog is gone by now, so say the change aloud: the page text moves without a cue. */
  function announce(text: string) {
    announceEl.textContent = '';
    setTimeout(() => (announceEl.textContent = text), 100);
  }
  function choose(city: Place, note = '', back?: Place) {
    pick(city, note, back);
    dialog.close();
    announce(t.dialog.changed(placeName(city, lang)));
  }

  /** Picks what is typed if it is one city; otherwise says why not and keeps the dialog open. */
  function pickTyped() {
    const hits = matchCities(input.value);
    if (hits.length === 1) return choose(hits[0]);
    setHint(matchHint(hits, !!locateButton, lang), true);
    setInvalid(true);
    input.focus();
  }
  // The datalist fills in a full label and fires change; Enter and Selesai submit the form.
  input.addEventListener('change', () => input.value.trim() && pickTyped());
  form.addEventListener('submit', (e) => {
    if (!dialog.open || !input.value.trim()) return; // nothing typed: Selesai just closes
    e.preventDefault(); // a typed name must resolve before the dialog closes
    pickTyped();
  });
  input.addEventListener('input', () => {
    if (input.value.trim()) input.setAttribute('list', 'city-list');
    else input.removeAttribute('list');
    setHint('');
    setInvalid(false);
  });
  locateButton?.addEventListener('click', async () => {
    setHint(t.searching);
    try {
      const place = await locatePlace(lang);
      const { note, back } = locatedChange(current(), place, lang);
      choose(place, note, back);
    } catch (e) {
      setHint(t.dialog.locateFailed((e as Error).message), true);
    }
  });
  // A click on the dialog itself, not its form, is a click on the backdrop.
  dialog.addEventListener('click', (e) => e.target === dialog && dialog.close());
  // Native close already returns focus to the opener; this covers an opener that has since hidden itself.
  dialog.addEventListener('close', () => {
    if (opener?.isConnected && !(opener as HTMLButtonElement).hidden) opener.focus();
    else document.querySelector<HTMLElement>('[data-open-city]')?.focus();
  });
  for (const b of document.querySelectorAll('[data-open-city]')) b.addEventListener('click', open);
  return { open };
}
