import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, supabaseIngesteld } from "./env";

/** Client zonder login en zonder cookies, voor publieke gegevens op statische pagina's. */
export function publiekeClient() {
  if (!supabaseIngesteld()) return null;
  return createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: "stage" }, auth: { persistSession: false } });
}

export type Partner = { id: string; naam: string; gemeente: string | null; website: string | null; logo: boolean; versie: number | null };

/** Partners voor de homepagina (leeg bij een fout, zodat de pagina altijd werkt). */
export async function laadPartners(): Promise<Partner[]> {
  try {
    const sb = publiekeClient();
    if (!sb) return [];
    const { data, error } = await sb.rpc("publieke_partners");
    return error ? [] : ((data ?? []) as Partner[]);
  } catch {
    return [];
  }
}
