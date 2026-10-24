"use server";

import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase/server";
import { bezoeker, contractViaLink, tekstHash } from "@/lib/contract-server";
import { adresFouten, adresSamen, effectief, gegevensFouten, type AdresDelen, type ContractGegevens, type Rol } from "@/lib/contract";
import { mailFout, telFout, telMooi } from "@/lib/contactcheck";
import { naGetekend } from "@/lib/contract-mails";
import { MIN_ACTIVITEITEN, schoonLijst } from "@/lib/activiteiten";

export type ContractResultaat = { ok?: string; fout?: string; velden?: Record<string, string> } | null;

const MELDING: Record<string, string> = {
  onbekend: "Deze link is niet (meer) geldig. Vraag een nieuwe link aan de stagebegeleiding.",
  geen_rechten: "Met deze link kan je dit niet doen.",
  vergrendeld: "Er is al getekend. Wijzigingen kan enkel de stagebegeleiding nog doen: mail naar retail2sale@snh.be.",
  gegevens: "Vul eerst de verplichte gegevens aan (naam ondertekenaar, hoedanigheid, mentor en activiteitenlijst).",
  ongeldig: "De activiteitenlijst kon niet bewaard worden. Probeer opnieuw.",
  volgorde: "De stagegever tekent eerst. Je krijgt bericht zodra jij kan tekenen.",
  al_getekend: "Dit is al ondertekend.",
  niet_nodig: "Bij een meerderjarige stagiair tekent er geen ouder.",
  onvolledig: "Vul je naam en de plaats in.",
  handtekening: "Zet je handtekening in het vak.",
};

const tekst = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

/** Stagegever: gegevens aanvullen (enkel zolang nog niemand tekende). */
export async function contractBewaren(token: string, invoer: ContractGegevens): Promise<ContractResultaat> {
  const g: ContractGegevens = {
    ondertekenaar: tekst(invoer.ondertekenaar, 200), hoedanigheid: tekst(invoer.hoedanigheid, 100), mentor: tekst(invoer.mentor, 200),
    mentor_tel: telMooi(tekst(invoer.mentor_tel, 40)), winkel_naam: tekst(invoer.winkel_naam, 200), winkel_adres: tekst(invoer.winkel_adres, 300),
    winkel_tel: telMooi(tekst(invoer.winkel_tel, 40)), winkel_email: tekst(invoer.winkel_email, 200).toLowerCase(), kbo: tekst(invoer.kbo, 30),
    pc: tekst(invoer.pc, 40), rsz: tekst(invoer.rsz, 40), risico: invoer.risico === "heb" || invoer.risico === "stuur" ? invoer.risico : "",
    toestellen: tekst(invoer.toestellen, 1000), afspraken: tekst(invoer.afspraken, 1000),
    activiteiten: schoonLijst(invoer.activiteiten),
  };
  const velden: Record<string, string> = {};
  const mt = telFout(g.mentor_tel), wt = telFout(g.winkel_tel), wm = mailFout(g.winkel_email);
  if (mt) velden.mentor_tel = mt;
  if (wt) velden.winkel_tel = wt;
  if (wm) velden.winkel_email = wm;
  if ((g.activiteiten?.length ?? 0) < MIN_ACTIVITEITEN) velden.activiteiten = `Duid minstens ${MIN_ACTIVITEITEN} activiteiten aan.`;
  if (Object.keys(velden).length) return { fout: "Kijk de rode velden na.", velden };
  const sb = await serverClient();
  const { data, error } = await sb.rpc("contract_aanvullen", { p_token: token, p_gegevens: g });
  if (error) return { fout: "Bewaren lukte niet. Probeer opnieuw." };
  if (data !== "ok") return { fout: MELDING[data as string] ?? "Bewaren lukte niet." };
  revalidatePath(`/contract/${token}`);
  return { ok: "Bewaard." };
}

/** Ondertekenen via de link. Rol "ouder" kan ook vanaf de link van de stagiair. */
export async function contractOndertekenen(
  token: string,
  rol: Rol,
  invoer: { naam: string; plaats: string; handtekening: string; relatie?: string; adres?: AdresDelen; akkoord: boolean },
): Promise<ContractResultaat> {
  const velden: Record<string, string> = {};
  if (!invoer.akkoord) velden.akkoord = "Vink aan dat je akkoord gaat.";
  if (!tekst(invoer.naam)) velden.naam = "Vul je naam in.";
  if (!tekst(invoer.plaats)) velden.plaats = "Vul de plaats in.";
  let adres = "";
  if (rol === "stagiair") {
    const a: AdresDelen = {
      straat: tekst(invoer.adres?.straat, 150), nummer: tekst(invoer.adres?.nummer, 10), bus: tekst(invoer.adres?.bus, 10),
      postcode: tekst(invoer.adres?.postcode, 4), gemeente: tekst(invoer.adres?.gemeente, 100),
    };
    Object.assign(velden, adresFouten(a));
    adres = adresSamen(a);
  }
  if (!invoer.handtekening?.startsWith("data:image/png;base64,")) velden.handtekening = "Zet je handtekening in het vak.";
  if (Object.keys(velden).length) return { fout: "Nog niet alles is ingevuld.", velden };

  const sb = await serverClient();
  const d = await contractViaLink(sb, token);
  if (!d) return { fout: MELDING.onbekend };
  if (rol === "stagegever") {
    const f = gegevensFouten(effectief(d));
    if (Object.keys(f).length) return { fout: MELDING.gegevens, velden: f };
  }
  // Vingerafdruk van de tekst zoals die nu getoond wordt (met het adres van de stagiair erin).
  const hash = tekstHash(rol === "stagiair" ? { ...d, contract: { ...d.contract, gegevens: { ...d.contract.gegevens, stagiair_adres: adres } } } : d);
  const extra: Record<string, string> = {};
  if (rol === "ouder" && invoer.relatie) extra.relatie = tekst(invoer.relatie, 40);
  if (rol === "stagiair") extra.adres = adres;
  if (rol === "stagegever") extra.hoedanigheid = effectief(d).hoedanigheid;
  const { ip, browser } = await bezoeker();
  const { data, error } = await sb.rpc("contract_tekenen", {
    p_token: token, p_rol: rol, p_naam: tekst(invoer.naam, 200), p_plaats: tekst(invoer.plaats, 100), p_handtekening: invoer.handtekening,
    p_extra: extra, p_ip: ip, p_browser: browser, p_tekst_hash: hash,
  });
  if (error) return { fout: "Ondertekenen lukte niet. Probeer opnieuw." };
  if (data !== "ok") return { fout: MELDING[data as string] ?? "Ondertekenen lukte niet." };
  await naGetekend(d, rol).catch(() => null);
  revalidatePath(`/contract/${token}`);
  return { ok: "Ondertekend. Dank je wel!" };
}
