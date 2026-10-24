"use server";

import { revalidatePath } from "next/cache";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import type { ActSoort, Activiteit } from "@/lib/activiteiten";

export type ActResultaat = { ok?: string; fout?: string } | null;

/** Schooleigen activiteitenlijst bewaren (alle rijen in één keer). Nieuwe rijen hebben id "nieuw-…". */
export async function activiteitenBewaren(rijen: Activiteit[], weg: string[]): Promise<ActResultaat> {
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return { fout: "Je hebt hiervoor geen rechten." };
  const sb = await serverClient();
  const t = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
  const SOORTEN: ActSoort[] = ["algemeen", "sales", "onthaal"];
  const schoon = rijen
    .filter((r) => t(r.tekst, 300).length >= 3 && SOORTEN.includes(r.soort))
    .map((r, i) => ({
      ...(r.id.startsWith("nieuw-") ? {} : { id: r.id }),
      soort: r.soort, groep: t(r.groep, 60) || "Andere", tekst: t(r.tekst, 300), lpd: t(r.lpd, 30) || null,
      toezicht: !!r.toezicht, standaard: !!r.standaard, actief: r.actief !== false, volgorde: (i + 1) * 10,
    }));
  const bestaand = schoon.filter((r) => "id" in r);
  const nieuw = schoon.filter((r) => !("id" in r));
  if (bestaand.length) {
    const { error } = await sb.from("activiteiten").upsert(bestaand, { onConflict: "id" });
    if (error) return { fout: "Bewaren lukte niet." };
  }
  if (nieuw.length) {
    const { error } = await sb.from("activiteiten").insert(nieuw);
    if (error) return { fout: "Bewaren lukte niet." };
  }
  const echtWeg = weg.filter((id) => !id.startsWith("nieuw-"));
  if (echtWeg.length) await sb.from("activiteiten").delete().in("id", echtWeg);
  revalidatePath("/beheer/instellingen/activiteiten");
  return { ok: "Activiteitenlijst bewaard. Nieuwe contracten krijgen dit voorstel; bestaande lijsten blijven ongewijzigd." };
}
