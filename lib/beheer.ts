// Gedeelde types en hulpfuncties voor het beheer.

export type Leerling = {
  id: string;
  schooljaar: string;
  voornaam: string;
  naam: string;
  klas: string;
  smartschool_gebruikersnaam: string | null;
  email: string | null;
  gsm: string | null;
  status: LeerlingStatus;
  status_van: string | null;
  status_tot: string | null;
  notities: string | null;
};

export type LeerlingStatus = "actief" | "ziek" | "vrijgesteld" | "verlaten" | "gestopt";

export const LEERLING_STATUS: Record<LeerlingStatus, { label: string; toon: "ok" | "warn" | "mut" | "bad" }> = {
  actief: { label: "Actief", toon: "ok" },
  ziek: { label: "Langdurig ziek", toon: "warn" },
  vrijgesteld: { label: "Vrijgesteld van stage", toon: "mut" },
  verlaten: { label: "School verlaten", toon: "bad" },
  gestopt: { label: "Gestopt / uitgeschreven", toon: "bad" },
};

export type Stageplaats = {
  id: string;
  naam: string;
  juridische_naam: string | null;
  kbo: string | null;
  sector: string | null;
  status: "actief" | "pauze" | "stop";
  straat: string | null;
  postcode: string | null;
  gemeente: string | null;
  telefoon: string | null;
  email: string | null;
  website: string | null;
  contactpersoon: string | null;
  max_stagiairs: number;
  beoordeling: number | null;
  notities: string | null;
};

export const PLAATS_STATUS: Record<Stageplaats["status"], { label: string; toon: "ok" | "warn" | "mut" }> = {
  actief: { label: "Werkt mee", toon: "ok" },
  pauze: { label: "Even niet", toon: "warn" },
  stop: { label: "Niet meer", toon: "mut" },
};

export const SECTOREN = [
  "Retail / winkel",
  "Onthaal / receptie",
  "Kantoor / administratie",
  "Horeca",
  "Event",
  "Zorg",
  "Overheid",
  "Andere",
];

export type Blok = {
  id: string;
  schooljaar: string;
  code: "b1" | "b2";
  naam: string;
  start_datum: string;
  eind_datum: string;
  uren: number;
  uren_per_week: number;
  deadline_top3: string | null;
};

export type Uitzondering = { id: string; blok_id: string; van: string; tot: string; naam: string; soort: "vakantie" | "vm" | "geen" };

export const UITZ_SOORT: Record<Uitzondering["soort"], string> = {
  vakantie: "Vakantie of feestdag",
  vm: "Geen stage in de voormiddag",
  geen: "Geen stage",
};

export type Dossier = {
  id: string;
  leerling_id: string;
  blok_id: string;
  stageplaats_id: string | null;
  begeleider_id: string | null;
  mentor_naam: string | null;
  mentor_telefoon: string | null;
  mentor_email: string | null;
};

export type Vraag = {
  id: string;
  aangemaakt_op: string;
  rol: string;
  naam: string;
  email: string;
  telefoon: string | null;
  organisatie: string | null;
  klas: string | null;
  leerling: string | null;
  onderwerp: string | null;
  vraag: string;
  antwoord_via: string;
  status: "nieuw" | "in behandeling" | "beantwoord";
  behandeld_door: string | null;
  notitie: string | null;
};

export const KLASSEN = ["4OL1", "4OL2", "4OS1", "4OS2", "5OS1", "5OS2", "5OS3", "6OS1", "6OS2"];

/** Schooljaar van een datum: van 1 september tot 31 augustus. */
export function schooljaarVan(d = new Date()): string {
  const iso = d.toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
  const [j, m] = iso.split("-").map(Number);
  return m >= 9 ? `${j}-${j + 1}` : `${j - 1}-${j}`;
}

export function vandaagIso(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
}

export function datumKort(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(`${iso.slice(0, 10)}T12:00:00`)
    .toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Brussels" })
    .replace(/\./g, "");
}

export function tijdstip(iso: string): string {
  return new Date(iso).toLocaleString("nl-BE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Brussels",
  });
}

export const volledigeNaam = (l: { voornaam: string; naam: string }) => `${l.voornaam} ${l.naam}`.trim();

/** Lege tekst wordt null, zodat de databank geen lege strings bewaart. */
export const leegNaarNull = (v: FormDataEntryValue | null): string | null => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};
