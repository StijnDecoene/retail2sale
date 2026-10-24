"use server";

import { adminClient, mailHtml } from "@/lib/contract-mails";
import { mailIngesteld, verstuurMail } from "@/lib/mail-server";
import { siteAdres } from "@/lib/bevestiging-versturen";
import { datumMidden } from "@/lib/contract";
import type { Overzicht } from "@/lib/stagegever";

export type LinkResultaat = { ok?: string; fout?: string };

/**
 * Stagegever vraagt zijn links opnieuw aan. Als het mailadres bij een stagiair hoort, krijgt het een mail met
 * een overzichtslink (30 dagen geldig) en de persoonlijke link per stagiair. Het antwoord verraadt niet of het adres gekend is.
 */
export async function stagegeverLinkAanvragen(emailIn: string): Promise<LinkResultaat> {
  const email = String(emailIn ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return { fout: "Vul een geldig e-mailadres in." };
  const admin = adminClient();
  if (!admin || !mailIngesteld()) {
    return { fout: "Links per mail aanvragen werkt binnenkort. Gebruik tot dan de link uit de mail van retail2sale@snh.be, of mail ons: we sturen hem opnieuw." };
  }
  const { data, error } = await admin.rpc("stagegever_link_aanvragen", { p_email: email });
  if (error) return { fout: "Dat lukte niet. Probeer later opnieuw." };
  const r = data as { te_veel?: boolean; aantal?: number; token?: string } | null;
  if (r?.te_veel) return { fout: "Er werden net te veel links aangevraagd voor dit adres. Probeer het over een uur opnieuw." };
  if (r?.token) {
    const { data: o } = await admin.rpc("stagegever_overzicht", { p_token: r.token });
    const ov = o as Overzicht | null;
    const site = await siteAdres();
    const lijst = (ov?.stagiairs ?? []).map((s) => `${s.naam} (${s.blok}, ${datumMidden(s.start_datum)} – ${datumMidden(s.eind_datum)}): ${site}/rooster/${s.token}`);
    try {
      await verstuurMail({
        aan: [email],
        onderwerp: "Uw links voor het stageplatform Retail2Sale",
        html: mailHtml(site, {
          eyebrow: "Stageplatform · stagegever",
          titel: "Uw stagiairs op één plek",
          aanspreking: "Beste stagegever",
          alineas: [
            "U vroeg uw links op voor het stageplatform. Via de knop ziet u al uw stagiairs, met per stagiair wat er nog te doen is: het contract, het werkrooster, afwezigheden, de evaluatie en de afronding.",
            "De knop is 30 dagen geldig. Daarna kan u altijd een nieuwe aanvragen via Inloggen → Stagegever.",
          ],
          knop: { tekst: "Mijn stagiairs bekijken", url: `${site}/stagegever/${r.token}` },
          na: [...(lijst.length ? ["Persoonlijke link per stagiair (blijft geldig tot het einde van de stage):", ...lijst] : []), "Hebt u dit niet aangevraagd? Dan mag u deze mail negeren."],
        }),
      });
    } catch {
      return { fout: "De mail kon niet verstuurd worden. Probeer later opnieuw of mail naar retail2sale@snh.be." };
    }
  }
  return { ok: "Als dit adres bij ons gekend is, krijgt u binnen enkele minuten een mail met uw links. Kijk ook bij ongewenste mail." };
}
