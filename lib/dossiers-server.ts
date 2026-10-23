import "server-only";
import type { serverClient } from "@/lib/supabase/server";

/** Hoeveel top 3's en aanvragen wachten op een beoordeling door de school? (alle blokstages) */
export async function teBeoordelen(sb: Awaited<ReturnType<typeof serverClient>>) {
  const [t, a, o] = await Promise.all([
    sb.from("top3").select("dossier_id").eq("status", "ingediend"),
    sb.from("aanvragen").select("dossier_id").eq("status", "ingediend"),
    sb.from("beoordelingen").select("dossier_id, stap").eq("status", "goedgekeurd"),
  ]);
  const ok = new Set((o.data ?? []).map((b) => `${b.stap}:${b.dossier_id}`));
  const top3 = (t.data ?? []).filter((r) => !ok.has(`top3:${r.dossier_id}`)).length;
  const aanvraag = (a.data ?? []).filter((r) => !ok.has(`aanvraag:${r.dossier_id}`)).length;
  return { top3, aanvraag, totaal: top3 + aanvraag };
}
