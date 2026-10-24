import "server-only";
import type { serverClient } from "@/lib/supabase/server";
import { nodigeRollen } from "@/lib/contract";
import { plusDagen } from "@/lib/werkrooster";
import { vandaagIso } from "@/lib/beheer";

const vandaag = () => vandaagIso();
const over14 = () => plusDagen(vandaagIso(), 14);

/**
 * Wat wacht op de school? (alle blokstages)
 * top 3 en aanvragen te beoordelen, werkroosters na te kijken, contracten die enkel nog de handtekening van de school missen,
 * afwezigheden te wettigen en inhaalstages die niet gekoppeld zijn aan een afwezigheid.
 */
export async function teBeoordelen(sb: Awaited<ReturnType<typeof serverClient>>) {
  const [t, a, o, r, c, p, af, ih, dc, rk] = await Promise.all([
    sb.from("top3").select("dossier_id").eq("status", "ingediend"),
    sb.from("aanvragen").select("dossier_id").eq("status", "ingediend"),
    sb.from("beoordelingen").select("dossier_id, stap").eq("status", "goedgekeurd"),
    sb.from("roosters").select("dossier_id").eq("status", "ingediend"),
    sb.from("contracten").select("dossier_id, meerderjarig").is("afgerond_op", null),
    sb.from("contract_partijen").select("dossier_id, rol").not("getekend_op", "is", null),
    sb.from("afwezigheden").select("id").is("gewettigd", null),
    sb.from("inhaalmomenten").select("id, afw").eq("status", "gepland"),
    sb.from("documenten").select("dossier_id, soort, nagekeken_op"),
    // blokstages die binnen 14 dagen starten of al lopen (voor de risicoanalyse)
    sb.from("blokken").select("id").gte("eind_datum", vandaag()).lte("start_datum", over14()),
  ]);
  const blokIds = ((rk.data ?? []) as { id: string }[]).map((x) => x.id);
  const { data: bijna } = blokIds.length ? await sb.from("dossiers").select("id").in("blok_id", blokIds) : { data: [] };
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
  const docs = (dc.data ?? []) as { dossier_id: string; soort: string; nagekeken_op: string | null }[];
  const documenten = docs.filter((x) => x.soort !== "ander" && !x.nagekeken_op).length;
  const metRisico = new Set(docs.filter((x) => x.soort !== "ander").map((x) => x.dossier_id));
  const bijnaStart = new Set(((bijna ?? []) as { id: string }[]).map((x) => x.id));
  const stagegeverGetekend = new Set(((p.data ?? []) as { dossier_id: string; rol: string }[]).filter((x) => x.rol === "stagegever").map((x) => x.dossier_id));
  const risicoOntbreekt = [...stagegeverGetekend].filter((id) => bijnaStart.has(id) && !metRisico.has(id)).length;
  return { top3, aanvraag, rooster, contract, afwezig, losInhaal, documenten, risicoOntbreekt, totaal: top3 + aanvraag + rooster + contract + documenten };
}
