// Stagebezoeken: routes, reistijd, volgorde, wie werkt wanneer en voorstellen. Gedeeld door server en browser.
import type { Dagen, RDag } from "./werkrooster";

export type Deel = "vm" | "nm" | "dag";
export type Punt = { lat: number; lng: number };
export type Vertrek = Punt & { label: string; adres: string };
export type Instellingen = {
  blok_id: string;
  start_datum: string;
  eind_datum: string;
  vertrek: Vertrek;
  max_per_route: number;
  geblokkeerd: Record<string, string>;
};
export type Beschikbaarheid = { begeleider_id: string; slots: Record<string, ("vm" | "nm")[]>; overslaan: string[] };
export type Route = {
  id: string;
  blok_id: string;
  nr: number;
  naam: string;
  begeleider_id: string | null;
  datum: string | null;
  dagdeel: Deel;
  volgorde: string[];
  opm: string | null;
};
export type Bezoek = {
  dossier_id: string;
  bezocht_op: string | null;
  bezocht_door: string | null;
  eerste_bezoek: string | null;
  evaluatie: boolean;
  opmerking: string | null;
  te_doen: string | null;
  niet_plannen: boolean;
};
export type BLln = {
  dossier_id: string;
  leerling_id: string;
  voornaam: string;
  naam: string;
  klas: string;
  status: string;
  status_van: string | null;
  status_tot: string | null;
  email: string | null;
  gsm: string | null;
  plaats: { id: string; naam: string; straat: string | null; postcode: string | null; gemeente: string | null; telefoon: string | null; lat: number | null; lng: number | null } | null;
  mentor: { naam: string | null; tel: string | null; email: string | null };
  rooster: Dagen | null;
  roosterBron: "platform" | "mail" | null;
  afwezig: string[];
  bezoek: Bezoek | null;
};
export type Begeleider = { id: string; naam: string; kleur: string | null };
export type BezoekData = {
  blok: { id: string; naam: string; start_datum: string; eind_datum: string };
  instellingen: Instellingen;
  beschikbaarheid: Beschikbaarheid[];
  routes: Route[];
  leerlingen: BLln[];
  begeleiders: Begeleider[];
  vandaag: string;
};

export const KLEUREN = ["#2d6bd6", "#8749d3", "#cf3f35", "#d98200", "#17946a", "#c03a8a", "#0a8ea3", "#6f7d22"];
export const routeKleur = (r: Pick<Route, "nr"> | null | undefined) => (r ? KLEUREN[(r.nr - 1) % KLEUREN.length] : "#7a8580");
export const DEEL: Record<Deel, string> = { vm: "voormiddag", nm: "namiddag", dag: "hele dag" };
export const DEEL_KORT: Record<Deel, string> = { vm: "VM", nm: "NM", dag: "dag" };
export const VERTREK_STANDAARD: Vertrek = { label: "Instituut Spes Nostra", adres: "Heulsekasteelstraat 2A, 8501 Kortrijk", lat: 50.8445, lng: 3.231 };

// ---------------------------------------------------------------------------
// Datums
// ---------------------------------------------------------------------------
const dt = (s: string) => new Date(`${s.slice(0, 10)}T12:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
export const plus = (s: string, n: number) => { const d = dt(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
/** 1 = maandag … 7 = zondag */
export const wd = (s: string) => { const x = dt(s).getUTCDay(); return x === 0 ? 7 : x; };
const WD = ["", "ma", "di", "wo", "do", "vr", "za", "zo"];
const MND = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
export const datumTekst = (s: string) => { const d = dt(s); return `${WD[wd(s)]} ${d.getUTCDate()} ${MND[d.getUTCMonth()]}`; };
export const datumKort = (s: string) => { const d = dt(s); return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`; };
export const maandag = (s: string) => plus(s, 1 - wd(s));
/** Bezoekdagen: dinsdag tot vrijdag binnen de bezoekperiode. */
export function bezoekDagen(i: Pick<Instellingen, "start_datum" | "eind_datum">) {
  const uit: string[] = [];
  for (let d = i.start_datum; d <= i.eind_datum && uit.length < 200; d = plus(d, 1)) if (wd(d) >= 2 && wd(d) <= 5) uit.push(d);
  return uit;
}

