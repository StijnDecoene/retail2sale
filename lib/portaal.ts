// Leerlingportaal: gedeelde types, keuzelijsten, controles en de status per stap.
// Wordt zowel door het portaal als door het beheer gebruikt (geen server-only code).

export type Profiel = {
  gsm?: string;
  straat?: string;
  postcode?: string;
  gemeente?: string;
  ouder_naam?: string;
  ouder_gsm?: string;
  ouder_email?: string;
  rijbewijs?: string;
  talen?: string;
  aandacht?: string;
  toestemming?: boolean;
};

export type Keuze = {
  type?: "sales" | "onthaal" | "";
  branche?: string;
  winkel?: string;
  adres?: string;
  postcode?: string;
  gemeente?: string;
  web?: string;
  contact?: string;
  vervoer?: string;
  motivatie?: string;
};

export type AanvraagGegevens = {
  stagiair?: { geboortedatum?: string; gsm?: string; nood_naam?: string; nood_tel?: string };
  bedrijf?: { naam?: string; juridisch?: string; kbo?: string; sector?: string; straat?: string; postcode?: string; gemeente?: string; tel?: string; web?: string; soort?: "sales" | "onthaal" | "" };
  mentor?: { naam?: string; functie?: string; email?: string; tel?: string };
  verantwoordelijke?: { zelfde?: boolean; naam?: string; functie?: string; email?: string; tel?: string };
  werkvloer?: { taken?: string; kledij?: string[]; startuur?: string; melden?: string };
  akkoord?: { uren?: boolean; maandag?: boolean; familie?: boolean };
};

export type Top3Rij = { dossier_id: string; keuzes: Keuze[]; status: "concept" | "ingediend"; ingediend_op: string | null };
export type AanvraagRij = { dossier_id: string; keuze_nr: number | null; gegevens: AanvraagGegevens; status: "concept" | "ingediend"; ingediend_op: string | null };
export type Beoordeling = {
  dossier_id: string;
  stap: "top3" | "aanvraag";
  status: "goedgekeurd" | "aanpassen";
  keuzes: number[];
  feedback: string | null;
  op: string;
  door: string | null;
};

export const BRANCHES: Record<"sales" | "onthaal", string[]> = {
  sales: ["Kleding & mode", "Schoenen", "Sport & outdoor", "Supermarkt & voeding", "Bakker, slager of speciaalzaak", "Doe-het-zelf & tuin", "Elektronica & multimedia", "Interieur & wonen", "Drogisterij & beauty", "Boeken, papier & speelgoed", "Juwelen & accessoires", "Dierenspeciaalzaak", "Andere"],
  onthaal: ["Receptie van een bedrijf of kantoor", "Hotel of B&B", "Ziekenhuis, woonzorgcentrum of dokterspraktijk", "Gemeentehuis, OCMW of stadskantoor", "Toerisme of bezoekerscentrum", "Bibliotheek, cultuurcentrum of museum", "Sportcentrum, zwembad of fitness", "Garage of autodealer (showroom)", "Notaris, advocaat of boekhoudkantoor", "Uitzendkantoor", "Vakantiepark of camping", "Andere"],
};
export const VERVOER = ["Te voet", "Fiets", "Bus of tram", "Trein", "Bromfiets", "Lift met de auto"];
export const RIJBEWIJS = ["Geen", "Voorlopig", "Definitief"];
export const KLEDIJ: [string, string][] = [
  ["eigen", "Eigen nette kledij"], ["uniform", "Werkkledij of uniform (voorzien)"], ["veiligheidsschoenen", "Veiligheidsschoenen verplicht"],
  ["gesloten", "Gesloten schoenen"], ["schort", "Schort (voorzien)"], ["haarnet", "Haarnet of pet"], ["sieraden", "Geen sieraden, haren vast"], ["badge", "Naambadge (voorzien)"],
];

// ---------------------------------------------------------------------------
// Controles bij het indienen (zelfde regels in portaal en server action)
// ---------------------------------------------------------------------------
const leeg = (v: unknown) => v === undefined || v === null || String(v).trim() === "";

