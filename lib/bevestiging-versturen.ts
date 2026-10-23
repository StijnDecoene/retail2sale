import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import type { serverClient } from "@/lib/supabase/server";
import { laadBevestiging } from "@/lib/bevestiging-server";
import { bevestigingMail } from "@/lib/bevestiging-mail";
import { bevestigingPdf } from "@/lib/bevestiging-pdf";
import { naamLeerling } from "@/lib/bevestiging";
import { mailIngesteld, verstuurMail } from "@/lib/mail-server";

type Sb = Awaited<ReturnType<typeof serverClient>>;

/** Adres van de site (voor de logo's in de mail). */
export async function siteAdres() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "retail2sale.vercel.app";
  return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
}

export const pdfNaam = (naam: string) => `Bevestiging stage ${naam}.pdf`.replace(/[\\/:*?"<>|]/g, "");

/** Bevestiging mailen naar stagegever en stagiair (stagebegeleiding in kopie) en bijhouden in de mail-log. */
export async function verstuurBevestiging(sb: Sb, dossierId: string, door: string | null): Promise<{ ok?: string; fout?: string }> {
  if (!mailIngesteld()) return { fout: "Mail versturen is nog niet ingesteld (Microsoft 365). Zet de mail klaar in je eigen mailprogramma." };
  const site = await siteAdres();
  const b = await laadBevestiging(sb, dossierId, site);
  if (!b) return { fout: "Er is geen aanvraag om te bevestigen." };
  const voorGever = bevestigingMail(b, site, "stagegever");
  const voorStagiair = bevestigingMail(b, site, "stagiair");
  if (!voorGever.aan.length && !voorStagiair.aan.length) return { fout: "Er is geen e-mailadres van de mentor of de stagiair." };
  const alle = [...voorGever.aan, ...voorStagiair.aan];
  try {
    const [pdf, brochure] = await Promise.all([
      bevestigingPdf(b),
      readFile(path.join(process.cwd(), "public", "docs", `infobrochure-stage-${b.schooljaar}.pdf`)).catch(() => null),
    ]);
    const bijlagen = [
      { naam: pdfNaam(naamLeerling(b)), type: "application/pdf", inhoud: pdf },
      ...(brochure ? [{ naam: `Infobrochure stage ${b.schooljaar}.pdf`, type: "application/pdf", inhoud: brochure }] : []),
    ];
    // Stagegever: met de persoonlijke contractlink, stagebegeleiding in kopie. Stagiair: zonder die link.
    if (voorGever.aan.length) await verstuurMail({ aan: voorGever.aan, cc: voorGever.cc, onderwerp: voorGever.onderwerp, html: voorGever.html, bijlagen });
    if (voorStagiair.aan.length) await verstuurMail({ aan: voorStagiair.aan, onderwerp: voorStagiair.onderwerp, html: voorStagiair.html, bijlagen });
    if (voorGever.aan.length) await sb.from("contract_partijen").update({ uitgenodigd_op: new Date().toISOString() }).eq("dossier_id", dossierId).eq("rol", "stagegever");
    await sb.from("mails").insert({ dossier_id: dossierId, soort: "bevestiging", aan: alle, cc: voorGever.cc, onderwerp: voorGever.onderwerp, door });
    return { ok: `Bevestiging gemaild naar ${alle.join(", ")}.` };
  } catch (e) {
    const fout = e instanceof Error ? e.message : "Versturen lukte niet.";
    await sb.from("mails").insert({ dossier_id: dossierId, soort: "bevestiging", aan: alle, cc: voorGever.cc, onderwerp: voorGever.onderwerp, door, fout });
    return { fout };
  }
}
