"use server";

import { revalidatePath } from "next/cache";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import { DOC_FOUT } from "@/lib/documenten";

/** Document verwijderen: stagegever via zijn link (zolang niet nagekeken) of de school. */
export async function documentVerwijderen(k: { token?: string; dossier?: string }, id: string): Promise<{ ok?: string; fout?: string }> {
  if (!k.token) {
    const { begeleider } = await huidigeGebruiker();
    if (!begeleider) return { fout: "Je hebt hiervoor geen rechten." };
  }
  const sb = await serverClient();
  const { data, error } = await sb.rpc("document_verwijderen", { p_token: k.token ?? null, p_dossier: k.token ? null : (k.dossier ?? null), p_id: id });
  if (error) return { fout: "Verwijderen lukte niet." };
  if (data !== "ok") return { fout: DOC_FOUT[String(data)] ?? "Verwijderen lukte niet." };
  if (k.token) revalidatePath(`/contract/${k.token}`);
  if (k.dossier) revalidatePath(`/beheer/dossiers/${k.dossier}`);
  revalidatePath("/beheer", "layout");
  return { ok: "Verwijderd." };
}

/** School: document als nagekeken (in orde) aanduiden, of terug openzetten. */
export async function documentNagekeken(dossierId: string, id: string, nagekeken: boolean): Promise<{ ok?: string; fout?: string }> {
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return { fout: "Je hebt hiervoor geen rechten." };
  const sb = await serverClient();
  const { error } = await sb.from("documenten").update(nagekeken ? { nagekeken_op: new Date().toISOString(), nagekeken_door: begeleider.naam } : { nagekeken_op: null, nagekeken_door: null }).eq("id", id).eq("dossier_id", dossierId);
  if (error) return { fout: "Dat lukte niet." };
  revalidatePath(`/beheer/dossiers/${dossierId}`);
  revalidatePath("/beheer", "layout");
  return { ok: nagekeken ? "Nagekeken." : "Terug open gezet." };
}
