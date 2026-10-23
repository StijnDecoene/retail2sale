import "server-only";
import type { serverClient } from "@/lib/supabase/server";
import { plaatsSleutel, zoekPlaats } from "@/lib/beheer";
import type { AanvraagGegevens, Keuze } from "@/lib/portaal";

type Sb = Awaited<ReturnType<typeof serverClient>>;
type Plaats = { id: string; naam: string; gemeente: string | null; kbo: string | null; max_stagiairs: number };

/**
 * Welke andere leerlingen in dezelfde blokstage hebben dezelfde winkel al?
 * Geeft per winkel (naam + gemeente) een lijst met waarschuwingen terug.
 */
export async function bezettingsChecker(sb: Sb, blokId: string, eigenDossier: string) {
  const [{ data: ds }, { data: ps }] = await Promise.all([
    sb.from("dossiers").select("id, leerling_id, stageplaats_id").eq("blok_id", blokId).neq("id", eigenDossier),
    sb.from("stageplaatsen").select("id, naam, gemeente, kbo, max_stagiairs"),
  ]);
  const dossiers = (ds ?? []) as { id: string; leerling_id: string; stageplaats_id: string | null }[];
  const plaatsen = (ps ?? []) as Plaats[];
  const ids = dossiers.map((d) => d.id);
  const [{ data: ls }, { data: as }, { data: ts }, { data: bs }] = ids.length
    ? await Promise.all([
        sb.from("leerlingen").select("id, voornaam, naam, klas").in("id", dossiers.map((d) => d.leerling_id)),
        sb.from("aanvragen").select("dossier_id, status, gegevens").in("dossier_id", ids),
        sb.from("top3").select("dossier_id, keuzes").in("dossier_id", ids),
        sb.from("beoordelingen").select("dossier_id, stap, status, keuzes").in("dossier_id", ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const naam = new Map(((ls ?? []) as { id: string; voornaam: string; naam: string; klas: string }[]).map((l) => [l.id, `${l.voornaam} ${l.naam} (${l.klas})`]));
  const lln = new Map(dossiers.map((d) => [d.id, naam.get(d.leerling_id) ?? "een andere leerling"]));
  const beo = (bs ?? []) as { dossier_id: string; stap: string; status: string; keuzes: number[] }[];
  const goedgekeurd = (dossier: string, stap: string) => beo.find((b) => b.dossier_id === dossier && b.stap === stap && b.status === "goedgekeurd");

  /** Waarschuwingen voor een winkel (op naam + gemeente, of via de gekende stageplaats). */
  return function check(winkel: string | undefined, gemeente: string | undefined, kbo?: string): string[] {
    if (!winkel?.trim()) return [];
    const sleutel = plaatsSleutel(winkel, gemeente ?? null);
    const plaats = zoekPlaats(plaatsen, winkel, gemeente ?? null, kbo ?? null);
    const uit: string[] = [];
    const genoemd = new Set<string>(); // elke andere leerling maar één keer, met de sterkste reden

    // 1. Al geplaatst (aanvraag goedgekeurd of gekoppeld) in deze blokstage.
    if (plaats) {
      const daar = dossiers.filter((d) => d.stageplaats_id === plaats.id);
      daar.forEach((d) => genoemd.add(d.id));
      if (daar.length) {
        const max = Math.max(plaats.max_stagiairs ?? 1, 1);
        uit.push(`${daar.length >= max ? "Bezet" : "Al ingenomen"} in deze blokstage (${daar.length} van ${max}): ${daar.map((d) => lln.get(d.id)).join(", ")}.`);
      }
    }
    // 2. Aanvraag (ingediend of concept) van een andere leerling, nog niet goedgekeurd.
    for (const a of (as ?? []) as { dossier_id: string; status: string; gegevens: AanvraagGegevens }[]) {
      if (goedgekeurd(a.dossier_id, "aanvraag") || genoemd.has(a.dossier_id)) continue;
      const b = a.gegevens?.bedrijf;
      if (!b?.naam) continue;
      const zelfde = plaatsSleutel(b.naam, b.gemeente ?? null) === sleutel || (plaats && zoekPlaats([plaats], b.naam, b.gemeente ?? null, b.kbo ?? null));
      if (zelfde) {
        genoemd.add(a.dossier_id);
        uit.push(`${lln.get(a.dossier_id)} heeft voor deze winkel een aanvraag ${a.status === "ingediend" ? "ingediend" : "in concept"}.`);
      }
    }
    // 3. Goedgekeurd in de top 3 van een andere leerling (nog zonder aanvraag voor deze winkel).
    for (const t of (ts ?? []) as { dossier_id: string; keuzes: Keuze[] }[]) {
      const b3 = goedgekeurd(t.dossier_id, "top3");
      if (!b3 || goedgekeurd(t.dossier_id, "aanvraag") || genoemd.has(t.dossier_id)) continue;
      const hit = b3.keuzes.some((nr) => {
        const k = t.keuzes?.[nr - 1];
        return k?.winkel && plaatsSleutel(k.winkel, k.gemeente ?? null) === sleutel;
      });
      if (hit) { genoemd.add(t.dossier_id); uit.push(`Ook goedgekeurd in de top 3 van ${lln.get(t.dossier_id)}.`); }
    }
    return uit;
  };
}
