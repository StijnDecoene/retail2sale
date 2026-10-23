// Werkrooster: kalender, standaarddagen, controles en verschillen. Gedeeld door portaal, stagegeverlink, beheer en pdf.

export type RDag = { aan: string; ver: string; pau: number };
export type Dagen = Record<string, RDag>;
export type Soort = "buiten" | "stage" | "school" | "zondag" | "vakantie" | "vm" | "geen";
export type KDag = { iso: string; dag: number; wd: number; soort: Soort; label?: string };
export type KWeek = { nr: number; maandag: string; dagen: KDag[] };
export type Uitzondering = { van: string; tot: string; naam: string; soort: "vakantie" | "vm" | "geen" };
export type RoosterBlok = { naam: string; start_datum: string; eind_datum: string; uren: number; uren_per_week: number };

export type RoosterStatus = "concept" | "ingediend" | "goedgekeurd" | "terug";
export type RoosterRij = {
  dossier_id: string;
  dagen: Dagen;
  opmerkingen: string | null;
  totaal_min: number;
  status: RoosterStatus;
  ingediend_op: string | null;
  ingediend_door: string | null;
  bevestiging: { naam: string; at: string; vakAkkoord: boolean } | null;
  feedback: string | null;
  goedgekeurd_op: string | null;
  vorige: { dagen: Dagen; opmerkingen: string | null; totaal_min: number; goedgekeurd_op: string | null } | null;
  heropend_op: string | null;
  historiek: { goedgekeurd_op: string; totaal_min: number; gewijzigd_op: string }[];
  gewijzigd_op: string;
  gewijzigd_door: string | null;
};

/** Wat de roosterpagina krijgt (rooster_laden). */
export type RoosterContext = {
  wie: "stagegever" | "stagiair" | "school";
  dossier_id: string;
  rooster: RoosterRij | null;
  meerderjarig: boolean;
  leerling: { voornaam: string; naam: string; klas: string };
  blok: RoosterBlok & { code: string; schooljaar: string };
  uitzonderingen: Uitzondering[];
  stagegever: { winkel: string | null; naam: string | null; mentor: string | null };
  startuur: string | null;
};

const WD = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const WD_LANG = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];
const MAAND = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const MAAND_LANG = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

const dt = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);
const wdVan = (s: string) => (dt(s).getUTCDay() + 6) % 7;
export const dagKort = (s: string) => { const x = dt(s); return `${WD[wdVan(s)]} ${x.getUTCDate()} ${MAAND[x.getUTCMonth()]}`; };
export const dagLang = (s: string) => { const x = dt(s); return `${WD_LANG[wdVan(s)]} ${x.getUTCDate()} ${MAAND_LANG[x.getUTCMonth()]}`; };
export const volgendeDag = (s: string) => { const x = dt(s); x.setUTCDate(x.getUTCDate() + 1); return iso(x); };
export const plusDagen = (s: string, n: number) => { const x = dt(s); x.setUTCDate(x.getUTCDate() + n); return iso(x); };

/** Weken (maandag–zondag) van de blokstage, met per dag wat er kan. */
export function kalender(blok: { start_datum: string; eind_datum: string }, uitz: Uitzondering[]): KWeek[] {
  const start = dt(blok.start_datum), eind = dt(blok.eind_datum);
  const maandag = new Date(start);
  maandag.setUTCDate(maandag.getUTCDate() - ((maandag.getUTCDay() + 6) % 7));
  const weken: KWeek[] = [];
  let nr = 0;
  for (const w = new Date(maandag); w <= eind; w.setUTCDate(w.getUTCDate() + 7)) {
    const dagen: KDag[] = [];
    for (let i = 0; i < 7; i++) {
      const x = new Date(w);
      x.setUTCDate(w.getUTCDate() + i);
      const s = iso(x);
      let dag: KDag = { iso: s, dag: x.getUTCDate(), wd: i, soort: "stage" };
      if (x < start || x > eind) dag = { ...dag, soort: "buiten" };
      else {
        const u = uitz.find((u) => u.van <= s && s <= u.tot);
        if (u) dag = { ...dag, soort: u.soort, label: u.naam };
        else if (i === 6) dag = { ...dag, soort: "zondag", label: "Zondag" };
        else if (i === 0) dag = { ...dag, soort: "school", label: "School" };
      }
      dagen.push(dag);
    }
    nr++;
    weken.push({ nr, maandag: iso(w), dagen });
  }
  return weken;
}

/** Op deze dag kan er stage zijn (eventueel in overleg). */
export const kanStage = (s: Soort) => s === "stage" || s === "vm" || s === "vakantie" || s === "zondag";
/** Stage op deze dag vraagt een bevestiging dat het in overleg is afgesproken. */
export const inOverleg = (s: Soort) => s === "vakantie" || s === "zondag";

