// Tijdens de stage: afwezigheden en inhaalstage. Berekening en controles, gedeeld door portaal, stagegeverlink en beheer.
import { kalender, naarMin, plusDagen, uren, werkMin, type Dagen, type RDag, type RoosterBlok, type Uitzondering } from "./werkrooster";

export type Afwezigheid = {
  id: string;
  dossier_id: string;
  datum: string;
  soort: "hele" | "deel";
  aan: string | null;
  ver: string | null;
  gemist_min: number;
  gepland: (RDag & { min: number }) | null;
  auto: boolean;
  reden: string;
  opm: string | null;
  door: "stagiair" | "stagegever" | "school";
  naam: string | null;
  op: string;
  gewettigd: boolean | null;
  gewettigd_op: string | null;
};
export type Inhaal = {
  id: string;
  dossier_id: string;
  datum: string;
  aan: string;
  ver: string;
  pau: number;
  min: number;
  afw: string[];
  opm: string | null;
  door: "stagiair" | "stagegever" | "school";
  naam: string | null;
  op: string;
  status: "gepland" | "ingehaald" | "geannuleerd";
  bev: { naam: string; at: string; aan: string; ver: string; pau: number; min: number; door?: string } | null;
  annul: { door: string; naam: string; at: string } | null;
};
export type TijdensData = { wie: "stagegever" | "stagiair" | "school"; afwezigheden: Afwezigheid[]; inhaal: Inhaal[] };

export const REDENEN = ["Ziek", "Doktersbezoek of ziekenhuis", "Familiale reden", "Te laat", "Vervoersprobleem", "Andere"];
export const WIE_LABEL: Record<string, string> = { stagiair: "stagiair", stagegever: "stagegever", school: "school" };

/** Laatste dag om in te halen: 14 dagen na de laatste stagedag. */
export const inhaalTermijn = (blok: { eind_datum: string }) => plusDagen(blok.eind_datum, 14);

/** Gemiste minuten tegenover het rooster van die dag: hele dag, of te laat (aan) / vroeger weg (ver). */
export function gemistUitRooster(dag: RDag | undefined, soort: "hele" | "deel", aan?: string, ver?: string): number | null {
  if (!dag) return null;
  const tot = werkMin(dag);
  if (soort === "hele") return tot;
  const ga = naarMin(dag.aan)!, gv = naarMin(dag.ver)!;
  const a = naarMin(aan) ?? ga, v = naarMin(ver) ?? gv;
  const aanw = Math.max(ga, Math.min(a, gv)), weg = Math.min(gv, Math.max(v, aanw));
  return Math.min(tot, Math.max(0, aanw - ga) + Math.max(0, gv - weg));
}

export type AfwStand = { afw: Afwezigheid; nodig: number; ingehaald: number; gepland: number; open: number };
export type Stand = {
  per: Map<string, AfwStand>;
  /** in te halen (niet-gewettigde afwezigheden) */
  nodig: number;
  ingehaald: number;
  gepland: number;
  /** nog in te plannen */
  open: number;
  /** nog niet ingehaald (gepland + open) */
  rest: number;
  nietGekoppeld: Inhaal[];
  nietNodig: Inhaal[];
  teBevestigen: Inhaal[];
  teBeoordelen: Afwezigheid[];
  termijn: string;
  verstreken: boolean;
};

/**
 * Uren van een inhaalstage worden verdeeld over de gekoppelde afwezigheden, oudste eerst.
 * Eerst de bevestigde uren (ingehaald), daarna de geplande. Een gewettigde afwezigheid moet niet worden ingehaald.
 */
