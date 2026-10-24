// Afronding van de stage: gepresteerde uren, controlelijst en status. Gedeeld door beheer, portaal en attest.
import { geldendRooster, totaalMin, uren, type RoosterRij } from "./werkrooster";
import { stand, type Afwezigheid, type Inhaal } from "./tijdens";
import type { EvaluatieRij, Resultaat } from "./evaluaties";

export type Afronding = {
  dossier_id: string;
  afgerond_op: string;
  afgerond_door: string | null;
  uren_min: number;
  attest_code: string;
  gemaild_op: string | null;
};

export type Uren = {
  vereist: number;     // minuten volgens de blokstage
  gepland: number;     // minuten in het goedgekeurde rooster
  gemist: number;      // alle gemelde afwezigheden
  gewettigd: number;   // waarvan gewettigd (niet in te halen)
  ingehaald: number;   // bevestigde inhaalstage
  gepresteerd: number; // gepland - gemist + ingehaald
  open: number;        // nog in te halen of te bevestigen
};

export function urenBerekening(
  blok: { uren: number; eind_datum: string },
  rooster: RoosterRij | null,
  afw: Afwezigheid[],
  inhaal: Inhaal[],
  vandaag: string,
): Uren {
  const dagen = geldendRooster(rooster);
  const gepland = dagen ? totaalMin(dagen) : 0;
  const gemist = afw.reduce((s, a) => s + (a.gemist_min ?? 0), 0);
  const gewettigd = afw.filter((a) => a.gewettigd).reduce((s, a) => s + (a.gemist_min ?? 0), 0);
  const ingehaald = inhaal.filter((i) => i.status === "ingehaald").reduce((s, i) => s + (i.bev?.min ?? i.min), 0);
  const st = stand({ afwezigheden: afw, inhaal }, blok, vandaag);
  return { vereist: blok.uren * 60, gepland, gemist, gewettigd, ingehaald, gepresteerd: Math.max(0, gepland - gemist + ingehaald), open: st.rest };
}

export type Check = { k: string; label: string; ok: boolean; detail: string; nodig: boolean };

/** Controlelijst vóór afronden. 'nodig' = moet in orde zijn; de rest is een aandachtspunt. */
export function controlelijst(o: {
  blok: { eind_datum: string; uren: number };
  vandaag: string;
  rooster: RoosterRij | null;
  u: Uren;
  teBeoordelen: number;
  evaluaties: EvaluatieRij[];
  resultaat: Resultaat | null;
}): Check[] {
  const e = (s: EvaluatieRij["soort"]) => o.evaluaties.find((x) => x.soort === s)?.status === "ingediend";
  const tekort = o.u.vereist - o.u.gewettigd - o.u.gepresteerd;
  return [
    { k: "einde", label: "Stageperiode voorbij", ok: o.vandaag > o.blok.eind_datum, detail: o.vandaag > o.blok.eind_datum ? "" : "de stage loopt nog", nodig: false },
    { k: "rooster", label: "Werkrooster goedgekeurd", ok: geldendRooster(o.rooster) !== null, detail: geldendRooster(o.rooster) ? "" : "nog geen goedgekeurd rooster", nodig: true },
    {
      k: "afw", label: "Afwezigheden afgehandeld", ok: o.u.open === 0 && o.teBeoordelen === 0,
      detail: [o.u.open ? `nog ${uren(o.u.open)} in te halen of te bevestigen` : "", o.teBeoordelen ? `${o.teBeoordelen} afwezigheid nog te beoordelen` : ""].filter(Boolean).join(" · "),
      nodig: true,
    },
    {
      k: "uren", label: "Uren gepresteerd", ok: tekort <= 0,
      detail: `${uren(o.u.gepresteerd)} van ${uren(o.u.vereist)}${o.u.gewettigd ? ` (${uren(o.u.gewettigd)} gewettigd afwezig)` : ""}${tekort > 0 ? ` · ${uren(tekort)} te weinig` : ""}`,
      nodig: false,
    },
    { k: "mentor", label: "Evaluatie stagementor", ok: e("mentor"), detail: e("mentor") ? "" : "nog niet ingediend", nodig: false },
    { k: "eval", label: "Evaluatie opengesteld", ok: !!o.resultaat?.vrijgegeven_op, detail: o.resultaat?.vrijgegeven_op ? (o.resultaat.eindpunt !== null ? `eindpunt ${o.resultaat.eindpunt}` : "") : "nog niet opengesteld", nodig: true },
    { k: "verslag", label: "Stageverslag", ok: e("verslag"), detail: e("verslag") ? "" : "nog niet ingediend", nodig: false },
    { k: "feedback", label: "Feedback stagegever", ok: e("feedback"), detail: e("feedback") ? "" : "nog niet ingevuld", nodig: false },
  ];
}

export const klaar = (c: Check[]) => c.every((x) => !x.nodig || x.ok);

/** Code op het attest, bv. R2S-2627-7F3K9Q. */
export function attestCode(schooljaar: string) {
  const tekens = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const r = new Uint32Array(6);
  globalThis.crypto.getRandomValues(r);
  for (const x of r) s += tekens[x % tekens.length];
  const m = schooljaar.match(/(\d{2})(\d{2})\D+(\d{2})?(\d{2})/);
  return `R2S-${m ? m[2] + m[4] : "0000"}-${s}`;
}