export const naarMin = (t?: string | null) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
export const naarTijd = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
/** 450 → "7u30", 480 → "8u" */
export const uren = (m: number) => {
  const neg = m < 0, a = Math.abs(Math.round(m));
  return `${neg ? "-" : ""}${Math.floor(a / 60)}u${a % 60 ? String(a % 60).padStart(2, "0") : ""}`;
};
export const tijdKort = (t: string) => { const m = naarMin(t); return m === null ? t : `${Math.floor(m / 60)}u${m % 60 ? String(m % 60).padStart(2, "0") : ""}`; };

/** Gepresteerde minuten van een dag (zonder pauze). */
export function werkMin(d?: RDag | null) {
  if (!d) return 0;
  const a = naarMin(d.aan), v = naarMin(d.ver);
  if (a === null || v === null || v <= a) return 0;
  return Math.max(0, v - a - (Number(d.pau) || 0));
}
export const totaalMin = (dagen: Dagen) => Object.values(dagen).reduce((s, d) => s + werkMin(d), 0);

/** Standaard voor een nieuw aangevinkte dag: vanaf het startuur uit de aanvraag (of 8u) tot negen uur later, met een uur pauze. */
export function standaardDag(soort: Soort, startuur?: string | null): RDag {
  if (soort === "vm") return { aan: "13:00", ver: "17:00", pau: 0 };
  const s = naarMin(startuur);
  const aan = s !== null && s >= 6 * 60 && s <= 11 * 60 ? s : 8 * 60;
  return { aan: naarTijd(aan), ver: naarTijd(Math.min(aan + 9 * 60, 20 * 60)), pau: 60 };
}

export type Controle = {
  /** per dag: blokkerende fouten */
  dag: Record<string, string[]>;
  /** per dag: waarschuwingen (niet blokkerend) */
  dagW: Record<string, string[]>;
  /** per week (maandag-iso): blokkerende fouten */
  week: Record<string, string[]>;
  weekMin: Record<string, number>;
  totaal: number;
  doel: number;
  /** dagen in een vakantie of op zondag: extra bevestiging nodig */
  overleg: string[];
  aantalDagen: number;
  /** alle blokkerende fouten samen (zonder het totaal) */
  aantalFouten: number;
  totaalOk: boolean;
};

/**
 * Controles van het werkrooster. Blokkerend: onvolledige of onmogelijke uren, stage op een dag zonder stage,
 * de regels voor jeugdige werknemers bij een minderjarige stagiair (contract art. 1) en een totaal dat niet
 * exact het aantal uren van de blokstage is.
 */
export function controle(dagen: Dagen, blok: RoosterBlok, uitz: Uitzondering[], meerderjarig: boolean): Controle {
  const kal = kalender(blok, uitz);
  const soortVan = new Map(kal.flatMap((w) => w.dagen).map((d) => [d.iso, d] as const));
  const c: Controle = { dag: {}, dagW: {}, week: {}, weekMin: {}, totaal: 0, doel: blok.uren * 60, overleg: [], aantalDagen: 0, aantalFouten: 0, totaalOk: false };
  const fout = (s: string, t: string) => ((c.dag[s] ??= []).push(t), c.aantalFouten++);
  const let_op = (s: string, t: string) => (c.dagW[s] ??= []).push(t);

  const isos = Object.keys(dagen).sort();
  for (const s of isos) {
    const d = dagen[s];
    const k = soortVan.get(s);
    c.aantalDagen++;
    if (!k || k.soort === "buiten") { fout(s, "Deze dag valt buiten de blokstage."); continue; }
    if (k.soort === "school") fout(s, "Op maandag is de stagiair op school.");
    if (k.soort === "geen") fout(s, `Geen stage${k.label ? ` (${k.label})` : ""}.`);
    if (inOverleg(k.soort)) c.overleg.push(s);
    const a = naarMin(d.aan), v = naarMin(d.ver), p = Number(d.pau) || 0;
    if (a === null || v === null) { fout(s, "Vul het begin- en einduur in."); continue; }
    if (v <= a) { fout(s, "Het einduur ligt vóór het beginuur."); continue; }
    if (p < 0 || p >= v - a) { fout(s, "De pauze is langer dan de werktijd."); continue; }
    if (k.soort === "vm" && a < 13 * 60) fout(s, `Geen stage in de voormiddag${k.label ? ` (${k.label})` : ""}: begin ten vroegste om 13u.`);
    const w = v - a - p;
    if (!meerderjarig) {
      if (w > 8 * 60) fout(s, "Jonger dan 18: maximum 8 uur per dag.");
      if (w > 6 * 60 && p < 60) fout(s, "Jonger dan 18: bij meer dan 6 uur werk minstens 1 uur pauze.");
      else if (w > 4.5 * 60 && p < 30) fout(s, "Jonger dan 18: bij meer dan 4,5 uur werk minstens een half uur pauze.");
      if (a < 6 * 60 || v > 20 * 60) fout(s, "Jonger dan 18: geen stage tussen 20u en 6u.");
      const vorige = dagen[plusDagen(s, -1)];
      const vv = naarMin(vorige?.ver);
      if (vorige && vv !== null && 24 * 60 - vv + a < 12 * 60) fout(s, "Jonger dan 18: minstens 12 uur rust tussen twee stagedagen.");
      if (k.soort === "zondag") let_op(s, "Stage op zondag voor een minderjarige: enkel in uitzonderlijke gevallen.");
    } else if (w > 9 * 60) let_op(s, "Meer dan 9 uur op één dag.");
    c.totaal += w;
  }
  for (const wk of kal) {
    const m = wk.dagen.reduce((s, d) => s + werkMin(dagen[d.iso]), 0);
    c.weekMin[wk.maandag] = m;
    if (!meerderjarig && m > 40 * 60) { (c.week[wk.maandag] ??= []).push("Jonger dan 18: maximum 40 uur per week."); c.aantalFouten++; }
  }
  c.totaalOk = c.totaal === c.doel;
  return c;
}

