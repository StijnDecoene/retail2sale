import "server-only";
import type { serverClient } from "@/lib/supabase/server";
import type { Overzicht } from "@/lib/stagegever";

type Sb = Awaited<ReturnType<typeof serverClient>>;

/** Alle stagiairs van deze stagegever (via een overzichtslink of de persoonlijke link van één stagiair). */
export async function laadOverzicht(sb: Sb, token: string): Promise<Overzicht | null> {
  const { data, error } = await sb.rpc("stagegever_overzicht", { p_token: token });
  if (error || !data) return null;
  const o = data as Overzicht;
  o.stagiairs ??= [];
  return o;
}
