// Gedeelde hulpjes voor de imports (klaslijst, stageplaatsen).

/** Eenvoudige CSV-lezer: herkent ; , of tab als scheidingsteken en "aanhalingstekens". */
export function leesTabel(tekst: string): string[][] {
  const regels = tekst.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n").filter((r) => r.trim() !== "");
  if (!regels.length) return [];
  const eerste = regels[0];
  const sep = ["\t", ";", ","].map((s) => [s, eerste.split(s).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  return regels.map((regel) => {
    const cellen: string[] = [];
    let cel = "";
    let tussen = false;
    for (let i = 0; i < regel.length; i++) {
      const c = regel[i];
      if (c === '"') {
        if (tussen && regel[i + 1] === '"') { cel += '"'; i++; }
        else tussen = !tussen;
      } else if (c === sep && !tussen) { cellen.push(cel.trim()); cel = ""; }
      else cel += c;
    }
    cellen.push(cel.trim());
    return cellen;
  });
}

/** Kleine letters, zonder accenten. */
export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Raadt per veld de kolom op basis van de titelrij: eerst exacte treffers, dan gedeeltelijke. -1 = niet gevonden. */
export function raadKolommen<V extends string>(kop: string[], velden: { k: V; woorden: string[] }[]): Record<V, number> {
  const res = {} as Record<V, number>;
  const bezet = new Set<number>();
  for (const exact of [true, false]) {
    for (const v of velden) {
      if (res[v.k] !== undefined) continue;
      const i = kop.findIndex((h, idx) => !bezet.has(idx) && v.woorden.some((w) => (exact ? norm(h) === w : norm(h).includes(w))));
      if (i >= 0) { res[v.k] = i; bezet.add(i); }
    }
  }
  for (const v of velden) if (res[v.k] === undefined) res[v.k] = -1;
  return res;
}
