import "server-only";
import { mailIngesteld, verstuurMail, type Bijlage } from "@/lib/mail-server";
import { siteAdres } from "@/lib/bevestiging-versturen";
import { mailHtml } from "@/lib/contract-mails";
import { SCHOOL_CONTRACT } from "@/lib/contract";
import { uren, type RoosterContext } from "@/lib/werkrooster";

const naam = (c: RoosterContext) => `${c.leerling.voornaam} ${c.leerling.naam}`;

/** Melding aan de stagebegeleiding: een (gewijzigd) werkrooster is ingediend. Zonder mailkoppeling: niets (teller in het beheer). */
export async function roosterIngediendMailen(c: RoosterContext, door: string, wijziging: boolean) {
  if (!mailIngesteld()) return;
  const site = await siteAdres();
  await verstuurMail({
    aan: [SCHOOL_CONTRACT.stagemail],
    onderwerp: `${wijziging ? "Gewijzigd werkrooster" : "Werkrooster"} ${naam(c)} na te kijken`,
    html: mailHtml(site, {
      eyebrow: `${c.blok.naam} · werkrooster`,
      titel: wijziging ? "Gewijzigd werkrooster na te kijken" : "Werkrooster na te kijken",
      aanspreking: "Beste stagebegeleider",
      alineas: [
        `${door} heeft het ${wijziging ? "gewijzigde " : ""}werkrooster van ${naam(c)} (${c.leerling.klas}) bij ${c.stagegever.winkel ?? "de stageplaats"} ingediend.`,
        `Kijk het na en keur het goed of stuur het terug.`,
      ],
      knop: { tekst: "Dossier openen", url: `${site}/beheer/dossiers/${c.dossier_id}` },
    }),
  });
}

/** Na goedkeuring: het rooster als pdf naar stagegever en stagiair. */
export async function roosterGoedgekeurdMailen(c: RoosterContext, aan: string[], pdf: Bijlage) {
  if (!mailIngesteld() || !aan.length) return false;
  const site = await siteAdres();
  await verstuurMail({
    aan,
    cc: [SCHOOL_CONTRACT.stagemail],
    onderwerp: `Werkrooster ${naam(c)} goedgekeurd`,
    html: mailHtml(site, {
      eyebrow: `${c.blok.naam} · werkrooster`,
      titel: "Het werkrooster is goedgekeurd",
      aanspreking: "Beste",
      alineas: [
        `De stagebegeleiding heeft het werkrooster van ${naam(c)} bij ${c.stagegever.winkel ?? "de stageplaats"} goedgekeurd (${uren(c.rooster?.totaal_min ?? 0)}). In bijlage vindt u het rooster als pdf.`,
        "Moet er later toch iets wijzigen? Kies dan Rooster aanpassen via dezelfde link of in het portaal. Het goedgekeurde rooster blijft gelden tot de wijziging is goedgekeurd.",
      ],
    }),
    bijlagen: [pdf],
  });
  return true;
}
