"use server";

import { revalidatePath } from "next/cache";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import { vandaagIso } from "@/lib/beheer";
import { attestCode } from "@/lib/afronding";
import { afrondingVoorDossiers, attestBasis, type AttestGegevens } from "@/lib/afronding-server";
import { attestPdf, attestPdfNaam } from "@/lib/attest-pdf";
import { attestMailen, bedankMailen } from "@/lib/afronding-mails";
import { mailIngesteld } from "@/lib/mail-server";
import { siteAdres } from "@/lib/bevestiging-versturen";

export type AfResultaat = { ok?: string; fout?: string } | null;
const herlaad = (id?: string) => {
  revalidatePath("/beheer", "layout");
  revalidatePath("/portaal");
  if (id) revalidatePath(`/beheer/dossiers/${id}`);
};

/**
 * Stage afronden: de uren en de gegevens worden vastgelegd op een stageattest (pdf).
 * Met mailen: het attest gaat naar de stagiair, en de stagegever krijgt een bedankmail (met de vraag om feedback).
 */
export async function stagesAfronden(dossierIds: string[], mailen: boolean): Promise<AfResultaat> {
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return { fout: "Je hebt hiervoor geen rechten." };
  const sb = await serverClient();
  const vandaag = vandaagIso();
  const mailAan = mailen && mailIngesteld();
  const site = mailAan ? await siteAdres() : "";
  let n = 0, gemaild = 0;
  const fouten: string[] = [];
  for (const id of dossierIds.slice(0, 80)) {
    const b = await attestBasis(sb, id);
    if (!b) continue;
    const naam = `${b.leerling.voornaam} ${b.leerling.naam}`;
    const { per } = await afrondingVoorDossiers(sb, [id], b.blok, vandaag);
    const st = per.get(id);
    if (!st || st.afronding) continue;
    const attest: AttestGegevens = {
      code: attestCode(b.blok.schooljaar), datum: vandaag,
      leerling: { voornaam: b.leerling.voornaam, naam: b.leerling.naam, klas: b.leerling.klas },
      blok: b.blok, stage: b.stage, winkel: b.winkel, adres: b.adres, mentor: b.mentor, u: st.u, team: b.team, directeur: b.directeur,
    };
    const { error } = await sb.from("afrondingen").insert({
      dossier_id: id, afgerond_door: begeleider.id, uren_min: st.u.gepresteerd, attest_code: attest.code, attest,
    });
    if (error) { fouten.push(naam); continue; }
    n++;
    if (mailAan) {
      try {
        const pdf = { naam: attestPdfNaam(attest), type: "application/pdf", inhoud: await attestPdf(attest) };
        if (b.leerling.email) await attestMailen(site, attest, b.leerling.email, pdf);
        if (b.stagegeverEmail) {
          await bedankMailen(site, attest, {
            email: b.stagegeverEmail, aanspreking: b.aanspreking, token: b.stagegeverToken,
            feedbackGegeven: st.evaluaties.some((e) => e.soort === "feedback" && e.status === "ingediend"),
          }, pdf);
        }
        await sb.from("afrondingen").update({ gemaild_op: new Date().toISOString() }).eq("dossier_id", id);
        gemaild++;
      } catch {
        fouten.push(`${naam} (mail)`);
      }
    }
  }
  herlaad(dossierIds.length === 1 ? dossierIds[0] : undefined);
  const mailTekst = mailen ? (mailIngesteld() ? ` Attest en bedankmail verstuurd voor ${gemaild}.` : " Mailen staat nog niet aan: het attest staat wel in het portaal van de stagiair.") : "";
  return fouten.length
    ? { fout: `Afgerond: ${n}.${mailTekst} Niet gelukt: ${fouten.join(", ")}.` }
    : { ok: `${n} ${n === 1 ? "stage" : "stages"} afgerond.${mailTekst}` };
}

/** Afronding ongedaan maken (bv. om uren te corrigeren). Het attest vervalt; bij opnieuw afronden komt er een nieuwe code. */
export async function afrondingIntrekken(dossierId: string): Promise<AfResultaat> {
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return { fout: "Je hebt hiervoor geen rechten." };
  const sb = await serverClient();
  const { error } = await sb.from("afrondingen").delete().eq("dossier_id", dossierId);
  if (error) return { fout: "Dat lukte niet." };
  herlaad(dossierId);
  return { ok: "Afronding ingetrokken. Het attest is niet meer geldig." };
}
