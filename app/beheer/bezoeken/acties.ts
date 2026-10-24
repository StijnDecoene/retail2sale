"use server";

import { revalidatePath } from "next/cache";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import type { Deel, Vertrek } from "@/lib/bezoeken";

export type BResultaat = { ok?: string; fout?: string; id?: string } | null;

async function ik() {
  const { begeleider } = await huidigeGebruiker();
  return begeleider;
}
const herlaad = () => revalidatePath("/beheer/bezoeken", "layout");
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const DELEN: Deel[] = ["vm", "nm", "dag"];

/** Routes aanmaken of wijzigen (meerdere tegelijk, bv. bij het verplaatsen van een leerling). */
export async function routesBewaren(
  blokId: string,
  routes: { id?: string; nr?: number; naam?: string; begeleider_id?: string | null; datum?: string | null; dagdeel?: Deel; volgorde?: string[]; opm?: string | null }[],
): Promise<BResultaat> {
  if (!(await ik())) return { fout: "Je hebt hiervoor geen rechten." };
  const sb = await serverClient();
  let nieuwId: string | undefined;
  for (const r of routes.slice(0, 40)) {
    const rij: Record<string, unknown> = {};
    if (r.naam !== undefined) rij.naam = String(r.naam).trim().slice(0, 120);
    if (r.begeleider_id !== undefined) rij.begeleider_id = r.begeleider_id || null;
    if (r.datum !== undefined) rij.datum = r.datum && ISO.test(r.datum) ? r.datum : null;
    if (r.dagdeel !== undefined) rij.dagdeel = DELEN.includes(r.dagdeel) ? r.dagdeel : "dag";
    if (r.volgorde !== undefined) rij.volgorde = [...new Set(r.volgorde)].slice(0, 30);
    if (r.opm !== undefined) rij.opm = r.opm ? String(r.opm).slice(0, 2000) : null;
    if (r.id) {
      const { error } = await sb.from("bezoek_routes").update(rij).eq("id", r.id);
      if (error) return { fout: "Bewaren lukte niet." };
    } else {
      const { data: nr } = await sb.from("bezoek_routes").select("nr").eq("blok_id", blokId).order("nr", { ascending: false }).limit(1);
      const { data, error } = await sb.from("bezoek_routes").insert({ blok_id: blokId, nr: r.nr ?? ((nr?.[0]?.nr as number | undefined) ?? 0) + 1, ...rij }).select("id").single();
      if (error) return { fout: "Aanmaken lukte niet." };
      nieuwId = data.id as string;
    }
  }
  herlaad();
  return { ok: "Bewaard.", id: nieuwId };
}

export async function routeVerwijderen(id: string): Promise<BResultaat> {
  if (!(await ik())) return { fout: "Je hebt hiervoor geen rechten." };
  const sb = await serverClient();
  const { error } = await sb.from("bezoek_routes").delete().eq("id", id);
  if (error) return { fout: "Verwijderen lukte niet." };
  herlaad();
  return { ok: "Route verwijderd. De leerlingen staan weer bij 'Nog niet in een route'." };
}

/** Bezoek van een leerling bijwerken (bezocht, eerste bezoek, evaluatie, opmerking …). */
export async function bezoekBewaren(
  dossierId: string,
  p: { bezocht_op?: string | null; eerste_bezoek?: string | null; evaluatie?: boolean; opmerking?: string | null; te_doen?: string | null; niet_plannen?: boolean },
): Promise<BResultaat> {
  const g = await ik();
  if (!g) return { fout: "Je hebt hiervoor geen rechten." };
  const rij: Record<string, unknown> = { dossier_id: dossierId };
  if (p.bezocht_op !== undefined) { rij.bezocht_op = p.bezocht_op && ISO.test(p.bezocht_op) ? p.bezocht_op : null; rij.bezocht_door = rij.bezocht_op ? g.id : null; }
  if (p.eerste_bezoek !== undefined) rij.eerste_bezoek = p.eerste_bezoek && ISO.test(p.eerste_bezoek) ? p.eerste_bezoek : null;
  if (p.evaluatie !== undefined) rij.evaluatie = !!p.evaluatie;
  if (p.opmerking !== undefined) rij.opmerking = p.opmerking ? String(p.opmerking).slice(0, 2000) : null;
  if (p.te_doen !== undefined) rij.te_doen = p.te_doen ? String(p.te_doen).slice(0, 500) : null;
  if (p.niet_plannen !== undefined) rij.niet_plannen = !!p.niet_plannen;
  const sb = await serverClient();
  const { error } = await sb.from("bezoeken").upsert(rij, { onConflict: "dossier_id" });
  if (error) return { fout: "Bewaren lukte niet." };
  herlaad();
  return { ok: "Bewaard." };
}

