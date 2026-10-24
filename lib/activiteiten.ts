// Activiteitenlijst bij het stagecontract: schooleigen lijst (catalogus) en de individuele lijst per stagiair.
// Verplicht onderdeel van de leerlingenstageovereenkomst (omzendbrief SO/2015/01; leidraad activiteitenlijsten KOV).

export type ActSoort = "algemeen" | "sales" | "onthaal";
export const ACT_SOORT_LABEL: Record<ActSoort, string> = { algemeen: "Voor elke stage", sales: "Sales", onthaal: "Onthaal en organisatie" };

/** Een activiteit uit de schooleigen lijst. */
export type Activiteit = {
  id: string;
  code: string | null;
  soort: ActSoort;
  groep: string;
  tekst: string;
  lpd: string | null;
  toezicht: boolean;
  standaard: boolean;
  actief: boolean;
  volgorde: number;
};

/** Een activiteit in de individuele lijst (zoals in het contract vastgelegd). */
export type ActItem = { code?: string | null; groep: string; tekst: string; lpd?: string | null; toezicht: boolean };

export const MIN_ACTIVITEITEN = 5;

/** De catalogus voor deze stage: algemeen + de soort van de stage (bij onbekende soort: alles). */
export function catalogusVoor(cat: Activiteit[], stage: string | null | undefined) {
  return cat
    .filter((a) => a.actief && (a.soort === "algemeen" || !stage || a.soort === stage))
    .sort((a, b) => a.volgorde - b.volgorde);
}

/** Startvoorstel: de standaard aangevinkte activiteiten voor deze stage. */
export function voorstel(cat: Activiteit[], stage: string | null | undefined): ActItem[] {
  return catalogusVoor(cat, stage).filter((a) => a.standaard).map(naarItem);
}

export const naarItem = (a: Activiteit): ActItem => ({ code: a.code, groep: a.groep, tekst: a.tekst, lpd: a.lpd, toezicht: a.toezicht });

/** Items gegroepeerd per groep, in volgorde van eerste voorkomen. */
export function perGroep(items: ActItem[]) {
  const m = new Map<string, ActItem[]>();
  for (const i of items) m.set(i.groep || "Andere", [...(m.get(i.groep || "Andere") ?? []), i]);
  return [...m.entries()];
}

/** Invoer opschonen (server). */
export function schoonLijst(x: unknown): ActItem[] {
  if (!Array.isArray(x)) return [];
  const t = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
  return x.slice(0, 60).map((i) => ({
    code: i?.code ? t(i.code, 20) : null,
    groep: t(i?.groep, 60) || "Andere activiteiten",
    tekst: t(i?.tekst, 300),
    lpd: i?.lpd ? t(i.lpd, 30) : null,
    toezicht: !!i?.toezicht,
  })).filter((i) => i.tekst.length >= 3);
}
