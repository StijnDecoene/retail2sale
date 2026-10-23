"use server";

import { revalidatePath } from "next/cache";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import { bezoeker, contractBeheer, contractKlaarzetten, nieuweLink, tekstHash } from "@/lib/contract-server";
import { contractPdf } from "@/lib/contract-pdf";
import { afgerondMailen, uitnodiging } from "@/lib/contract-mails";
import { siteAdres } from "@/lib/bevestiging-versturen";
import { mailIngesteld, verstuurMail } from "@/lib/mail-server";
import { mailFout, telFout, telMooi } from "@/lib/contactcheck";
import { ROL_LABEL, isMeerderjarig, magTekenen, type ContractGegevens, type Rol } from "@/lib/contract";
import { leeftijdOp, type AanvraagGegevens } from "@/lib/portaal";
import type { Resultaat } from "./acties";

async function begeleider() {
  const { begeleider } = await huidigeGebruiker();
  return begeleider;
}
const herlaad = (id: string) => {
  revalidatePath(`/beheer/dossiers/${id}`);
  revalidatePath("/portaal");
};

export async function contractKlaarzettenActie(_: Resultaat, fd: FormData): Promise<Resultaat> {
  const ik = await begeleider();
  if (!ik) return { fout: "Je hebt hiervoor geen rechten." };
  const id = String(fd.get("dossier_id"));
  const r = await contractKlaarzetten(await serverClient(), id, ik.naam);
  herlaad(id);
  return r.fout ? { fout: r.fout } : { ok: r.ok };
}

/** Persoonlijke link mailen naar een partij (stagegever, stagiair of ouder). */
export async function contractLinkMailen(_: Resultaat, fd: FormData): Promise<Resultaat> {
  const ik = await begeleider();
  if (!ik) return { fout: "Je hebt hiervoor geen rechten." };
  const id = String(fd.get("dossier_id"));
  const rol = String(fd.get("rol")) as Rol;
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!email) return { fout: "Vul een e-mailadres in." };
  const mf = mailFout(email);
  if (mf) return { fout: mf };
  if (!mailIngesteld()) return { fout: "Mail versturen is nog niet ingesteld. Kopieer de link en mail hem zelf." };
  const sb = await serverClient();
  const d = await contractBeheer(sb, id);
  const p = d?.partijenBeheer.find((x) => x.rol === rol);
  if (!d || !p?.token) return { fout: "Er is geen link voor deze partij." };
  const site = await siteAdres();
  const m = uitnodiging(d, rol, `${site}/contract/${p.token}`, site);
  try {
    await verstuurMail({ aan: [email], onderwerp: m.onderwerp, html: m.html });
  } catch (e) {
    return { fout: e instanceof Error ? e.message : "Versturen lukte niet." };
  }
  await sb.from("contract_partijen").update({ email, uitgenodigd_op: new Date().toISOString() }).eq("dossier_id", id).eq("rol", rol);
  await sb.from("contract_log").insert({ dossier_id: id, wie: ik.naam, wat: `link gemaild naar ${ROL_LABEL[rol].toLowerCase()} (${email})` });
  herlaad(id);
  return { ok: `Link gemaild naar ${email}.` };
}

