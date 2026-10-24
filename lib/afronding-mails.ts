import "server-only";
import { verstuurMail, type Bijlage } from "@/lib/mail-server";
import { mailHtml } from "@/lib/contract-mails";
import { SCHOOL_CONTRACT } from "@/lib/contract";
import type { AttestGegevens } from "@/lib/afronding-server";

/** Attest naar de stagiair. */
export async function attestMailen(site: string, a: AttestGegevens, email: string, pdf: Bijlage) {
  await verstuurMail({
    aan: [email],
    onderwerp: `Je stageattest: ${a.blok.naam}`,
    html: mailHtml(site, {
      eyebrow: `${a.blok.naam} · afronding`,
      titel: "Je stage is afgerond",
      aanspreking: `Dag ${a.leerling.voornaam}`,
      alineas: [
        `Je stage bij ${a.winkel || "je stageplaats"} is afgerond. In bijlage vind je je stageattest met ${a.u.gepresteerd ? `${Math.round(a.u.gepresteerd / 60)} gepresteerde uren` : "de gegevens van je stage"}.`,
        "Bewaar het attest goed: je kan het later gebruiken bij een sollicitatie. Je vindt het ook terug in het portaal bij Mijn stage.",
      ],
      knop: { tekst: "Naar Mijn stage", url: `${site}/portaal?stap=afronding` },
    }),
    bijlagen: [pdf],
  });
}

/** Bedankmail naar de stagegever, met een kopie van het attest en de vraag om feedback. */
export async function bedankMailen(site: string, a: AttestGegevens, o: { email: string; aanspreking: string; token: string | null; feedbackGegeven: boolean }, pdf: Bijlage) {
  await verstuurMail({
    aan: [o.email],
    cc: [SCHOOL_CONTRACT.stagemail],
    onderwerp: `Bedankt voor de stage van ${a.leerling.voornaam} ${a.leerling.naam}`,
    html: mailHtml(site, {
      eyebrow: `${a.blok.naam} · afronding`,
      titel: "Bedankt voor de begeleiding",
      aanspreking: o.aanspreking ? `Beste ${o.aanspreking}` : "Beste stagegever",
      alineas: [
        `De stage van ${a.leerling.voornaam} ${a.leerling.naam} bij ${a.winkel || "uw zaak"} is afgerond. Van harte bedankt voor de tijd en de zorg die u en uw team in de begeleiding hebben gestoken: een stage op de werkvloer is voor onze leerlingen onmisbaar.`,
        `In bijlage vindt u ter info een kopie van het stageattest.`,
        ...(o.feedbackGegeven || !o.token
          ? []
          : ["Mogen we u nog om één ding vragen? Laat ons in twee minuten weten hoe de samenwerking verliep en of u volgend schooljaar opnieuw een stagiair wil ontvangen."]),
      ],
      knop: !o.feedbackGegeven && o.token ? { tekst: "Feedback geven", url: `${site}/rooster/${o.token}?tab=afronding` } : undefined,
      na: ["Hebt u nog vragen of opmerkingen, dan horen we het graag."],
    }),
    bijlagen: [pdf],
  });
}