/** Waarom kan dit rooster (nog) niet worden ingediend? Leeg = in orde. */
export function indienFouten(c: Controle) {
  const f: string[] = [];
  if (!c.aantalDagen) f.push("Er zijn nog geen stagedagen gepland.");
  if (c.aantalFouten) f.push(c.aantalFouten === 1 ? "Er is nog 1 fout in het rooster." : `Er zijn nog ${c.aantalFouten} fouten in het rooster.`);
  if (!c.totaalOk) {
    const v = c.doel - c.totaal;
    f.push(v > 0 ? `Het totaal moet ${uren(c.doel)} zijn: er ontbreekt nog ${uren(v)}.` : `Het totaal moet ${uren(c.doel)} zijn: er is ${uren(-v)} te veel gepland.`);
  }
  return f;
}

/** Een week overnemen in de volgende weken: enkel gewone stagedagen (vakanties en uitzonderingen blijven ongewijzigd). */
export function weekKopieren(dagen: Dagen, kal: KWeek[], vanWeek: string): Dagen {
  const i = kal.findIndex((w) => w.maandag === vanWeek);
  if (i < 0) return dagen;
  const bron = kal[i];
  const uit: Dagen = { ...dagen };
  for (const w of kal.slice(i + 1)) {
    w.dagen.forEach((d, wd) => {
      const b = bron.dagen[wd];
      if (d.soort !== "stage" || b.soort !== "stage") return;
      if (dagen[b.iso]) uit[d.iso] = { ...dagen[b.iso] };
      else delete uit[d.iso];
    });
  }
  return uit;
}

export type Verschil = { iso: string; oud?: RDag; nieuw?: RDag };
const zelfde = (a?: RDag, b?: RDag) => (!a && !b) || (!!a && !!b && a.aan === b.aan && a.ver === b.ver && Number(a.pau) === Number(b.pau));
export function verschillen(oud: Dagen, nieuw: Dagen): Verschil[] {
  const alle = [...new Set([...Object.keys(oud), ...Object.keys(nieuw)])].sort();
  return alle.filter((s) => !zelfde(oud[s], nieuw[s])).map((s) => ({ iso: s, oud: oud[s], nieuw: nieuw[s] }));
}
export const dagTekst = (d?: RDag) => (d ? `${tijdKort(d.aan)}–${tijdKort(d.ver)}${d.pau ? ` (pauze ${d.pau} min)` : ""}` : "geen stage");

/** Status voor de stappenbalk en het beheer. */
export function roosterStand(r: RoosterRij | null): { code: "leeg" | "concept" | "terug" | "ingediend" | "goedgekeurd" | "wijziging" | "wijziging_ingediend"; label: string } {
  if (!r) return { code: "leeg", label: "Nog te plannen" };
  if (r.status === "goedgekeurd") return { code: "goedgekeurd", label: "Goedgekeurd" };
  if (r.vorige) {
    if (r.status === "ingediend") return { code: "wijziging_ingediend", label: "Wijziging wordt nagekeken" };
    if (r.status === "terug") return { code: "terug", label: "Wijziging teruggestuurd" };
    return { code: "wijziging", label: "Wordt aangepast" };
  }
  if (r.status === "ingediend") return { code: "ingediend", label: "Wordt nagekeken" };
  if (r.status === "terug") return { code: "terug", label: "Aanpassing gevraagd" };
  return { code: "concept", label: r.totaal_min ? `Concept: ${uren(r.totaal_min)} gepland` : "Nog te plannen" };
}

/** Het rooster dat nu geldt: het goedgekeurde (ook tijdens een wijziging). */
export function geldendRooster(r: RoosterRij | null): Dagen | null {
  if (!r) return null;
  if (r.status === "goedgekeurd") return r.dagen;
  return r.vorige?.dagen ?? null;
}

/** Korte tekst van het rooster, per week (voor mails en het beheer). */
export function roosterTekst(dagen: Dagen) {
  return Object.keys(dagen).sort().map((s) => `${dagKort(s)}: ${dagTekst(dagen[s])}`);
}