/** Geeft de lijst met ontbrekende of foute velden (sleutels zoals "profiel.ouder_naam" of "keuze1.winkel"). */
export function top3Fouten(profiel: Profiel, keuzes: Keuze[]): Record<string, string> {
  const f: Record<string, string> = {};
  if (!profiel.toestemming) f["profiel.toestemming"] = "Vink de toestemming aan.";
  [0, 1, 2].forEach((i) => {
    const k = keuzes[i] ?? {};
    const p = `keuze${i + 1}.`;
    if (leeg(k.type)) f[p + "type"] = "Kies sales of onthaal.";
    if (leeg(k.winkel)) f[p + "winkel"] = "Vul dit in.";
    if (leeg(k.adres)) f[p + "adres"] = "Vul dit in.";
    if (!/^\d{4}$/.test(String(k.postcode ?? "").trim())) f[p + "postcode"] = "Vier cijfers.";
    if (leeg(k.gemeente)) f[p + "gemeente"] = "Vul dit in.";
    if (i < 2 && leeg(k.motivatie)) f[p + "motivatie"] = "Schrijf kort waarom.";
  });
  return f;
}

export function leeftijdOp(geboortedatum: string | undefined, dagIso: string): number | null {
  if (!geboortedatum || !/^\d{4}-\d{2}-\d{2}$/.test(geboortedatum)) return null;
  const [gj, gm, gd] = geboortedatum.split("-").map(Number);
  const [j, m, d] = dagIso.split("-").map(Number);
  let a = j - gj;
  if (m < gm || (m === gm && d < gd)) a--;
  return a;
}

export function aanvraagFouten(g: AanvraagGegevens, startBlok: string): Record<string, string> {
  const f: Record<string, string> = {};
  const req: [string, unknown][] = [
    ["bedrijf.naam", g.bedrijf?.naam], ["bedrijf.kbo", g.bedrijf?.kbo], ["bedrijf.straat", g.bedrijf?.straat],
    ["bedrijf.postcode", g.bedrijf?.postcode], ["bedrijf.gemeente", g.bedrijf?.gemeente], ["bedrijf.soort", g.bedrijf?.soort],
    ["mentor.naam", g.mentor?.naam], ["mentor.email", g.mentor?.email],
    ["stagiair.geboortedatum", g.stagiair?.geboortedatum], ["stagiair.nood_naam", g.stagiair?.nood_naam], ["stagiair.nood_tel", g.stagiair?.nood_tel],
  ];
  if (g.verantwoordelijke?.zelfde === false) req.push(["verantwoordelijke.naam", g.verantwoordelijke?.naam]);
  req.forEach(([k, v]) => { if (leeg(v)) f[k] = "Vul dit in."; });
  if (g.mentor?.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g.mentor.email)) f["mentor.email"] = "Geen geldig e-mailadres.";
  if (g.bedrijf?.postcode && !/^\d{4}$/.test(g.bedrijf.postcode.trim())) f["bedrijf.postcode"] = "Vier cijfers.";
  const lft = leeftijdOp(g.stagiair?.geboortedatum, startBlok);
  if (g.stagiair?.geboortedatum && (lft === null || lft < 14 || lft > 25)) f["stagiair.geboortedatum"] = "Controleer de geboortedatum.";
  if (!g.akkoord?.uren || !g.akkoord?.maandag || !g.akkoord?.familie) f["akkoord"] = "Vink de drie afspraken aan.";
  return f;
}

// ---------------------------------------------------------------------------
// Status per stap
// ---------------------------------------------------------------------------
export type Toestand = "done" | "wait" | "action" | "fix" | "locked";
export type StapStatus = { state: Toestand; code: string; label: string };

export const STAPPEN = [
  { k: "top3", t: "Top 3", wie: "Stagiair" },
  { k: "aanvraag", t: "Aanvraag", wie: "Stagiair + stagegever" },
  { k: "infomail", t: "Info-mail", wie: "Stagebegeleiding" },
  { k: "contract", t: "Contract", wie: "Alle partijen" },
  { k: "rooster", t: "Werkrooster", wie: "Stagegever + stagiair" },
] as const;
export type StapKey = (typeof STAPPEN)[number]["k"];

