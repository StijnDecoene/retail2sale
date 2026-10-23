import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { mailIngesteld, verstuurMail, type Bijlage } from "@/lib/mail-server";
import { siteAdres } from "@/lib/bevestiging-versturen";
import { ROL_LABEL, SCHOOL_CONTRACT, datumMidden, effectief, nodigeRollen, getekend, type ContractData, type Rol } from "@/lib/contract";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Eenvoudige mail in de huisstijl: titel, alinea's en eventueel een knop. */
export function mailHtml(site: string, o: { eyebrow: string; titel: string; aanspreking: string; alineas: string[]; knop?: { tekst: string; url: string }; na?: string[] }) {
  const blauw = "#1d5baa", lijn = "#e3e7ee";
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f4f6f9;font-family:Figtree,'Segoe UI',Arial,sans-serif;color:#0e1a2b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border:1px solid ${lijn};border-radius:14px">
<tr><td style="padding:20px 28px;border-bottom:1px solid ${lijn}"><img src="${site}/img/logo-spes-nostra.png" alt="Spes Nostra Heule" height="40" style="height:40px;vertical-align:middle;margin-right:10px"><img src="${site}/img/logo-retail2sale.png" alt="Retail2Sale" height="40" style="height:40px;vertical-align:middle"></td></tr>
<tr><td style="padding:28px">
<div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${blauw}">${esc(o.eyebrow)}</div>
<h1 style="margin:6px 0 16px;font-size:24px;line-height:1.25;font-family:'Schibsted Grotesk',Arial,sans-serif">${esc(o.titel)}</h1>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6">${esc(o.aanspreking)},</p>
${o.alineas.map((a) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#3e4a5c">${esc(a)}</p>`).join("")}
${o.knop ? `<p style="margin:20px 0"><a href="${esc(o.knop.url)}" style="display:inline-block;background:${blauw};color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px;font-size:15px">${esc(o.knop.tekst)}</a></p>
<p style="margin:0 0 12px;font-size:12px;color:#5a6578">Werkt de knop niet? Kopieer dan deze link: ${esc(o.knop.url)}</p>` : ""}
${(o.na ?? []).map((a) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#3e4a5c">${esc(a)}</p>`).join("")}
<p style="margin:16px 0 0;font-size:14px;line-height:1.6">Met vriendelijke groeten,<br><span style="color:${blauw};font-weight:700">De stagebegeleiders Onthaal, organisatie en sales</span><br>${SCHOOL_CONTRACT.stagemail}</p>
</td></tr></table></td></tr></table></body></html>`;
}

const naamLln = (d: ContractData) => `${d.leerling.voornaam} ${d.leerling.naam}`;

/** Uitnodiging om te tekenen, voor een partij met een persoonlijke link. */
export function uitnodiging(d: ContractData, rol: Rol, url: string, site: string) {
  const g = effectief(d);
  const lln = naamLln(d);
  const periode = `${datumMidden(d.blok.start_datum)} tot en met ${datumMidden(d.blok.eind_datum)}`;
  const t: Record<Exclude<Rol, "directie">, { onderwerp: string; aan: string; alineas: string[] }> = {
    stagegever: {
      onderwerp: `Stagecontract ${lln}: graag aanvullen en ondertekenen`,
      aan: g.ondertekenaar ? `Beste ${g.ondertekenaar}` : "Beste stagegever",
      alineas: [
        `Het stagecontract voor ${lln} bij ${g.winkel_naam} (${periode}) staat klaar.`,
        "Via de knop hieronder leest u het contract, vult u de ontbrekende gegevens aan (zoals uw hoedanigheid en het paritair comité) en ondertekent u digitaal met uw muis, vinger of pen. Dat duurt ongeveer vijf minuten.",
        "Daarna tekenen de stagiair, een ouder en de school. U ontvangt het volledig ondertekende contract als pdf.",
      ],
    },
    stagiair: {
      onderwerp: `Je stagecontract bij ${g.winkel_naam}: onderteken je mee?`,
      aan: `Dag ${d.leerling.voornaam}`,
      alineas: [
        `${g.ondertekenaar || "De stagegever"} heeft je stagecontract bij ${g.winkel_naam} ondertekend. Nu is het jouw beurt.`,
        d.contract.meerderjarig
          ? "Lees het contract, vul je adres in en teken met je vinger of muis."
          : "Lees het contract, vul je adres in en teken met je vinger of muis. Daarna tekent een ouder of je voogd mee: dat kan meteen op hetzelfde toestel.",
      ],
    },
    ouder: {
      onderwerp: `Stagecontract van ${lln}: ondertekening door ouder of voogd`,
      aan: "Beste ouder of voogd",
      alineas: [
        `${lln} loopt stage bij ${g.winkel_naam} van ${periode}. Omdat ${d.leerling.voornaam} minderjarig is, tekent een ouder of voogd het stagecontract mee.`,
        "Via de knop hieronder leest u het contract en tekent u digitaal.",
      ],
    },
  };
  const x = t[rol as Exclude<Rol, "directie">];
  return {
    onderwerp: x.onderwerp,
    html: mailHtml(site, {
      eyebrow: `${d.blok.naam} · stagecontract`, titel: "Stagecontract ondertekenen", aanspreking: x.aan, alineas: x.alineas, knop: { tekst: "Contract openen", url },
      na: [`Uitleg stap voor stap: ${site}/handleiding/${rol === "stagegever" ? "stagegever" : "stagiair"}`],
    }),
  };
}

/** Client met volledige rechten (enkel op de server; enkel als SUPABASE_SERVICE_ROLE_KEY is ingesteld). */
export function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(SUPABASE_URL, key, { db: { schema: "stage" }, auth: { persistSession: false } });
}

/**
 * Na een handtekening via een link: de volgende partij uitnodigen (als dat kan) en de stagebegeleiding verwittigen.
 * Zonder mailkoppeling gebeurt er niets: de stagebegeleiding ziet de stand in het beheer.
 */
export async function naGetekend(d: ContractData, rol: Rol) {
  if (!mailIngesteld()) return;
  const site = await siteAdres();
  const nu = { ...d, partijen: d.partijen.map((p) => (p.rol === rol ? { ...p, getekend_op: new Date().toISOString() } : p)) };
  const admin = adminClient();
  if (rol === "stagegever" && admin) {
    const { data } = await admin.from("contract_partijen").select("rol, token, email").eq("dossier_id", d.dossier_id).in("rol", ["stagiair", "ouder"]);
    for (const p of data ?? []) {
      if (!p.email || !p.token) continue;
      const m = uitnodiging(nu, p.rol as Rol, `${site}/contract/${p.token}`, site);
      await verstuurMail({ aan: [p.email], onderwerp: m.onderwerp, html: m.html });
      await admin.from("contract_partijen").update({ uitgenodigd_op: new Date().toISOString() }).eq("dossier_id", d.dossier_id).eq("rol", p.rol);
      await admin.from("contract_log").insert({ dossier_id: d.dossier_id, wie: "platform", wat: `uitnodiging gemaild naar ${ROL_LABEL[p.rol as Rol].toLowerCase()} (${p.email})` });
    }
  }
  const rest = nodigeRollen(d.contract.meerderjarig).filter((r) => r !== "directie" && !getekend(nu, r));
  const lln = naamLln(d);
  const alineas =
    rol === "stagegever"
      ? [`${effectief(d).ondertekenaar || "De stagegever"} heeft het stagecontract van ${lln} ondertekend.`, admin ? "De stagiair (en de ouder) kregen automatisch hun link." : "Stuur nu de link naar de stagiair (en de ouder) vanuit het dossier."]
      : rest.length === 0
        ? [`Het stagecontract van ${lln} is ondertekend door alle partijen behalve de school. De directeur of een stagebegeleider kan nu tekenen in het dossier.`]
        : [`${ROL_LABEL[rol]} heeft het stagecontract van ${lln} ondertekend. Nog te tekenen: ${rest.map((r) => ROL_LABEL[r].toLowerCase()).join(", ")}.`];
  await verstuurMail({
    aan: [SCHOOL_CONTRACT.stagemail],
    onderwerp: `Contract ${lln}: ${rest.length === 0 && rol !== "stagegever" ? "klaar voor de handtekening van de school" : `${ROL_LABEL[rol].toLowerCase()} tekende`}`,
    html: mailHtml(site, { eyebrow: "Stagecontract", titel: "Stand van de ondertekening", aanspreking: "Beste stagebegeleider", alineas }),
  });
}

/** Volledig ondertekend contract naar alle partijen. */
export async function afgerondMailen(d: ContractData, emails: string[], pdf: Bijlage) {
  const site = await siteAdres();
  const lln = naamLln(d);
  await verstuurMail({
    aan: emails,
    cc: [SCHOOL_CONTRACT.stagemail],
    onderwerp: `Stagecontract ${lln} bij ${effectief(d).winkel_naam}: volledig ondertekend`,
    html: mailHtml(site, {
      eyebrow: `${d.blok.naam} · stagecontract`,
      titel: "Het stagecontract is ondertekend",
      aanspreking: "Beste",
      alineas: [
        `Alle partijen hebben het stagecontract van ${lln} ondertekend. In bijlage vindt u het volledige contract als pdf.`,
        "Volgende stap: de stagegever en de stagiair leggen samen het werkrooster vast vóór de eerste stagedag.",
      ],
    }),
    bijlagen: [pdf],
  });
}