// ---------------------------------------------------------------------------
// Afstand en reistijd (model uit de oude planning: omweg ×1,35; ≤ 500 m te voet; auto 25/40/65 km/u + 5 min parkeren)
// ---------------------------------------------------------------------------
export function hav(a: Punt, b: Punt) {
  const R = 6371, r = Math.PI / 180;
  const dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
export type Rit = { soort: "zelfde" | "voet" | "auto"; km: number; min: number };
export function rit(a: Punt, b: Punt): Rit {
  const h = hav(a, b);
  if (h < 0.03) return { soort: "zelfde", km: 0, min: 0 };
  const km = h * 1.35;
  if (h <= 0.5) return { soort: "voet", km, min: Math.round((km / 4.5) * 60) };
  const v = h < 4 ? 25 : h <= 15 ? 40 : 65;
  return { soort: "auto", km, min: Math.round((km / v) * 60 + 5) };
}
export const punt = (l: BLln | undefined): Punt | null =>
  l?.plaats && l.plaats.lat != null && l.plaats.lng != null ? { lat: l.plaats.lat, lng: l.plaats.lng } : null;

export function routeStats(ids: string[], lln: Map<string, BLln>, vertrek: Punt) {
  const pts = [vertrek, ...ids.map((id) => punt(lln.get(id))).filter((p): p is Punt => !!p), vertrek];
  let km = 0, min = 0;
  const ritten: Rit[] = [];
  for (let i = 1; i < pts.length; i++) {
    const r = rit(pts[i - 1], pts[i]);
    ritten.push(r);
    if (r.soort === "auto") km += r.km;
    min += r.min;
  }
  const n = ids.length;
  return { km, min, ritten, dagMin: min + n * 20, dagMax: min + n * 35, zonderLigging: ids.filter((id) => !punt(lln.get(id))).length };
}
export const minTekst = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}u${String(Math.round(m % 60)).padStart(2, "0")}`);

/** Kortste volgorde (dichtstbijzijnde eerst, daarna 2-opt), vertrek en terugkeer aan de school. */
export function optimaliseer(ids: string[], lln: Map<string, BLln>, vertrek: Punt): string[] {
  const met = ids.filter((id) => punt(lln.get(id))), zonder = ids.filter((id) => !punt(lln.get(id)));
  if (met.length < 2) return [...met, ...zonder];
  const p = (id: string) => (id === "H" ? vertrek : punt(lln.get(id))!);
  const rest = [...met], seq: string[] = [];
  let cur: Punt = vertrek;
  while (rest.length) {
    let bi = 0, bd = Infinity;
    rest.forEach((id, i) => { const d = hav(cur, p(id)); if (d < bd) { bd = d; bi = i; } });
    const id = rest.splice(bi, 1)[0];
    seq.push(id);
    cur = p(id);
  }
  const vol = ["H", ...seq, "H"];
  let beter = true, g = 0;
  while (beter && g++ < 60) {
    beter = false;
    for (let i = 1; i < vol.length - 2; i++)
      for (let k = i + 1; k < vol.length - 1; k++) {
        const d = hav(p(vol[i - 1]), p(vol[k])) + hav(p(vol[i]), p(vol[k + 1])) - hav(p(vol[i - 1]), p(vol[i])) - hav(p(vol[k]), p(vol[k + 1]));
        if (d < -1e-6) { const s = vol.slice(i, k + 1).reverse(); vol.splice(i, s.length, ...s); beter = true; }
      }
  }
  return [...vol.slice(1, -1), ...zonder];
}

/** Een leerling op de goedkoopste plek in een route zetten; de rest van de volgorde blijft. */
export function invoegen(ids: string[], id: string, lln: Map<string, BLln>, vertrek: Punt): string[] {
  const p = punt(lln.get(id));
  if (!p) return [...ids, id];
  const seq = [vertrek, ...ids.map((x) => punt(lln.get(x)) ?? vertrek), vertrek];
  let bi = 0, bm = Infinity;
  for (let i = 1; i < seq.length; i++) {
    const m = hav(seq[i - 1], p) + hav(p, seq[i]) - hav(seq[i - 1], seq[i]);
    if (m < bm) { bm = m; bi = i - 1; }
  }
  const uit = [...ids];
  uit.splice(bi, 0, id);
  return uit;
}

// ---------------------------------------------------------------------------
// Wie werkt wanneer?
// ---------------------------------------------------------------------------
/** Dagdelen van een roosterdag: voormiddag als hij vóór 12u30 begint, namiddag als hij na 13u eindigt. */
export function dagdelen(d?: RDag | null): ("vm" | "nm")[] {
  if (!d) return [];
  const o: ("vm" | "nm")[] = [];
  if ((d.aan || "08:00") < "12:30") o.push("vm");
  if ((d.ver || "17:00") > "13:00") o.push("nm");
  return o;
}
export const isZiek = (l: BLln, datum: string) =>
  l.afwezig.includes(datum) || (l.status === "ziek" && (!l.status_van || l.status_van <= datum) && (!l.status_tot || datum <= l.status_tot));

/** true = werkt, false = werkt niet (of afwezig), null = rooster onbekend */
export function werkt(l: BLln, datum: string, deel: Deel): boolean | null {
  if (isZiek(l, datum)) return false;
  if (!l.rooster) return null;
  const dd = dagdelen(l.rooster[datum]);
  return deel === "dag" ? dd.length > 0 : dd.includes(deel);
}
export function aanwezigheid(ids: string[], lln: Map<string, BLln>, datum: string, deel: Deel) {
  let ja = 0, nee = 0, onbekend = 0;
  ids.forEach((id) => { const l = lln.get(id); const v = l ? werkt(l, datum, deel) : null; if (v === true) ja++; else if (v === false) nee++; else onbekend++; });
  return { ja, nee, onbekend, n: ids.length };
}
export const urenOpDag = (l: BLln, datum: string) => {
  const d = l.rooster?.[datum];
  const t = (x: string) => x.replace(/^0/, "").replace(":", "u").replace(/u00$/, "u");
  return d ? `${t(d.aan)}–${t(d.ver)}` : "";
};

export function isVrij(b: Beschikbaarheid | undefined, ins: Pick<Instellingen, "geblokkeerd">, datum: string, deel: Deel) {
  if (ins.geblokkeerd?.[datum]) return false;
  if (!b) return true;
  if (b.overslaan.includes(datum)) return false;
  const sl = b.slots[String(wd(datum))] ?? [];
  const nodig: ("vm" | "nm")[] = deel === "dag" ? ["vm", "nm"] : [deel];
  return nodig.every((p) => sl.includes(p) && !b.overslaan.includes(`${datum}:${p}`));
}
export const overlapt = (a: Deel, b: Deel) => a === "dag" || b === "dag" || a === b;

/** Beste momenten voor een route: zoveel mogelijk leerlingen aan het werk, begeleider vrij, geen andere route op dat dagdeel. */
export function besteMomenten(r: Route, d: BezoekData, lln: Map<string, BLln>, max = 8) {
  const b = d.beschikbaarheid.find((x) => x.begeleider_id === r.begeleider_id);
  const vanaf = d.instellingen.start_datum > d.vandaag ? d.instellingen.start_datum : d.vandaag;
  const uit: { datum: string; deel: Deel; a: ReturnType<typeof aanwezigheid>; score: number }[] = [];
  for (const datum of bezoekDagen(d.instellingen).filter((x) => x >= vanaf)) {
    for (const deel of ["vm", "nm", "dag"] as Deel[]) {
      if (!isVrij(b, d.instellingen, datum, deel)) continue;
      if (d.routes.some((x) => x.id !== r.id && x.begeleider_id === r.begeleider_id && x.datum === datum && overlapt(x.dagdeel, deel))) continue;
      const a = aanwezigheid(r.volgorde, lln, datum, deel);
      uit.push({ datum, deel, a, score: a.ja * 10 - a.nee * 12 + (deel === "dag" ? -1 : 0) });
    }
  }
  return uit.sort((x, y) => y.score - x.score || x.datum.localeCompare(y.datum)).slice(0, max);
}

// ---------------------------------------------------------------------------
// Voorstel van routes en namen
// ---------------------------------------------------------------------------
export function routeNaam(ids: string[], lln: Map<string, BLln>) {
  const tel = new Map<string, number>();
  ids.forEach((id) => { const g = lln.get(id)?.plaats?.gemeente; if (g) tel.set(g, (tel.get(g) ?? 0) + 1); });
  return [...tel.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g).join(" · ") || "Nieuwe route";
}

/**
 * Leerlingen zonder route in nieuwe routes verdelen: rond de school gesorteerd op richting, in stukjes van maximaal
 * `max` leerlingen, en de routes om beurt toegewezen aan de begeleider met de minste leerlingen.
 */
export function stelRoutesVoor(d: BezoekData, lln: Map<string, BLln>) {
  const inRoute = new Set(d.routes.flatMap((r) => r.volgorde));
  const vrij = d.leerlingen.filter((l) => !inRoute.has(l.dossier_id) && !l.bezoek?.niet_plannen && punt(l));
  const v = d.instellingen.vertrek;
  const hoek = (l: BLln) => { const p = punt(l)!; return Math.atan2(p.lat - v.lat, (p.lng - v.lng) * Math.cos((v.lat * Math.PI) / 180)); };
  const gesorteerd = [...vrij].sort((a, b) => hoek(a) - hoek(b));
  const max = Math.max(1, d.instellingen.max_per_route);
  const aantal = Math.ceil(gesorteerd.length / max);
  const groepen: BLln[][] = [];
  for (let i = 0; i < aantal; i++) groepen.push(gesorteerd.slice(Math.round((i * gesorteerd.length) / aantal), Math.round(((i + 1) * gesorteerd.length) / aantal)));
  const last = new Map(d.begeleiders.map((g) => [g.id, d.routes.filter((r) => r.begeleider_id === g.id).reduce((s, r) => s + r.volgorde.length, 0)]));
  let nr = Math.max(0, ...d.routes.map((r) => r.nr));
  return groepen.filter((g) => g.length).map((g) => {
    const beg = [...last.entries()].sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
    if (beg) last.set(beg, (last.get(beg) ?? 0) + g.length);
    const ids = optimaliseer(g.map((l) => l.dossier_id), lln, v);
    return { nr: ++nr, naam: routeNaam(ids, lln), begeleider_id: beg, volgorde: ids };
  });
}

/** Route openen in Google Maps (vertrek en terugkeer aan de school). */
export function mapsUrl(ids: string[], lln: Map<string, BLln>, vertrek: Vertrek) {
  const adres = (l: BLln) => {
    const p = punt(l);
    return p ? `${p.lat},${p.lng}` : [l.plaats?.naam, l.plaats?.straat, l.plaats?.postcode, l.plaats?.gemeente].filter(Boolean).join(" ");
  };
  const tussen = ids.map((id) => lln.get(id)).filter((l): l is BLln => !!l).map(adres).slice(0, 9);
  const q = new URLSearchParams({ api: "1", origin: vertrek.adres, destination: vertrek.adres, travelmode: "driving" });
  if (tussen.length) q.set("waypoints", tussen.join("|"));
  return `https://www.google.com/maps/dir/?${q}`;
}
export const plaatsAdres = (l: BLln) => [l.plaats?.straat, [l.plaats?.postcode, l.plaats?.gemeente].filter(Boolean).join(" ")].filter(Boolean).join(", ");
export const naamVan = (l: BLln) => `${l.voornaam} ${l.naam}`;
