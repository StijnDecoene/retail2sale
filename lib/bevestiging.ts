// Bevestiging van een goedgekeurde aanvraag: gegevens, teksten en stagekalender.
// Gedeeld door de pdf, de mail en het voorbeeld in het beheer (geen server-only code).
import type { Blok, Uitzondering } from "@/lib/beheer";
import { KLEDIJ, type AanvraagGegevens } from "@/lib/portaal";

export type BevestigingData = {
  schooljaar: string;
  blok: Pick<Blok, "naam" | "code" | "start_datum" | "eind_datum" | "uren" | "uren_per_week">;
  uitzonderingen: Pick<Uitzondering, "van" | "tot" | "naam" | "soort">[];
  leerling: { voornaam: string; naam: string; klas: string; email: string | null; gsm: string | null };
  aanvraag: AanvraagGegevens;
  /** Begeleider van dit dossier (als die al gekend is). */
  begeleider: { naam: string; telefoon: string | null; email: string } | null;
  /** Het team stagebegeleiding (voor de ondertekening). */
  team: { naam: string; telefoon: string | null; email: string }[];
  /** Persoonlijke link van de stagegever naar het contract (als het contract al klaarstaat). */
  contractLink?: string | null;
};

export const SCHOOL = {
  naam: "Spes Nostra Heule",
  afdeling: "Spes Nostra 2de en 3de graad",
  straat: "Heulsekasteelstraat 2A",
  gemeente: "8501 Heule",
  telefoon: "056 35 39 53",
  web: "www.snh.be",
  stagemail: "retail2sale@snh.be",
};

const d = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);
const fmt = (s: string, o: Intl.DateTimeFormatOptions) => d(s).toLocaleDateString("nl-BE", { timeZone: "UTC", ...o });