export function stapStatus(d: {
  stageplaats_id: string | null;
  top3: Top3Rij | null;
  aanvraag: AanvraagRij | null;
  beoordelingen: Beoordeling[];
}): Record<StapKey, StapStatus> {
  const b3 = d.beoordelingen.find((b) => b.stap === "top3");
  const ba = d.beoordelingen.find((b) => b.stap === "aanvraag");
  // Stageplaats al geregeld buiten het portaal (bv. gekoppeld uit een stagelijst).
  const geregeld = !!d.stageplaats_id && !d.top3 && !d.aanvraag && !b3 && !ba;

  let top3: StapStatus;
  if (geregeld) top3 = { state: "done", code: "geregeld", label: "Al geregeld met de school" };
  else if (b3?.status === "goedgekeurd") top3 = { state: "done", code: "goedgekeurd", label: "Goedgekeurd" };
  else if (d.top3?.status === "ingediend") top3 = { state: "wait", code: b3?.status === "aanpassen" ? "opnieuw" : "ingediend", label: b3?.status === "aanpassen" ? "Opnieuw ingediend" : "Wacht op goedkeuring" };
  else if (b3?.status === "aanpassen") top3 = { state: "fix", code: "aanpassen", label: "Aanpassing gevraagd" };
  else top3 = { state: "action", code: "open", label: d.top3 ? "Concept: nog in te dienen" : "In te vullen" };

  let aanvraag: StapStatus;
  if (geregeld) aanvraag = { state: "done", code: "geregeld", label: "Al geregeld met de school" };
  else if (top3.state !== "done") aanvraag = { state: "locked", code: "slot", label: "Opent na goedkeuring top 3" };
  else if (ba?.status === "goedgekeurd") aanvraag = { state: "done", code: "goedgekeurd", label: "Goedgekeurd" };
  else if (d.aanvraag?.status === "ingediend") aanvraag = { state: "wait", code: ba?.status === "aanpassen" ? "opnieuw" : "ingediend", label: ba?.status === "aanpassen" ? "Opnieuw ingediend" : "Wordt nagekeken" };
  else if (ba?.status === "aanpassen") aanvraag = { state: "fix", code: "aanpassen", label: "Aanpassing gevraagd" };
  else aanvraag = { state: "action", code: "open", label: "Samen met de stagegever invullen" };

  const later: StapStatus = { state: "locked", code: "later", label: aanvraag.state === "done" ? "Volgt binnenkort op dit platform" : "Opent na de aanvraag" };
  return { top3, aanvraag, infomail: later, contract: later, rooster: later };
}

/** Wat moet de school doen met dit dossier? (voor tellers en "Actie nodig") */
export function schoolActie(s: Record<StapKey, StapStatus>): "top3" | "aanvraag" | null {
  if (s.top3.state === "wait") return "top3";
  if (s.aanvraag.state === "wait") return "aanvraag";
  return null;
}

/** Aanvraag vooraf invullen met de goedgekeurde keuze uit de top 3 en het profiel. */
export function aanvraagVoorinvullen(keuze: Keuze, profiel: Profiel, huidig: AanvraagGegevens = {}): AanvraagGegevens {
  return {
    ...huidig,
    stagiair: {
      ...huidig.stagiair,
      gsm: huidig.stagiair?.gsm || profiel.gsm || "",
      nood_naam: huidig.stagiair?.nood_naam || profiel.ouder_naam || "",
      nood_tel: huidig.stagiair?.nood_tel || profiel.ouder_gsm || "",
    },
    bedrijf: {
      ...huidig.bedrijf,
      naam: keuze.winkel ?? "", straat: keuze.adres ?? "", postcode: keuze.postcode ?? "", gemeente: keuze.gemeente ?? "",
      web: keuze.web ?? "", soort: keuze.type === "onthaal" ? "onthaal" : keuze.type === "sales" ? "sales" : "",
    },
    mentor: { ...huidig.mentor, naam: huidig.mentor?.naam || keuze.contact || "" },
    verantwoordelijke: huidig.verantwoordelijke ?? { zelfde: true },
  };
}
