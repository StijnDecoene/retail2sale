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
  const b = await laadBevestiging(sb, dossierId);
  if (!b) return { fout: "Er is geen aanvraag om te bevestigen." };
  const mail = bevestigingMail(b, await siteAdres());
  if (!mail.aan.length) return { fout: "Er is geen e-mailadres van de mentor of de stagiair." };
  try {
    const [pdf, brochure] = await Promise.all([
      bevestigingPdf(b),
      readFile(path.join(process.cwd(), "public", "docs", `infobrochure-stage-${b.schooljaar}.pdf`)).catch(() => null),
    ]);
    await verstuurMail({
      aan: mail.aan, cc: mail.cc, onderwerp: mail.onderwerp, html: mail.html,
      bijlagen: [
        { naam: pdfNaam(naamLeerling(b)), type: "application/pdf", inhoud: pdf },
        ...(brochure ? [{ naam: `Infobrochure stage ${b.schooljaar}.pdf`, type: "application/pdf", inhoud: brochure }] : []),
      ],
    });
    await sb.from("mails").insert({ dossier_id: dossierId, soort: "bevestiging", aan: mail.aan, cc: mail.cc, onderwerp: mail.onderwerp, door });
    return { ok: `Bevestiging gemaild naar ${mail.aan.join(", ")}.` };
  } catch (e) {
    const fout = e instanceof Error ? e.message : "Versturen lukte niet.";
    await sb.from("mails").insert({ dossier_id: dossierId, soort: "bevestiging", aan: mail.aan, cc: mail.cc, onderwerp: mail.onderwerp, door, fout });
    return { fout };
  }
}
