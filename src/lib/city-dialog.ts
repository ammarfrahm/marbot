import { cityById, nearestCity, titleCase, type City } from './cities';

/** The nearest kab/kota to the device; rejects with a short reason ("Izin lokasi ditolak"). */
export function locateNearest(): Promise<{ city: City; km: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Browser ini tidak mendukung lokasi'));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve(nearestCity(coords.latitude, coords.longitude)),
      (e) => reject(new Error({ 1: 'Izin lokasi ditolak', 2: 'Lokasi tidak ditemukan', 3: 'Lokasi terlalu lama dicari' }[e.code] ?? 'Lokasi tidak tersedia')),
      { timeout: 10_000, maximumAge: 3_600_000 },
    );
  });
}

/** Warns when the nearest kab/kota is far from the device. */
export const farNote = (city: City, km: number) =>
  km > 150 ? `Kota terdekat ${titleCase(city.name)} berjarak ${Math.round(km)} km, jadwal mungkin tidak akurat.` : '';

type Options = {
  current: () => City;
  /** Called with the chosen city; a returned string refuses the choice and is shown in the dialog. */
  pick: (city: City, note?: string) => string | void;
};

/** Wires the shared #settings dialog and every [data-open-city] button on the page. */
export function initCityDialog({ current, pick }: Options) {
  const dialog = document.getElementById('settings') as HTMLDialogElement;
  const select = document.getElementById('city') as HTMLSelectElement;
  const hint = document.getElementById('city-hint')!;
  let opener: HTMLElement | null = null;

  function open() {
    opener = document.activeElement as HTMLElement | null;
    hint.textContent = '';
    select.value = current().id;
    dialog.showModal();
  }
  function choose(city: City, note = '') {
    const refused = pick(city, note);
    if (refused) hint.textContent = refused;
    else dialog.close();
  }

  select.addEventListener('change', () => choose(cityById(select.value)!));
  document.getElementById('dlg-locate')!.addEventListener('click', async () => {
    hint.textContent = 'Mencari lokasi…';
    try {
      const { city, km } = await locateNearest();
      choose(city, farNote(city, km));
    } catch (e) {
      hint.textContent = `${(e as Error).message}.`;
    }
  });
  // Native close already returns focus to the opener; this covers an opener that has since hidden itself.
  dialog.addEventListener('close', () => {
    if (opener?.isConnected && !(opener as HTMLButtonElement).hidden) opener.focus();
    else document.querySelector<HTMLElement>('[data-open-city]')?.focus();
  });
  for (const b of document.querySelectorAll('[data-open-city]')) b.addEventListener('click', open);
  return { open };
}