export function stand(d: { afwezigheden: Afwezigheid[]; inhaal: Inhaal[] }, blok: { eind_datum: string }, vandaag: string): Stand {
  const per = new Map<string, AfwStand>();
  for (const a of [...d.afwezigheden].sort((x, y) => x.datum.localeCompare(y.datum))) {
    per.set(a.id, { afw: a, nodig: a.gewettigd ? 0 : a.gemist_min, ingehaald: 0, gepland: 0, open: 0 });
  }
  const actief = d.inhaal.filter((i) => i.status !== "geannuleerd");
  const verdeel = (i: Inhaal, veld: "ingehaald" | "gepland") => {
    let m = veld === "ingehaald" ? (i.bev?.min ?? i.min) : i.min;
    const lijst = i.afw.map((id) => per.get(id)).filter((x): x is AfwStand => !!x).sort((a, b) => a.afw.datum.localeCompare(b.afw.datum));
    for (const s of lijst) {
      const ruimte = Math.max(0, s.nodig - s.ingehaald - s.gepland);
      const deel = Math.min(ruimte, m);
      s[veld] += deel;
      m -= deel;
      if (m <= 0) break;
    }
  };
  actief.filter((i) => i.status === "ingehaald").sort((a, b) => a.datum.localeCompare(b.datum)).forEach((i) => verdeel(i, "ingehaald"));
  actief.filter((i) => i.status === "gepland").sort((a, b) => a.datum.localeCompare(b.datum)).forEach((i) => verdeel(i, "gepland"));
  let nodig = 0, ingehaald = 0, gepland = 0, open = 0;
  for (const s of per.values()) {
    s.open = Math.max(0, s.nodig - s.ingehaald - s.gepland);
    nodig += s.nodig; ingehaald += s.ingehaald; gepland += s.gepland; open += s.open;
  }
  const termijn = inhaalTermijn(blok);
  return {
    per, nodig, ingehaald, gepland, open, rest: open + gepland,
    nietGekoppeld: actief.filter((i) => i.status === "gepland" && !i.afw.some((id) => per.has(id))),
    nietNodig: actief.filter((i) => i.status === "gepland" && i.afw.length > 0 && i.afw.every((id) => per.get(id)?.afw.gewettigd === true)),
    teBevestigen: actief.filter((i) => i.status === "gepland" && i.datum <= vandaag),
    teBeoordelen: d.afwezigheden.filter((a) => a.gewettigd === null),
    termijn,
    verstreken: vandaag > termijn && open + gepland > 0,
  };
}

/** Status van een afwezigheid in woorden. */
export function afwLabel(s: AfwStand) {
  if (s.afw.gewettigd) return "niet nodig (gewettigd)";
  if (s.nodig === 0) return "niets gemist";
  if (s.ingehaald >= s.nodig) return "ingehaald";
  if (s.ingehaald + s.gepland >= s.nodig) return s.ingehaald ? `${uren(s.ingehaald)} ingehaald, rest gepland` : "gepland";
  if (s.ingehaald || s.gepland) return `nog ${uren(s.open)} in te plannen`;
  return "nog in te plannen";
}

export type InhaalControle = { fouten: string[]; waarsch: string[] };

