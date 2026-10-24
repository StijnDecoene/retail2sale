"use server";

import { revalidatePath } from "next/cache";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";

/** Stageplaats wel of niet als partner op de homepagina tonen. */
export async function partnerZetten(id: string, partner: boolean): Promise<{ ok?: string; fout?: string }> {
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return { fout: "Je hebt hiervoor geen rechten." };
  const sb = await serverClient();
  const { error } = await sb.from("stageplaatsen").update({ partner }).eq("id", id);
  if (error) return { fout: "Bewaren lukte niet." };
  revalidatePath(`/beheer/stageplaatsen/${id}`);
  revalidatePath("/");
  return { ok: partner ? "Staat op de homepagina." : "Niet meer op de homepagina." };
}

export async function logoVerwijderen(id: string): Promise<{ ok?: string; fout?: string }> {
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return { fout: "Je hebt hiervoor geen rechten." };
  const sb = await serverClient();
  const { error } = await sb.from("stageplaatsen").update({ logo: null, logo_type: null, logo_op: null }).eq("id", id);
  if (error) return { fout: "Dat lukte niet." };
  revalidatePath(`/beheer/stageplaatsen/${id}`);
  revalidatePath("/");
  return { ok: "Logo verwijderd." };
}
