import { geoReason } from './geo';
import { cityLabel, matchCities, matchHint, nearestCity, titleCase, type City } from './cities';

/** The nearest kab/kota to the device; rejects with a short reason ("Izin lokasi ditolak"). */
export function locateNearest(): Promise<{ city: City; km: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Browser ini tidak mendukung lokasi'));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve(nearestCity(coords.latitude, coords.longitude)),
      (e) => reject(new Error(geoReason(e.code))),
      { timeout: 10_000, maximumAge: 3_600_000 },
    );
  });
}

/** Warns when the nearest kab/kota is far from the device. */
export const farNote = (city: City, km: number) =>
  km > 150 ? `Kota terdekat ${titleCase(city.name)} berjarak ${Math.round(km)} km, jadwal mungkin tidak akurat.` : '';

/** What a geolocation pick says: the distance warning if far, else the choice; `back` is the city to return to, unless nothing changed. */
export function locatedChange(prev: City, city: City, km: number): { note: string; back?: City } {
  return { note: farNote(city, km) || `Lokasi Anda: ${titleCase(city.name)}.`, back: prev.id === city.id ? undefined : prev };
}

type Options = {
  current: () => City;
  /** Called with the chosen city; `back` is set when a location fix replaced another city. */
  pick: (city: City, note?: string, back?: City) => void;
};

/** Wires the shared #settings dialog and every [data-open-city] button on the page. */
export function initCityDialog({ current, pick }: Options) {
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
    input.placeholder = cityLabel(current());
    dialog.showModal();
  }
  /** The dialog is gone by now, so say the change aloud: the page text moves without a cue. */
  function announce(text: string) {
    announceEl.textContent = '';
    setTimeout(() => (announceEl.textContent = text), 100);
  }
  function choose(city: City, note = '', back?: City) {
    pick(city, note, back);
    dialog.close();
    announce(`Kota diganti ke ${titleCase(city.name)}.`);
  }

  /** Picks what is typed if it is one city; otherwise says why not and keeps the dialog open. */
  function pickTyped() {
    const hits = matchCities(input.value);
    if (hits.length === 1) return choose(hits[0]);
    setHint(matchHint(hits, !!locateButton), true);
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
    setHint('');
    setInvalid(false);
  });
  locateButton?.addEventListener('click', async () => {
    setHint('Mencari lokasi…');
    try {
      const { city, km } = await locateNearest();
      const { note, back } = locatedChange(current(), city, km);
      choose(city, note, back);
    } catch (e) {
      setHint(`${(e as Error).message}.`, true);
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
