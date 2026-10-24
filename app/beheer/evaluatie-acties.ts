"use server";

import { revalidatePath } from "next/cache";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import { laadEvaluatieSchool } from "@/lib/evaluaties-server";
import { formulier, puntVoorstel, schoon, score, type Antwoorden, type Puntenschema, type Soort } from "@/lib/evaluaties";
import { evaluatiePdf, evaluatiePdfNaam } from "@/lib/evaluatie-pdf";
import { evaluatieMailen } from "@/lib/evaluatie-mails";
import { mailIngesteld } from "@/lib/mail-server";

export type EvResultaat = { ok?: string; fout?: string } | null;
const herlaad = (id?: string) => {
  revalidatePath("/beheer", "layout");
  revalidatePath("/portaal");
  if (id) revalidatePath(`/beheer/dossiers/${id}`);
};

/** School vult een evaluatie in (bezoekformulier, of een mentorevaluatie op papier overnemen). */
export async function schoolEvaluatieBewaren(dossierId: string, soort: Soort, antwoorden: Antwoorden, indienen: boolean, naam: string): Promise<EvResultaat> {
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return { fout: "Je hebt hiervoor geen rechten." };
  const sb = await serverClient();
  const ctx = await laadEvaluatieSchool(sb, dossierId);
  if (!ctx) return { fout: "Dossier niet gevonden." };
  const a = schoon(formulier(soort, ctx.stage), antwoorden);
  const huidig = ctx.evaluaties.find((e) => e.soort === soort);
  const { error } = await sb.from("evaluaties").upsert({
    dossier_id: dossierId, soort, antwoorden: a,
    status: indienen ? "ingediend" : huidig?.status ?? "concept",
    naam: (naam || (soort === "school" ? begeleider.naam : huidig?.naam) || null),
    ingediend_op: indienen ? new Date().toISOString() : huidig?.ingediend_op ?? null,
  }, { onConflict: "dossier_id,soort" });
  if (error) return { fout: "Bewaren lukte niet." };
  herlaad(dossierId);
  return { ok: indienen ? "Evaluatie afgewerkt." : "Bewaard." };
}

/** Een ingediende evaluatie terug openzetten (zodat mentor of stagiair kan verbeteren). */
export async function evaluatieHeropenen(dossierId: string, soort: Soort): Promise<EvResultaat> {
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return { fout: "Je hebt hiervoor geen rechten." };
  const sb = await serverClient();
  const { error } = await sb.from("evaluaties").update({ status: "concept", ingediend_op: null }).eq("dossier_id", dossierId).eq("soort", soort);
  if (error) return { fout: "Dat lukte niet." };
  herlaad(dossierId);
  return { ok: "Heropend: de evaluatie kan opnieuw aangepast worden." };
}

export async function eindpuntBewaren(dossierId: string, eindpunt: number | null, opmerking: string): Promise<EvResultaat> {
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return { fout: "Je hebt hiervoor geen rechten." };
  const sb = await serverClient();
  const { error } = await sb.from("evaluatie_resultaten").upsert(
    { dossier_id: dossierId, eindpunt: eindpunt === null || Number.isNaN(eindpunt) ? null : Math.round(eindpunt * 10) / 10, opmerking: opmerking.trim().slice(0, 2000) || null },
    { onConflict: "dossier_id" },
  );
  if (error) return { fout: "Bewaren lukte niet." };
  herlaad(dossierId);
  return { ok: "Bewaard." };
}

/**
 * Evaluaties openstellen: de stagiair ziet de evaluatie van de mentor en van de school (en het eindpunt) op de website,
 * en stagiair en mentor krijgen ze per mail als pdf (als de mailkoppeling aan staat).
 */
export async function evaluatiesOpenstellen(dossierIds: string[], mailen: boolean): Promise<EvResultaat> {
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return { fout: "Je hebt hiervoor geen rechten." };
  const sb = await serverClient();
  let n = 0, gemaild = 0;
  const fouten: string[] = [];
  for (const id of dossierIds.slice(0, 80)) {
    const ctx = await laadEvaluatieSchool(sb, id);
    if (!ctx) continue;
    const p = ctx.punten!;
    const m = ctx.evaluaties.find((e) => e.soort === "mentor" && e.status === "ingediend");
    const s = ctx.evaluaties.find((e) => e.soort === "school" && e.status === "ingediend");
    const voorstel = puntVoorstel(m ? score(formulier("mentor", ctx.stage), m.antwoorden, p) : null, s ? score(formulier("school", ctx.stage), s.antwoorden, p) : null, p);
    const { error } = await sb.from("evaluatie_resultaten").upsert(
      { dossier_id: id, vrijgegeven_op: new Date().toISOString(), vrijgegeven_door: begeleider.id, eindpunt: ctx.eindpunt ?? voorstel },
      { onConflict: "dossier_id" },
    );
    if (error) { fouten.push(`${ctx.leerling.voornaam} ${ctx.leerling.naam}`); continue; }
    n++;
    if (mailen && mailIngesteld()) {
      try {
        const nu = await laadEvaluatieSchool(sb, id);
        const pdf = await evaluatiePdf(nu!);
        if (await evaluatieMailen(nu!, { naam: evaluatiePdfNaam(nu!), type: "application/pdf", inhoud: pdf })) gemaild++;
      } catch {
        fouten.push(`${ctx.leerling.voornaam} ${ctx.leerling.naam} (mail)`);
      }
    }
  }
  herlaad();
  const mailTekst = mailen ? (mailIngesteld() ? ` ${gemaild} gemaild.` : " Mailen staat nog niet aan: de stagiair ziet de evaluatie wel op de website.") : "";
  return fouten.length ? { fout: `Opengesteld: ${n}.${mailTekst} Niet gelukt: ${fouten.join(", ")}.` } : { ok: `Opengesteld voor ${n} ${n === 1 ? "leerling" : "leerlingen"}.${mailTekst}` };
}

export async function openstellenIntrekken(dossierId: string): Promise<EvResultaat> {
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return { fout: "Je hebt hiervoor geen rechten." };
  const sb = await serverClient();
  const { error } = await sb.from("evaluatie_resultaten").update({ vrijgegeven_op: null, vrijgegeven_door: null }).eq("dossier_id", dossierId);
  if (error) return { fout: "Dat lukte niet." };
  herlaad(dossierId);
  return { ok: "De stagiair ziet de evaluaties niet meer." };
}

export async function puntenBewaren(blokId: string, p: Puntenschema): Promise<EvResultaat> {
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return { fout: "Je hebt hiervoor geen rechten." };
  const n = (x: unknown, min: number, max: number) => Math.min(max, Math.max(min, Number(x) || 0));
  const sb = await serverClient();
  const { error } = await sb.from("evaluatie_instellingen").upsert({
    blok_id: blokId,
    punten: { O: n(p.O, 0, 10), V: n(p.V, 0, 10), G: n(p.G, 0, 10), ZG: n(p.ZG, 0, 10), op: n(p.op, 1, 100), aandeel_mentor: n(p.aandeel_mentor, 0, 100) },
  }, { onConflict: "blok_id" });
  if (error) return { fout: "Bewaren lukte niet." };
  herlaad();
  return { ok: "Puntenschema bewaard." };
}
