// Vaste gegevens over de stage. Later komen deze uit de tabel `blokken` in Supabase.

export type Blok = {
  code: "b1" | "b2";
  naam: string;
  start: string; // ISO-datum
  eind: string;
  uren: number;
};

export const SCHOOLJAAR = "2026-2027";

export const BLOKKEN: Blok[] = [
  { code: "b1", naam: "Blokstage 1", start: "2026-10-13", eind: "2026-11-21", uren: 120 },
  { code: "b2", naam: "Blokstage 2", start: "2027-05-04", eind: "2027-06-12", uren: 120 },
];

const KORT: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "Europe/Brussels" };
const LANG: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Brussels" };

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("nl-BE", o).replace(/\./g, "");

/** "13 okt – 21 nov 2026" */
export function periode(b: Blok): string {
  return `${fmt(b.start, KORT)} – ${fmt(b.eind, LANG)}`;
}

/** De blokstage die nu loopt, of anders de eerstvolgende. Null als beide voorbij zijn. */
export function huidigOfVolgendBlok(vandaag = new Date()): { blok: Blok; bezig: boolean } | null {
  const iso = vandaag.toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
  for (const b of BLOKKEN) {
    if (iso >= b.start && iso <= b.eind) return { blok: b, bezig: true };
    if (iso < b.start) return { blok: b, bezig: false };
  }
  return null;
}

export const SCHOOL = {
  naam: "Spes Nostra Heule",
  straat: "Heulsekasteelstraat 2A",
  gemeente: "8501 Heule",
  tel: "056 35 39 54",
  telLink: "+3256353954",
  web: "https://www.snh.be",
};

export const BEGELEIDERS = [
  {
    naam: "Fien Claeys",
    mail: "fien.claeys@snh.be",
    foto: "/img/fien-claeys.jpg",
    tekst: "Lerares Frans en retail, mama van drie en foodie in de vrije tijd.",
  },
  {
    naam: "Stijn Decoene",
    mail: "stijn.decoene@snh.be",
    foto: "/img/stijn-decoene.jpg",
    tekst: "Leraar Visual Merchandising en expressie, grafisch vormgever met een voorliefde voor cultuur en muziek.",
  },
];
