// Overzicht voor de stagegever: al zijn stagiairs en wat er per stagiair te doen is.
import { plusDagen } from "./werkrooster";

export type StagiairKort = {
  token: string;
  naam: string;
  klas: string;
  blok: string;
  start_datum: string;
  eind_datum: string;
  winkel: string | null;
  getekend: boolean;
  contract_rond: boolean;
  rooster: "concept" | "ingediend" | "goedgekeurd" | "terug" | null;
  mentor_eval: "concept" | "ingediend" | null;
  feedback: "concept" | "ingediend" | null;
  afgerond: boolean;
  te_bevestigen: number;
};
export type Overzicht = { email: string; stagiairs: StagiairKort[] };

export type Taak = { tekst: string; uitleg: string; href: string; dringend: boolean };

/** Wat de stagegever nu moet doen voor deze stagiair (leeg = niets). */
export function taken(s: StagiairKort, vandaag: string): Taak[] {
  const t: Taak[] = [];
  const l = (x = "") => `/rooster/${s.token}${x}`;
  if (!s.getekend) t.push({ tekst: "Stagecontract aanvullen en ondertekenen", uitleg: "Ongeveer 5 minuten", href: `/contract/${s.token}`, dringend: true });
  if (s.getekend && (!s.rooster || s.rooster === "concept" || s.rooster === "terug")) {
    t.push({ tekst: s.rooster === "terug" ? "Werkrooster aanpassen" : "Werkrooster plannen en indienen", uitleg: `Vóór de eerste stagedag · ongeveer 10 minuten`, href: l(), dringend: vandaag >= plusDagen(s.start_datum, -14) });
  }
  if (s.te_bevestigen > 0) t.push({ tekst: "Inhaalstage bevestigen", uitleg: "Bevestig dat de ingehaalde uren gepresteerd zijn", href: l("?tab=afwezig"), dringend: true });
  if (vandaag >= plusDagen(s.eind_datum, -7) && s.mentor_eval !== "ingediend") {
    t.push({ tekst: "Evaluatie invullen", uitleg: "Op het einde van de stage · ongeveer 15 minuten", href: l("?tab=evaluatie"), dringend: vandaag >= s.eind_datum });
  }
  if (vandaag > s.eind_datum && s.feedback !== "ingediend") t.push({ tekst: "Feedback geven over de samenwerking", uitleg: "Ongeveer 2 minuten", href: l("?tab=afronding"), dringend: false });
  return t;
}

export function fase(s: StagiairKort, vandaag: string) {
  if (s.afgerond) return "Afgerond";
  if (vandaag < s.start_datum) return "Voor de stage";
  if (vandaag <= s.eind_datum) return "Stage loopt";
  return "Stage voorbij";
}
