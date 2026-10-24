import "server-only";
import type { serverClient } from "@/lib/supabase/server";
import { stand, type Afwezigheid, type Inhaal, type Stand } from "@/lib/tijdens";

/** Afwezigheden, inhaalstage en stand per dossier voor een lijst dossiers (beheer). */
export async function tijdensVoorDossiers(sb: Awaited<ReturnType<typeof serverClient>>, ids: string[], blok: { eind_datum: string }, vandaag: string) {
  const per = new Map<string, Stand>();
  if (!ids.length) return { per, afw: [] as Afwezigheid[], inhaal: [] as Inhaal[] };
  const [{ data: af }, { data: ih }] = await Promise.all([
    sb.from("afwezigheden").select("*").in("dossier_id", ids).order("datum"),
    sb.from("inhaalmomenten").select("*").in("dossier_id", ids).order("datum"),
  ]);
  const afw = (af ?? []) as Afwezigheid[];
  const inhaal = ((ih ?? []) as Inhaal[]).map((i) => ({ ...i, afw: i.afw ?? [] }));
  for (const id of new Set([...afw.map((a) => a.dossier_id), ...inhaal.map((i) => i.dossier_id)])) {
    per.set(id, stand({ afwezigheden: afw.filter((a) => a.dossier_id === id), inhaal: inhaal.filter((i) => i.dossier_id === id) }, blok, vandaag));
  }
  return { per, afw, inhaal };
}