/** Gegevens van het contract aanpassen in het beheer (ook na een handtekening; dat wordt bijgehouden). */
export async function contractGegevensBewaren(_: Resultaat, fd: FormData): Promise<Resultaat> {
  const ik = await begeleider();
  if (!ik) return { fout: "Je hebt hiervoor geen rechten." };
  const id = String(fd.get("dossier_id"));
  const sb = await serverClient();
  const { data: c } = await sb.from("contracten").select("gegevens").eq("dossier_id", id).maybeSingle();
  if (!c) return { fout: "Er is nog geen contract." };
  const velden: (keyof ContractGegevens)[] = ["ondertekenaar", "hoedanigheid", "mentor", "mentor_tel", "winkel_naam", "winkel_adres", "winkel_tel", "winkel_email", "kbo", "pc", "rsz", "risico", "toestellen", "afspraken", "stagiair_adres"];
  const nieuw: Record<string, string> = { ...(c.gegevens as Record<string, string>) };
  const gewijzigd: string[] = [];
  for (const k of velden) {
    if (!fd.has(k)) continue;
    let w = String(fd.get(k) ?? "").trim();
    if (k === "mentor_tel" || k === "winkel_tel") {
      const f = telFout(w);
      if (f) return { fout: `Telefoon: ${f}` };
      w = telMooi(w);
    }
    if (k === "winkel_email") {
      const f = mailFout(w);
      if (f) return { fout: `E-mail: ${f}` };
      w = w.toLowerCase();
    }
    if ((nieuw[k] ?? "") !== w) { gewijzigd.push(k); nieuw[k] = w; }
  }
  if (!gewijzigd.length) return { ok: "Niets gewijzigd." };
  const { error } = await sb.from("contracten").update({ gegevens: nieuw }).eq("dossier_id", id);
  if (error) return { fout: "Bewaren lukte niet." };
  const { data: getekend } = await sb.from("contract_partijen").select("rol").eq("dossier_id", id).not("getekend_op", "is", null);
  const na = (getekend ?? []).length > 0;
  await sb.from("contract_log").insert({ dossier_id: id, wie: ik.naam, wat: `gegevens gewijzigd (${gewijzigd.join(", ")})${na ? " na ondertekening" : ""}` });
  herlaad(id);
  return { ok: na ? "Bewaard. Er was al getekend: de wijziging staat in het logboek." : "Bewaard." };
}

/** Tekenen als directeur (door de directeur zelf of een stagebegeleider in diens naam). Daarna gaat het contract naar alle partijen. */
export async function contractTekenenDirectie(
  dossierId: string,
  invoer: { naam: string; plaats: string; handtekening: string; namens: boolean },
): Promise<Resultaat> {
  const ik = await begeleider();
  if (!ik) return { fout: "Je hebt hiervoor geen rechten." };
  if (!invoer.naam.trim() || !invoer.plaats.trim()) return { fout: "Vul naam en plaats in." };
  if (!invoer.handtekening.startsWith("data:image/png;base64,") || invoer.handtekening.length > 400000) return { fout: "Zet je handtekening in het vak." };
  const sb = await serverClient();
  const d = await contractBeheer(sb, dossierId);
  if (!d) return { fout: "Er is geen contract." };
  if (!magTekenen(d, "directie")) return { fout: "De school tekent als laatste: eerst moeten de andere partijen tekenen." };
  const { ip, browser } = await bezoeker();
  const nu = new Date().toISOString();
  const { error } = await sb.from("contract_partijen").update({
    getekend_op: nu, getekend_naam: invoer.naam.trim(), plaats: invoer.plaats.trim(), handtekening: invoer.handtekening,
    extra: invoer.namens ? { namens: "directeur" } : {}, ip, browser: browser?.slice(0, 300), tekst_hash: tekstHash(d),
  }).eq("dossier_id", dossierId).eq("rol", "directie");
  if (error) return { fout: "Ondertekenen lukte niet." };
  await sb.from("contracten").update({ afgerond_op: nu }).eq("dossier_id", dossierId);
  await sb.from("contract_log").insert({ dossier_id: dossierId, wie: ik.naam, wat: `ondertekend voor de school${invoer.namens ? " (namens de directeur)" : ""}` });

  let mail = "";
  if (mailIngesteld()) {
    const klaar = await contractBeheer(sb, dossierId);
    const emails = [...new Set((klaar?.partijenBeheer ?? []).map((p) => p.email).filter((e): e is string => !!e))];
    if (klaar && emails.length) {
      try {
        const pdf = await contractPdf(klaar, tekstHash(klaar));
        await afgerondMailen(klaar, emails, { naam: `Stagecontract ${klaar.leerling.voornaam} ${klaar.leerling.naam}.pdf`, type: "application/pdf", inhoud: pdf });
        await sb.from("contract_log").insert({ dossier_id: dossierId, wie: "platform", wat: `ondertekend contract gemaild naar ${emails.join(", ")}` });
        mail = ` Het contract is gemaild naar ${emails.join(", ")}.`;
      } catch (e) {
        mail = ` Mailen lukte niet: ${e instanceof Error ? e.message : "onbekende fout"}.`;
      }
    }
  }
  herlaad(dossierId);
  return { ok: `Ondertekend. Het contract is volledig.${mail}` };
}

