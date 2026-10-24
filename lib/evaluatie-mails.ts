import "server-only";
import { mailIngesteld, verstuurMail, type Bijlage } from "@/lib/mail-server";
import { siteAdres } from "@/lib/bevestiging-versturen";
import { mailHtml } from "@/lib/contract-mails";
import { SCHOOL_CONTRACT } from "@/lib/contract";
import type { EvalContext } from "@/lib/evaluaties-server";

/** Na het openstellen: evaluatie als pdf naar de stagiair en de mentor, stagebegeleiding in kopie. */
export async function evaluatieMailen(c: EvalContext, pdf: Bijlage) {
  if (!mailIngesteld()) return false;
  const aan = [...new Set([c.leerling.email, c.mentorEmail].map((x) => (x ?? "").trim().toLowerCase()).filter(Boolean))];
  if (!aan.length) return false;
  const site = await siteAdres();
  const naam = `${c.leerling.voornaam} ${c.leerling.naam}`;
  await verstuurMail({
    aan,
    cc: [SCHOOL_CONTRACT.stagemail],
    onderwerp: `Evaluatie stage ${naam}${c.winkel ? ` bij ${c.winkel}` : ""}`,
    html: mailHtml(site, {
      eyebrow: `${c.blok.naam} · evaluatie`,
      titel: "De evaluatie van de stage",
      aanspreking: "Beste",
      alineas: [
        `In bijlage vindt u de evaluatie van de stage van ${naam}${c.winkel ? ` bij ${c.winkel}` : ""}: de evaluatie door de stagementor en die van het stagebezoek door de stagebegeleiding${c.eindpunt !== null ? `, met het eindpunt (${c.eindpunt}/${c.punten?.op ?? 20})` : ""}.`,
        `${c.leerling.voornaam} kan de evaluatie ook bekijken in het portaal bij Mijn stage.`,
        "Bedankt aan de stagegever voor de begeleiding en het vertrouwen.",
      ],
    }),
    bijlagen: [pdf],
  });
  return true;
}