/** Ligging van een stageplaats manueel (klik op de kaart). */
export async function liggingBewaren(plaatsId: string, lat: number, lng: number): Promise<BResultaat> {
  if (!(await ik())) return { fout: "Je hebt hiervoor geen rechten." };
  if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return { fout: "Ongeldige ligging." };
  const sb = await serverClient();
  const { error } = await sb.from("stageplaatsen").update({ lat, lng, ligging_bron: "kaart" }).eq("id", plaatsId);
  if (error) return { fout: "Bewaren lukte niet." };
  herlaad();
  return { ok: "Ligging bewaard." };
}

/** Ligging zoeken op het adres (OpenStreetMap). */
export async function liggingZoeken(plaatsIds: string[]): Promise<BResultaat> {
  if (!(await ik())) return { fout: "Je hebt hiervoor geen rechten." };
  const sb = await serverClient();
  const { data } = await sb.from("stageplaatsen").select("id, naam, straat, postcode, gemeente").in("id", plaatsIds.slice(0, 25));
  let gevonden = 0, niet = 0;
  for (const p of (data ?? []) as { id: string; naam: string; straat: string | null; postcode: string | null; gemeente: string | null }[]) {
    if (!p.gemeente && !p.postcode) { niet++; continue; }
    const q = new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "be", q: [p.straat, [p.postcode, p.gemeente].filter(Boolean).join(" ")].filter(Boolean).join(", ") });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${q}`, { headers: { "User-Agent": "Retail2Sale stageplatform (retail2sale@snh.be)", "Accept-Language": "nl" }, cache: "no-store" });
      const j = (await res.json()) as { lat: string; lon: string }[];
      if (j[0]) {
        await sb.from("stageplaatsen").update({ lat: Number(j[0].lat), lng: Number(j[0].lon), ligging_bron: "adres" }).eq("id", p.id);
        gevonden++;
      } else niet++;
    } catch {
      niet++;
    }
    await new Promise((r) => setTimeout(r, 1100)); // gebruiksregels OpenStreetMap: hoogstens 1 vraag per seconde
  }
  herlaad();
  return niet ? { ok: `${gevonden} gevonden. ${niet} niet gevonden: zet die zelf op de kaart.` } : { ok: `${gevonden} gevonden.` };
}

export async function instellingenBewaren(
  blokId: string,
  x: { start_datum: string; eind_datum: string; max_per_route: number; vertrek: Vertrek; geblokkeerd: Record<string, string> },
): Promise<BResultaat> {
  if (!(await ik())) return { fout: "Je hebt hiervoor geen rechten." };
  if (!ISO.test(x.start_datum) || !ISO.test(x.eind_datum) || x.eind_datum < x.start_datum) return { fout: "Kies een geldige bezoekperiode." };
  const geblokkeerd = Object.fromEntries(Object.entries(x.geblokkeerd ?? {}).filter(([k]) => ISO.test(k)).map(([k, v]) => [k, String(v).slice(0, 80)]));
  const sb = await serverClient();
  const { error } = await sb.from("bezoek_instellingen").upsert({
    blok_id: blokId, start_datum: x.start_datum, eind_datum: x.eind_datum, max_per_route: Math.max(1, Math.min(20, Math.round(x.max_per_route) || 8)),
    vertrek: { label: String(x.vertrek.label).slice(0, 120), adres: String(x.vertrek.adres).slice(0, 200), lat: Number(x.vertrek.lat), lng: Number(x.vertrek.lng) },
    geblokkeerd,
  }, { onConflict: "blok_id" });
  if (error) return { fout: "Bewaren lukte niet." };
  herlaad();
  return { ok: "Instellingen bewaard." };
}

export async function beschikbaarheidBewaren(blokId: string, begeleiderId: string, slots: Record<string, ("vm" | "nm")[]>, overslaan: string[]): Promise<BResultaat> {
  if (!(await ik())) return { fout: "Je hebt hiervoor geen rechten." };
  const schoon = Object.fromEntries(["2", "3", "4", "5"].map((w) => [w, (slots[w] ?? []).filter((p) => p === "vm" || p === "nm")]));
  const sb = await serverClient();
  const { error } = await sb.from("bezoek_beschikbaarheid").upsert(
    { begeleider_id: begeleiderId, blok_id: blokId, slots: schoon, overslaan: overslaan.filter((x) => /^\d{4}-\d{2}-\d{2}(:(vm|nm))?$/.test(x)).slice(0, 100) },
    { onConflict: "begeleider_id,blok_id" },
  );
  if (error) return { fout: "Bewaren lukte niet." };
  herlaad();
  return { ok: "Beschikbaarheid bewaard." };
}
