"use server";

import { revalidatePath } from "next/cache";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";

/** Alle meldingen tot nu als gelezen markeren (per begeleider). */
export async function meldingenGelezen() {
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return;
  const sb = await serverClient();
  await sb.from("meldingen_gezien").upsert({ begeleider_id: begeleider.id, gezien_tot: new Date().toISOString() }, { onConflict: "begeleider_id" });
  revalidatePath("/beheer", "layout");
}
