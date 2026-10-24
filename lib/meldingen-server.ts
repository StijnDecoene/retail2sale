import "server-only";
import type { serverClient } from "@/lib/supabase/server";
import type { Melding } from "@/lib/meldingen";

type Sb = Awaited<ReturnType<typeof serverClient>>;

/** Sinds wanneer heeft deze begeleider alles gezien? Eerste keer: nu (oude meldingen tellen dan niet als nieuw). */
export async function gezienTot(sb: Sb, begeleiderId: string): Promise<string | null> {
  const { data, error } = await sb.from("meldingen_gezien").select("gezien_tot").eq("begeleider_id", begeleiderId).maybeSingle();
  if (error) return null; // tabel bestaat nog niet
  if (data) return data.gezien_tot as string;
  const nu = new Date(Date.now() - 7 * 864e5).toISOString(); // eerste keer: de meldingen van de voorbije week tonen
  await sb.from("meldingen_gezien").insert({ begeleider_id: begeleiderId, gezien_tot: nu });
  return nu;
}

/** Nieuwe meldingen voor de banner: aantal per soort. */
export async function nieuweMeldingen(sb: Sb, begeleiderId: string) {
  const tot = await gezienTot(sb, begeleiderId);
  if (!tot) return { totaal: 0, perSoort: {} as Record<string, number>, tot: null };
  const { data } = await sb.from("meldingen").select("soort").gt("op", tot).limit(500);
  const perSoort: Record<string, number> = {};
  for (const m of (data ?? []) as Pick<Melding, "soort">[]) perSoort[m.soort] = (perSoort[m.soort] ?? 0) + 1;
  return { totaal: (data ?? []).length, perSoort, tot };
}