/** "dinsdag 13 oktober 2026" */
export const datumLang = (s: string) => fmt(s, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
/** "13 oktober 2026" */
export const datumMid = (s: string) => fmt(s, { day: "numeric", month: "long", year: "numeric" });
/** "13 okt" */
export const datumKortZonderJaar = (s: string) => fmt(s, { day: "numeric", month: "short" }).replace(".", "");

export const naamLeerling = (b: BevestigingData) => `${b.leerling.voornaam} ${b.leerling.naam}`;
export const naamBedrijf = (b: BevestigingData) => b.aanvraag.bedrijf?.naam?.trim() || "de stageplaats";
export const soortStage = (b: BevestigingData) => (b.aanvraag.bedrijf?.soort === "onthaal" ? "Onthaal en organisatie" : "Sales (verkoop)");
export const blokVolgnummer = (b: BevestigingData) => (b.blok.code === "b2" ? "tweede" : "eerste");
export const aantalWeken = (b: BevestigingData) => Math.round(b.blok.uren / Math.max(1, b.blok.uren_per_week));

export function adresBedrijf(b: BevestigingData) {
  const x = b.aanvraag.bedrijf ?? {};
  return [x.straat, [x.postcode, x.gemeente].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

/** Wie tekent het contract namens de stagegever? */
export function ondertekenaar(b: BevestigingData) {
  const v = b.aanvraag.verantwoordelijke;
  if (v && v.zelfde === false && v.naam) return { naam: v.naam, functie: v.functie ?? "", email: v.email ?? "", tel: v.tel ?? "" };
  const m = b.aanvraag.mentor ?? {};
  return { naam: m.naam ?? "", functie: m.functie ?? "", email: m.email ?? "", tel: m.tel ?? "" };
}

export const kledijTekst = (b: BevestigingData) =>
  (b.aanvraag.werkvloer?.kledij ?? []).map((k) => KLEDIJ.find(([x]) => x === k)?.[1] ?? k).join(", ");

/** Namen van het team, bv. "Fien Claeys en Stijn Decoene". */
export function teamNamen(b: BevestigingData) {
  const n = b.team.map((t) => t.naam);
  return n.length <= 1 ? n.join("") : `${n.slice(0, -1).join(", ")} en ${n.at(-1)}`;
}

// ---------------------------------------------------------------------------
// Stagekalender
// ---------------------------------------------------------------------------
export type KalenderDag = {
  iso: string;
  dag: number;
  /** buiten = voor de start of na het einde */
  soort: "buiten" | "stage" | "school" | "zondag" | "vakantie" | "vm" | "geen";
  label?: string;
};
export type KalenderWeek = { nr: number; dagen: KalenderDag[] };

/** Weken (maandag–zondag) van de blokstage, met per dag wat er gebeurt. */
export function stagekalender(b: BevestigingData): KalenderWeek[] {
  const start = d(b.blok.start_datum), eind = d(b.blok.eind_datum);
  const maandag = new Date(start);
  maandag.setUTCDate(maandag.getUTCDate() - ((maandag.getUTCDay() + 6) % 7));
  const weken: KalenderWeek[] = [];
  let nr = 0;
  for (const w = new Date(maandag); w <= eind; w.setUTCDate(w.getUTCDate() + 7)) {
    const dagen: KalenderDag[] = [];
    for (let i = 0; i < 7; i++) {
      const x = new Date(w);
      x.setUTCDate(w.getUTCDate() + i);
      const s = iso(x);
      let dag: KalenderDag = { iso: s, dag: x.getUTCDate(), soort: "stage" };
      if (x < start || x > eind) dag = { ...dag, soort: "buiten" };
      else if (i === 6) dag = { ...dag, soort: "zondag" };
      else {
        const u = b.uitzonderingen.find((u) => u.van <= s && s <= u.tot);
        if (u) dag = { ...dag, soort: u.soort, label: u.naam };
        else if (i === 0) dag = { ...dag, soort: "school", label: "School" };
      }
      dagen.push(dag);
    }
    nr++;
    weken.push({ nr, dagen });
  }
  return weken;
}

export const KALENDER_UITLEG: { soort: KalenderDag["soort"]; tekst: string }[] = [
  { soort: "stage", tekst: "Stage mogelijk (volgens het werkrooster)" },
  { soort: "school", tekst: "Maandag: de stagiair is op school" },
  { soort: "vakantie", tekst: "Vakantie of feestdag: geen stage, tenzij in overleg" },
  { soort: "vm", tekst: "Geen stage in de voormiddag" },
  { soort: "geen", tekst: "Geen stage" },
];

// ---------------------------------------------------------------------------
// Teksten (dezelfde in pdf en mail)
// ---------------------------------------------------------------------------
export function onderwerp(b: BevestigingData) {
  return `Stage bevestigd: ${naamLeerling(b)} bij ${naamBedrijf(b)} (${datumKortZonderJaar(b.blok.start_datum)} – ${datumMid(b.blok.eind_datum)})`;
}

export type Voor = "stagegever" | "stagiair";

export function aanspreking(b: BevestigingData, voor: Voor = "stagegever") {
  if (voor === "stagiair") return `Dag ${b.leerling.voornaam}`;
  const m = b.aanvraag.mentor?.naam?.trim();
  return m ? `Beste ${m}` : "Beste stagegever";
}

export function teksten(b: BevestigingData, voor: Voor = "stagegever") {
  if (voor === "stagiair") {
    const t = tekstenStagegever(b);
    return {
      ...t,
      intro: `Goed nieuws: je stage bij ${naamBedrijf(b)} ligt vast. De stagebegeleiding heeft je aanvraag goedgekeurd.`,
      stappen: [
        { t: "Stagecontract", x: "De stagegever vult eerst het contract aan en tekent. Daarna krijg je een link om zelf te tekenen; bij een minderjarige stagiair tekent ook een ouder of voogd." },
        { t: "Werkrooster", x: `Leg samen met je stagementor vóór de eerste stagedag het werkrooster vast: ${b.blok.uren} uur in totaal, maximaal 8 uur per dag.` },
        { t: "Praktische info", x: "In bijlage vind je de infobrochure en de stagekalender met de vakantie- en feestdagen." },
      ],
      vragen: `Heb je vragen? Mail naar ${SCHOOL.stagemail} of spreek een van de stagebegeleiders aan.`,
    };
  }
  return tekstenStagegever(b);
}

function tekstenStagegever(b: BevestigingData) {
  const lln = naamLeerling(b);
  return {
    intro: `Goed nieuws: de stage van ${lln} (${b.leerling.klas}) bij ${naamBedrijf(b)} ligt vast. Hartelijk dank dat u een stagiair van Spes Nostra Heule die kans geeft.`,
    richting: `Tijdens het schooljaar ${b.schooljaar} lopen de leerlingen van het 5de en 6de jaar Onthaal, organisatie en sales twee keer stage: één keer in een onthaal- of organisatieomgeving en één keer in een salesomgeving.`,
    periode: `Deze ${blokVolgnummer(b)} blokstage loopt van ${datumLang(b.blok.start_datum)} tot en met ${datumLang(b.blok.eind_datum)}.`,
    planning: [
      `${b.blok.uren} uur stage in totaal, gespreid over ${aantalWeken(b)} weken (gemiddeld ${b.blok.uren_per_week} uur per week, pauzes niet meegerekend)`,
      "Geen stage op maandag: de stagiair is dan op school",
      "Geen stage bij familie",
    ],
    toestemming: `Hierbij bevestigen wij dat ${lln} vanaf ${datumLang(b.blok.start_datum)} stage mag lopen bij ${naamBedrijf(b)}.`,
    stappen: [
      {
        t: "Stagecontract",
        x: b.contractLink
          ? "Vul het stagecontract aan en onderteken het digitaal via uw persoonlijke link in de begeleidende mail. Daarna tekenen de stagiair, een ouder (bij een minderjarige stagiair) en de school."
          : "Binnenkort ontvangt u een persoonlijke link om het stagecontract digitaal aan te vullen en te ondertekenen. Daarna tekenen de stagiair, een ouder (bij een minderjarige stagiair) en de school.",
      },
      { t: "Werkrooster", x: `Leg samen met ${b.leerling.voornaam} vóór de eerste stagedag het werkrooster vast: ${b.blok.uren} uur in totaal, maximaal 8 uur per dag.` },
      { t: "Praktische info", x: "In bijlage vindt u de infobrochure met de aanpak van de stage en de stagekalender met de vakantie- en feestdagen." },
    ],
    vragen: `Hebt u vragen over de stage? Mail naar ${SCHOOL.stagemail} of bel een van de stagebegeleiders.`,
  };
}