/** Een handtekening wissen (bv. bij een fout). Enkel beheerders. */
export async function contractHandtekeningWissen(fd: FormData) {
  const ik = await begeleider();
  if (!ik || (ik.rol !== "beheerder" && ik.rol !== "directie")) return;
  const id = String(fd.get("dossier_id"));
  const rol = String(fd.get("rol")) as Rol;
  const sb = await serverClient();
  await sb.from("contract_partijen").update({ getekend_op: null, getekend_naam: null, plaats: null, handtekening: null, extra: {}, ip: null, browser: null, tekst_hash: null })
    .eq("dossier_id", id).eq("rol", rol);
  await sb.from("contracten").update({ afgerond_op: null }).eq("dossier_id", id);
  await sb.from("contract_log").insert({ dossier_id: id, wie: ik.naam, wat: `handtekening van ${ROL_LABEL[rol].toLowerCase()} gewist` });
  herlaad(id);
}

/**
 * Leeftijd opnieuw bepalen uit de (verbeterde) geboortedatum in de aanvraag.
 * Kan enkel zolang de stagiair en de ouder nog niet getekend hebben.
 * Minderjarig geworden: een link voor de ouder wordt aangemaakt. Meerderjarig: de ouder vervalt.
 */
export async function contractLeeftijdHerbepalen(_: Resultaat, fd: FormData): Promise<Resultaat> {
  const ik = await begeleider();
  if (!ik) return { fout: "Je hebt hiervoor geen rechten." };
  const id = String(fd.get("dossier_id"));
  const sb = await serverClient();
  const [{ data: c }, { data: d }, { data: a }, { data: ps }] = await Promise.all([
    sb.from("contracten").select("meerderjarig").eq("dossier_id", id).maybeSingle(),
    sb.from("dossiers").select("blok_id").eq("id", id).single(),
    sb.from("aanvragen").select("gegevens").eq("dossier_id", id).maybeSingle(),
    sb.from("contract_partijen").select("rol, getekend_op").eq("dossier_id", id),
  ]);
  if (!c || !d) return { fout: "Er is geen contract." };
  const partijen = (ps ?? []) as { rol: Rol; getekend_op: string | null }[];
  if (partijen.some((p) => (p.rol === "stagiair" || p.rol === "ouder") && p.getekend_op)) {
    return { fout: "De stagiair of de ouder heeft al getekend. Wis eerst die handtekening(en) als de leeftijd echt fout was." };
  }
  const { data: b } = await sb.from("blokken").select("start_datum").eq("id", d.blok_id).single();
  const geboorte = (a?.gegevens as AanvraagGegevens | undefined)?.stagiair?.geboortedatum;
  const lft = leeftijdOp(geboorte, b!.start_datum);
  if (lft === null) return { fout: "Er staat geen geldige geboortedatum in de aanvraag. Laat de aanvraag aanpassen." };
  const meerderjarig = isMeerderjarig(geboorte, b!.start_datum);
  if (meerderjarig === c.meerderjarig) return { ok: `Ongewijzigd: ${lft} jaar op de eerste stagedag (${meerderjarig ? "3" : "4"} handtekeningen).` };

  const { error } = await sb.from("contracten").update({ meerderjarig }).eq("dossier_id", id);
  if (error) return { fout: "Bewaren lukte niet." };
  if (meerderjarig) {
    await sb.from("contract_partijen").delete().eq("dossier_id", id).eq("rol", "ouder");
  } else if (!partijen.some((p) => p.rol === "ouder")) {
    await sb.from("contract_partijen").insert({ dossier_id: id, rol: "ouder", token: nieuweLink() });
  }
  const naGetekend = partijen.some((p) => p.getekend_op);
  await sb.from("contract_log").insert({
    dossier_id: id, wie: ik.naam,
    wat: `leeftijd opnieuw bepaald: ${lft} jaar op de eerste stagedag, ${meerderjarig ? "meerderjarig (geen ouder meer)" : "minderjarig (ouder tekent mee)"}${naGetekend ? " na ondertekening" : ""}`,
  });
  herlaad(id);
  return { ok: meerderjarig ? `Meerderjarig (${lft} jaar): de ouder hoeft niet meer te tekenen.` : `Minderjarig (${lft} jaar): er is een link voor de ouder aangemaakt.` };
}
