import "server-only";
import type { serverClient } from "@/lib/supabase/server";
import type { Sleutel } from "@/lib/werkrooster-server";
import type { TijdensData } from "@/lib/tijdens";

type Sb = Awaited<ReturnType<typeof serverClient>>;

export async function laadTijdens(sb: Sb, k: Sleutel): Promise<TijdensData | null> {
  const { data, error } = await sb.rpc("tijdens_laden", { p_token: k.token ?? null, p_dossier: k.token ? null : (k.dossier ?? null) });
  if (error || !data) return null;
  const t = data as TijdensData;
  t.afwezigheden ??= [];
  t.inhaal = (t.inhaal ?? []).map((i) => ({ ...i, afw: i.afw ?? [] }));
  return t;
}
