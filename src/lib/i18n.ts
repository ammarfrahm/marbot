import type { TimeName } from './schedule';

/** The interface languages. Indonesian is the default and the source: every other language must satisfy its shape. */
export type Lang = 'id';

const id = {
  /** The Intl locale for dates and numbers. */
  locale: 'id-ID',
  /** The Intl locale for the short zone name abroad ("GMT+1"). */
  zoneLocale: 'en',
  /** The mark between whole and tenth in a bearing. */
  decimal: ',',
  /** The switcher link: it names the other language. */
  otherLang: 'English',
  menu: 'Menu',
  tabs: { jadwal: 'Jadwal', kiblat: 'Kiblat', kalender: 'Kalender' },
  prayer: { imsak: 'Imsak', subuh: 'Subuh', terbit: 'Terbit', dzuhur: 'Dzuhur', ashar: 'Ashar', maghrib: 'Maghrib', isya: 'Isya' } as Record<TimeName, string>,

  change: 'Ubah',
  changeCity: 'Ubah kota',
  searching: 'Mencari lokasi…',
  backTo: (name: string) => `Kembali ke ${name}`,
  fromPlace: (name: string) => `dari ${name}`,
  noGeolocation: 'Browser ini tidak mendukung lokasi',
  noTimeZone: 'Zona waktu perangkat tidak dikenali',
  geo: { 1: 'Izin lokasi ditolak', 2: 'Lokasi tidak ditemukan', 3: 'Lokasi terlalu lama dicari', other: 'Lokasi tidak tersedia' } as Record<number | 'other', string>,
  located: { outside: 'Di luar Indonesia: jadwal dihitung dari lokasi Anda.', city: (name: string) => `Lokasi Anda: ${name}.` },
  /** Hemisphere letters of a coordinate name. */
  hemisphere: { N: 'LU', S: 'LS', E: 'BT', W: 'BB' },
  spotLabel: (name: string, region: string) => `${name} (zona waktu ${region})`,

  dialog: {
    title: 'Ubah kota',
    city: 'Kota',
    placeholder: 'Ketik nama kota',
    help: 'Ketik nama kab/kota, lalu pilih dari daftar.',
    myLocation: 'Lokasi saya',
    done: 'Selesai',
    changed: (name: string) => `Kota diganti ke ${name}.`,
    locateFailed: (reason: string) => `${reason}. Ketik nama kota di atas.`,
    none: (locate: boolean) => `Kota tidak ditemukan. Coba nama lain${locate ? ', atau pakai Lokasi saya' : ''}.`,
    many: (count: number, shown: string, more: boolean) => `${count} kota cocok: ${shown}${more ? ', dll.' : ''} — pilih dari daftar.`,
  },

  sources: {
    myquran: 'myQuran · jadwal resmi Kemenag',
    aladhan: 'Aladhan · hitungan, bisa 2–4 menit lebih awal',
    credit: (credit: string) => `Sumber: ${credit}`,
    spot: (method: string) => `Dihitung dari titik ini (Aladhan, metode ${method}). Bukan jadwal Kemenag.`,
    kemenagAngles: 'sudut Kemenag',
    mwl: 'MWL',
  },

  hijri: {
    months: ['Muharam', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jumadilawal', 'Jumadilakhir', 'Rajab', 'Syakban', 'Ramadan', 'Syawal', 'Zulkaidah', 'Zulhijah'] as string[],
    era: 'H',
    days: {
      newYear: 'Tahun Baru Islam',
      ashura: 'Asyura',
      mawlid: 'Maulid Nabi',
      isra: 'Isra Mikraj',
      nisfu: 'Nisfu Syakban',
      ramadan: 'Awal Ramadan',
      nuzul: 'Nuzulul Quran',
      fitr: 'Idulfitri',
      arafah: 'Hari Arafah',
      adha: 'Iduladha',
    },
  },

  jadwal: {
    title: 'Jadwal Sholat · Marbot',
    description: 'Jadwal sholat hari ini dan hitung mundur ke waktu sholat berikutnya.',
    needJs: 'Marbot butuh JavaScript untuk menampilkan jadwal.',
    left: ' lagi',
    at: (time: string, zone: string) => `pukul ${time} ${zone}`,
    tomorrowAt: (time: string, zone: string) => `besok pukul ${time} ${zone}`,
    since: (time: string, zone: string) => `sejak ${time} ${zone}`,
    arrived: 'Sudah masuk',
    arrivedTitle: (name: string) => `${name} sudah masuk · Marbot`,
    notLoaded: 'Belum bisa dimuat',
    tomorrowMissing: 'Besok belum tersedia',
    listToday: 'Jadwal hari ini',
    listTomorrow: 'Jadwal besok',
    dialogTitle: 'Kota & sumber jadwal',
    source: 'Sumber',
    onlyAladhan: 'Di luar Indonesia hanya Aladhan.',
    share: 'Bagikan',
    shareTitle: (name: string) => `Jadwal sholat ${name}`,
    linkCopied: 'Tautan disalin.',
    linkFailed: 'Tautan tidak bisa dibagikan.',
    linkedCity: (name: string) => `Jadwal ${name} dari tautan.`,
    linkedSpot: 'Jadwal titik ini dari tautan.',
    saveCity: 'Simpan sebagai kota saya',
    citySaved: (name: string) => `${name} disimpan sebagai kota Anda.`,
    tomorrowRetry: 'Jadwal besok belum bisa dimuat, dicoba lagi tiap menit.',
    tomorrowOffline: 'Jadwal besok belum tersimpan, sambungkan internet sebentar.',
    sourceDown: (first: string, used: string) => `${first} tidak bisa dipakai, jadwal dari ${used}.`,
    notSaved: (name: string) => `Jadwal ${name} belum tersimpan. Sambungkan internet sekali.`,
    failed: (reason: string) => `${reason}. Dicoba lagi tiap menit.`,
    retry: 'Coba lagi',
    scheduleFor: (name: string) => `Jadwal untuk ${name}.`,
    useMyLocation: 'Pakai lokasi saya',
    keptCity: (reason: string, name: string) => `${reason}. Jadwal tetap untuk ${name}.`,
    pickCity: 'Pilih kota',
    errors: {
      timeout: 'server tidak menjawab',
      unreachable: 'server tidak bisa dihubungi',
      offline: 'tidak ada koneksi internet',
      server: (status: string) => `server bermasalah (${status})`,
      invalid: 'data jadwal tidak valid',
    },
  },

  kiblat: {
    title: 'Arah Kiblat · Marbot',
    description: 'Arah kiblat dari kota atau lokasi Anda, dengan kompas di HP.',
    needJs: 'Marbot butuh JavaScript untuk menghitung arah kiblat.',
    heading: 'Arah kiblat',
    /** North, east, south, west: the dial's letters. */
    cardinals: ['U', 'T', 'S', 'B'] as string[],
    points: ['utara', 'timur laut', 'timur', 'tenggara', 'selatan', 'barat daya', 'barat', 'barat laut'] as string[],
    fromNorth: 'dari utara',
    loading: 'Memuat…',
    compassOn: 'Nyalakan kompas',
    locate: 'Hitung dari lokasi saya',
    factBearing: 'Arah',
    factDistance: "Jarak ke Ka'bah",
    calibrate: 'Kompas HP bisa meleset beberapa derajat di dekat logam, magnet, atau perangkat listrik. Jika arahnya melompat, gerakkan HP membentuk angka 8 untuk kalibrasi.',
    bearingFact: (deg: string, point: string) => `${deg}° dari utara, ke ${point}`,
    northTip: 'Tidak tahu arah utara? Matahari terbit di timur.',
    faceNorth: 'Hadapkan huruf U ke utara, lalu ikuti garis ke Ka’bah.',
    noCompass: (deg: number) => `Tanpa kompas: pakai arah ${deg}° dari utara.`,
    compassDenied: 'Izin kompas ditolak.',
    aligned: 'Kiblat',
    alignedLine: 'sudah lurus',
    turnRight: 'putar ke kanan',
    turnLeft: 'putar ke kiri',
    alignedHint: 'Bagian atas HP menghadap kiblat.',
    liveHint: 'Pegang HP mendatar, putar badan sampai tanda di atas bertemu Ka’bah.',
    announceAligned: 'Sudah menghadap kiblat',
    announceTurn: (right: boolean, deg: number) => `Putar ke ${right ? 'kanan' : 'kiri'} ${deg}°`,
    fromYou: (meters: number) => `dari lokasi Anda (±${meters} m)`,
    keptCity: (reason: string, name: string) => `${reason}. Arah tetap dihitung dari ${name}.`,
    offlinePick: (name: string) => `Kiblat dihitung dari ${name}. Kota belum disimpan; pilih lagi saat online.`,
  },

  kalender: {
    title: 'Kalender Hijriah · Marbot',
    description: 'Tanggal Hijriah hari ini, hari-hari penting berikutnya, dan kalender bulan Hijriah.',
    needJs: 'Marbot butuh JavaScript untuk menampilkan kalender.',
    weekdays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as string[],
    upcoming: 'Hari penting berikutnya',
    prev: 'Bulan sebelumnya',
    next: 'Bulan berikutnya',
    thisMonth: 'Kembali ke bulan ini',
    none: 'Tidak ada hari penting bulan ini.',
    note: 'Tanggal mengikuti kriteria MABIMS yang dipakai Kemenag. Awal Ramadan, Syawal, dan Zulhijah ditetapkan lewat sidang isbat, jadi bisa bergeser sehari.',
    unavailable: 'Kalender belum tersedia',
    awaitingIsbat: 'Menunggu sidang isbat',
    inDays: (n: number) => (n === 0 ? 'hari ini' : n === 1 ? 'besok' : `${n} hari lagi`),
  },
};

/** The shape every language must fill. */
export type Strings = typeof id;

export const STRINGS: Record<Lang, Strings> = { id };

/** The page's language, from <html lang>; Indonesian when it is anything else. */
export const pageLang = (): Lang => (Object.hasOwn(STRINGS, document.documentElement.lang) ? (document.documentElement.lang as Lang) : 'id');
