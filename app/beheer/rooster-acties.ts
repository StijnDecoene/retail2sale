"use server";

import { revalidatePath } from "next/cache";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import { laadRooster } from "@/lib/werkrooster-server";
import { controle, indienFouten } from "@/lib/werkrooster";
import { roosterPdf, roosterPdfNaam } from "@/lib/werkrooster-pdf";
import { roosterGoedgekeurdMailen } from "@/lib/werkrooster-mails";
import type { Resultaat } from "./acties";

/** Werkrooster goedkeuren (eventueel mailen als pdf) of terugsturen met uitleg. */
export async function roosterBeoordelen(_: Resultaat, fd: FormData): Promise<Resultaat> {
  const { begeleider: ik } = await huidigeGebruiker();
  if (!ik) return { fout: "Je hebt hiervoor geen rechten." };
  const id = String(fd.get("dossier_id"));
  const besluit = String(fd.get("besluit"));
  const feedback = String(fd.get("feedback") ?? "").trim().slice(0, 2000) || null;
  const sb = await serverClient();
  const ctx = await laadRooster(sb, { dossier: id });
  const r = ctx?.rooster;
  if (!ctx || !r) return { fout: "Er is nog geen werkrooster." };
  if (r.status === "goedgekeurd") return { fout: "Het rooster is al goedgekeurd." };
  const nu = new Date().toISOString();
  const herlaad = () => {
    revalidatePath("/beheer", "layout");
    revalidatePath("/portaal");
  };

  if (besluit === "aanpassen") {
    if (!feedback) return { fout: "Schrijf erbij wat er aangepast moet worden." };
    const { error } = await sb.from("roosters").update({ status: "terug", feedback, gewijzigd_door: "school" }).eq("dossier_id", id);
    if (error) return { fout: "Terugsturen lukte niet." };
    herlaad();
    return { ok: "Teruggestuurd. De stagegever en de stagiair zien je uitleg." };
  }
  if (besluit !== "goedkeuren") return { fout: "Kies goedkeuren of laten aanpassen." };
  const f = indienFouten(controle(r.dagen, ctx.blok, ctx.uitzonderingen, ctx.meerderjarig));
  if (f.length) return { fout: `Dit rooster kan niet goedgekeurd worden: ${f.join(" ")}` };
  const historiek = r.vorige?.goedgekeurd_op
    ? [...r.historiek, { goedgekeurd_op: r.vorige.goedgekeurd_op, totaal_min: r.vorige.totaal_min, gewijzigd_op: nu }].slice(-10)
    : r.historiek;
  const { error } = await sb.from("roosters").update({
    status: "goedgekeurd", goedgekeurd_op: nu, goedgekeurd_door: ik.id, feedback, vorige: null, heropend_op: null, historiek, gewijzigd_door: "school",
  }).eq("dossier_id", id);
  if (error) return { fout: "Goedkeuren lukte niet." };
  herlaad();

  if (fd.get("mailen") === "aan") {
    const [{ data: a }, { data: d }] = await Promise.all([
      sb.from("aanvragen").select("gegevens").eq("dossier_id", id).maybeSingle(),
      sb.from("dossiers").select("leerlingen(email)").eq("id", id).maybeSingle(),
    ]);
    const mentor = (a?.gegevens as { mentor?: { email?: string } } | undefined)?.mentor?.email;
    const lln = (d as { leerlingen?: { email?: string | null } } | null)?.leerlingen?.email;
    const aan = [...new Set([mentor, lln].map((x) => (x ?? "").trim().toLowerCase()).filter(Boolean))];
    const nieuw = await laadRooster(sb, { dossier: id });
    const pdf = nieuw ? await roosterPdf(nieuw) : null;
    try {
      if (nieuw && pdf && (await roosterGoedgekeurdMailen(nieuw, aan, { naam: roosterPdfNaam(nieuw), type: "application/pdf", inhoud: pdf }))) {
        return { ok: `Goedgekeurd en als pdf gemaild naar ${aan.join(", ")}.` };
      }
    } catch (e) {
      return { fout: `Goedgekeurd, maar mailen lukte niet: ${e instanceof Error ? e.message : "onbekende fout"}` };
    }
  }
  return { ok: "Goedgekeurd." };
}