/** Controles bij het plannen van een inhaalstage (zelfde regels als het werkrooster, stagereglement art. 7). */
export function inhaalControle(
  x: { datum: string; aan: string; ver: string; pau: number; afw: string[]; id?: string },
  ctx: { blok: RoosterBlok; uitz: Uitzondering[]; meerderjarig: boolean; rooster: Dagen | null; inhaal: Inhaal[]; st: Stand | null },
): InhaalControle {
  const f: string[] = [], w: string[] = [];
  const termijn = inhaalTermijn(ctx.blok);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x.datum)) return { fouten: ["Kies een datum."], waarsch: [] };
  if (x.datum < ctx.blok.start_datum) f.push("Inhaalstage kan niet vóór de start van de blokstage.");
  if (x.datum > termijn) f.push(`Inhaalstage kan tot 14 dagen na de laatste stagedag (uiterlijk ${termijn.split("-").reverse().join("/")}).`);
  const a = naarMin(x.aan), v = naarMin(x.ver), p = Number(x.pau) || 0;
  if (a === null || v === null) f.push("Vul het begin- en einduur in.");
  else if (v <= a) f.push("Het einduur ligt vóór het beginuur.");
  else if (p >= v - a) f.push("De pauze is langer dan de werktijd.");
  const kal = new Map(kalender(ctx.blok, ctx.uitz).flatMap((wk) => wk.dagen).map((d) => [d.iso, d] as const));
  const k = kal.get(x.datum);
  const wd = (new Date(`${x.datum}T00:00:00Z`).getUTCDay() + 6) % 7;
  const na = x.datum > ctx.blok.eind_datum;
  if (k?.soort === "vm" && a !== null && a < 13 * 60) f.push("Geen stage in de voormiddag op deze dag: begin ten vroegste om 13u.");
  if (k?.soort === "geen") f.push(`Geen stage op deze dag${k.label ? ` (${k.label})` : ""}.`);
  const werk = a !== null && v !== null && v > a ? v - a - p : 0;
  if (!ctx.meerderjarig && werk) {
    const rooster = ctx.rooster?.[x.datum];
    const ander = ctx.inhaal.filter((i) => i.datum === x.datum && i.status !== "geannuleerd" && i.id !== x.id).reduce((s, i) => s + i.min, 0);
    if (werk + werkMin(rooster) + ander > 8 * 60) f.push("Jonger dan 18: samen met de gewone stage maximum 8 uur op één dag.");
    if (werk > 6 * 60 && p < 60) f.push("Jonger dan 18: bij meer dan 6 uur werk minstens 1 uur pauze.");
    else if (werk > 4.5 * 60 && p < 30) f.push("Jonger dan 18: bij meer dan 4,5 uur werk minstens een half uur pauze.");
    if ((a ?? 0) < 6 * 60 || (v ?? 0) > 20 * 60) f.push("Jonger dan 18: geen stage tussen 20u en 6u.");
    if (wd === 6) w.push("Stage op zondag voor een minderjarige: enkel in uitzonderlijke gevallen.");
  }
  const geschikt = na || wd === 5 || (wd === 2 && (a ?? 0) >= 12 * 60) || k?.soort === "vakantie";
  if (wd === 0) w.push("Op maandag is de stagiair op school.");
  else if (!geschikt) w.push("Volgens het stagereglement wordt inhaalstage gepland op woensdagnamiddag, zaterdag, in de vakantie of na de blokstage.");
  if (ctx.rooster?.[x.datum]) w.push("Op deze dag staat al stage in het werkrooster.");
  if (ctx.st && x.afw.length) {
    const open = x.afw.reduce((s, id) => s + (ctx.st!.per.get(id)?.open ?? 0), 0);
    const al = ctx.inhaal.find((i) => i.id === x.id && i.status === "gepland");
    if (werk > open + (al ? al.min : 0)) w.push(`Je plant ${uren(werk)}, maar bij de gekoppelde afwezigheid staat nog ${uren(open + (al ? al.min : 0))} open.`);
  }
  if (!x.afw.length) w.push("Deze inhaalstage is niet gekoppeld aan een afwezigheid: de uren tellen dan niet mee.");
  return { fouten: f, waarsch: w };
}

/** Kort: "12u in te halen · 4u ingehaald · 4u gepland · nog 4u in te plannen" */
export function standTekst(s: Stand) {
  if (!s.per.size) return "Geen afwezigheden gemeld";
  if (!s.nodig) return "Niets in te halen";
  if (!s.rest) return `Alles ingehaald (${uren(s.ingehaald)})`;
  return [`${uren(s.nodig)} in te halen`, s.ingehaald ? `${uren(s.ingehaald)} ingehaald` : "", s.gepland ? `${uren(s.gepland)} gepland` : "", s.open ? `nog ${uren(s.open)} in te plannen` : ""].filter(Boolean).join(" · ");
}
