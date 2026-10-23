import "server-only";
import type { serverClient } from "@/lib/supabase/server";
import type { RoosterContext } from "@/lib/werkrooster";

type Sb = Awaited<ReturnType<typeof serverClient>>;
/** Sleutel tot een rooster: de persoonlijke link van de stagegever, of een dossier (stagiair of begeleider, ingelogd). */
export type Sleutel = { token?: string | null; dossier?: string | null };

export async function laadRooster(sb: Sb, k: Sleutel): Promise<RoosterContext | null> {
  const { data, error } = await sb.rpc("rooster_laden", { p_token: k.token ?? null, p_dossier: k.token ? null : (k.dossier ?? null) });
  if (error || !data) return null;
  const c = data as RoosterContext;
  if (c.rooster) {
    c.rooster.dagen ??= {};
    c.rooster.historiek ??= [];
  }
  return c;
}
