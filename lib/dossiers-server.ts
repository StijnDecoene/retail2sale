import "server-only";
import type { serverClient } from "@/lib/supabase/server";
import { nodigeRollen } from "@/lib/contract";

/**
 * Wat wacht op de school? (alle blokstages)
 * top 3 en aanvragen te beoordelen, werkroosters na te kijken, contracten die enkel nog de handtekening van de school missen,
 * afwezigheden te wettigen en inhaalstages die niet gekoppeld zijn aan een afwezigheid.
 */
export async function teBeoordelen(sb: Awaited<ReturnType<typeof serverClient>>) {
  const [t, a, o, r, c, p, af, ih] = await Promise.all([
    sb.from("top3").select("dossier_id").eq("status", "ingediend"),
    sb.from("aanvragen").select("dossier_id").eq("status", "ingediend"),
    sb.from("beoordelingen").select("dossier_id, stap").eq("status", "goedgekeurd"),
    sb.from("roosters").select("dossier_id").eq("status", "ingediend"),
    sb.from("contracten").select("dossier_id, meerderjarig").is("afgerond_op", null),
    sb.from("contract_partijen").select("dossier_id, rol").not("getekend_op", "is", null),
    sb.from("afwezigheden").select("id").is("gewettigd", null),
    sb.from("inhaalmomenten").select("id, afw").eq("status", "gepland"),
  ]);
  const ok = new Set((o.data ?? []).map((b) => `${b.stap}:${b.dossier_id}`));
  const top3 = (t.data ?? []).filter((x) => !ok.has(`top3:${x.dossier_id}`)).length;
  const aanvraag = (a.data ?? []).filter((x) => !ok.has(`aanvraag:${x.dossier_id}`)).length;
  const rooster = (r.data ?? []).length;
  const getekend = new Set((p.data ?? []).map((x) => `${x.dossier_id}:${x.rol}`));
  const contract = ((c.data ?? []) as { dossier_id: string; meerderjarig: boolean }[]).filter((x) => {
    const rollen = nodigeRollen(x.meerderjarig);
    return !getekend.has(`${x.dossier_id}:directie`) && rollen.filter((rl) => rl !== "directie").every((rl) => getekend.has(`${x.dossier_id}:${rl}`));
  }).length;
  const afwezig = (af.data ?? []).length;
  const losInhaal = ((ih.data ?? []) as { afw: string[] | null }[]).filter((x) => !x.afw?.length).length;
  return { top3, aanvraag, rooster, contract, afwezig, losInhaal, totaal: top3 + aanvraag + rooster + contract };
}
