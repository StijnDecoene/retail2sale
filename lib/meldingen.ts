// Meldingen voor de stagebegeleiding (gedeeld door banner en pagina).
export type Melding = { id: number; dossier_id: string | null; soort: string; tekst: string; door: string | null; op: string };
export const SOORTEN: Record<string, { een: string; meer: string }> = {
  afwezigheid: { een: "afwezigheid", meer: "afwezigheden" },
  inhaal: { een: "inhaalstage", meer: "inhaalstages" },
  rooster: { een: "werkrooster", meer: "werkroosters" },
  contract: { een: "handtekening", meer: "handtekeningen" },
  top3: { een: "top 3", meer: "top 3's" },
  aanvraag: { een: "aanvraag", meer: "aanvragen" },
  evaluatie: { een: "evaluatie", meer: "evaluaties" },
  afronding: { een: "feedback", meer: "feedback" },
  document: { een: "document", meer: "documenten" },
};
export const soortTekst = (soort: string, n: number) => `${n} ${n === 1 ? SOORTEN[soort]?.een ?? soort : SOORTEN[soort]?.meer ?? soort}`;
