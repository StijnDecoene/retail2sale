"use server";

import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase/server";
import type { Sleutel } from "@/lib/werkrooster-server";
import { laadEvaluatie } from "@/lib/evaluaties-server";
import { formulier, ontbreekt, schoon, type Antwoorden, type Soort } from "@/lib/evaluaties";

export type EvResultaat = { ok?: string; fout?: string } | null;

const FOUT: Record<string, string> = {
  onbekend: "Dit kan je niet (meer) openen. Vraag een nieuwe link aan de stagebegeleiding.",
  geen_rechten: "Je kan deze evaluatie niet invullen.",
  vergrendeld: "Deze evaluatie is al ingediend.",
};

/** Mentor (link) of stagiair (portaal): bewaren als concept of indienen. */
export async function evaluatieBewaren(k: Sleutel, soort: Soort, antwoorden: Antwoorden, indienen: boolean, naam: string): Promise<EvResultaat> {
  const sb = await serverClient();
  const ctx = await laadEvaluatie(sb, k);
  if (!ctx) return { fout: FOUT.onbekend };
  const f = formulier(soort, ctx.stage);
  const a = schoon(f, antwoorden);
  if (indienen) {
    const mis = ontbreekt(f, a);
    if (mis.length) return { fout: `Nog niet ingevuld: ${mis.slice(0, 3).join(" · ")}${mis.length > 3 ? ` en nog ${mis.length - 3}` : ""}.` };
    if (soort === "mentor" && !naam.trim()) return { fout: "Vul uw naam in." };
  }
  const { data, error } = await sb.rpc("evaluatie_bewaren", {
    p_token: k.token ?? null, p_dossier: k.token ? null : (k.dossier ?? null), p_soort: soort, p_antwoorden: a, p_indienen: indienen, p_naam: naam.trim().slice(0, 200) || null,
  });
  if (error) return { fout: "Bewaren lukte niet. Probeer opnieuw." };
  if (data !== "ok") return { fout: FOUT[String(data)] ?? "Dat lukte niet." };
  revalidatePath("/portaal");
  if (k.token) revalidatePath(`/rooster/${k.token}`);
  return { ok: indienen ? "Ingediend. Bedankt!" : "Bewaard. Je kan later verder invullen." };
}
