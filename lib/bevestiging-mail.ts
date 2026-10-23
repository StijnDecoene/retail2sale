// Mail bij de goedkeuring van een aanvraag: onderwerp, HTML (huisstijl) en platte tekst.
import {
  type Voor, SCHOOL, aanspreking, adresBedrijf, datumMid, naamBedrijf, naamLeerling, onderwerp, soortStage, teksten, type BevestigingData,
} from "@/lib/bevestiging";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Ontvangers: stagegever (mentor en eventueel ondertekenaar) en stagiair; de stagebegeleiding in kopie. */
export function ontvangers(b: BevestigingData, voor: Voor = "stagegever") {
  const lijst = voor === "stagiair"
    ? [b.leerling.email]
    : [b.aanvraag.mentor?.email, b.aanvraag.verantwoordelijke?.zelfde === false ? b.aanvraag.verantwoordelijke?.email : null];
  const aan = lijst.map((x) => (x ?? "").trim().toLowerCase()).filter(Boolean);
  return { aan: [...new Set(aan)], cc: voor === "stagiair" ? [] : [SCHOOL.stagemail] };
}

/**
 * Bevestigingsmail. De versie voor de stagegever bevat de persoonlijke contractlink;
 * de versie voor de stagiair niet (die link is enkel voor de stagegever).
 */
export function bevestigingMail(b0: BevestigingData, site: string, voor: Voor = "stagegever") {
  const b = voor === "stagiair" ? { ...b0, contractLink: null } : b0;
  const t = teksten(b, voor);
  const m = b.aanvraag.mentor ?? {};
  const blauw = "#1d5baa", ink = "#0e1a2b", grijs = "#5a6578", lijn = "#e3e7ee";
  const rij = (l: string, w?: string | null) =>
    w ? `<tr><td style="padding:3px 12px 3px 0;color:${grijs};font-size:13px;white-space:nowrap;vertical-align:top">${esc(l)}</td><td style="padding:3px 0;font-size:14px;color:${ink}">${esc(w)}</td></tr>` : "";
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(onderwerp(b))}</title></head>
<body style="margin:0;background:#f4f6f9;font-family:Figtree,'Segoe UI',Arial,sans-serif;color:${ink}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid ${lijn};border-radius:14px;overflow:hidden">
  <tr><td style="padding:20px 28px;border-bottom:1px solid ${lijn}">
    <img src="${site}/img/logo-spes-nostra.png" alt="Spes Nostra Heule" height="40" style="height:40px;vertical-align:middle;margin-right:10px">
    <img src="${site}/img/logo-retail2sale.png" alt="Retail2Sale" height="40" style="height:40px;vertical-align:middle">
  </td></tr>
  <tr><td style="padding:28px 28px 8px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${blauw}">${esc(b.blok.naam)} · schooljaar ${esc(b.schooljaar)}</div>
    <h1 style="margin:6px 0 16px;font-size:26px;line-height:1.2;font-family:'Schibsted Grotesk',Arial,sans-serif">De stage ligt vast</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6">${esc(aanspreking(b, voor))},</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#3e4a5c">${esc(t.intro)}</p>
    <div style="margin:16px 0;padding:14px 16px;background:#e5f3ec;border-left:4px solid #1e7a4f;border-radius:6px;font-size:15px;line-height:1.5;font-weight:600">${esc(t.toestemming)}</div>
    <p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#3e4a5c">${esc(t.periode)}</p>
    <ul style="margin:0 0 12px;padding-left:20px;font-size:15px;line-height:1.6;color:#3e4a5c">${t.planning.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
  </td></tr>
  <tr><td style="padding:4px 28px 8px">
    <h2 style="margin:8px 0 10px;font-size:17px;font-family:'Schibsted Grotesk',Arial,sans-serif">Wat volgt</h2>
    ${t.stappen.map((x, i) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:10px"><tr>
      <td style="vertical-align:top;padding-right:10px"><div style="width:24px;height:24px;border-radius:12px;background:${blauw};color:#fff;font-size:13px;font-weight:700;text-align:center;line-height:24px">${i + 1}</div></td>
      <td style="font-size:14px;line-height:1.55;color:#3e4a5c"><b style="color:${ink}">${esc(x.t)}</b><br>${esc(x.x)}</td></tr></table>`).join("")}
  </td></tr>
  ${b.contractLink ? `<tr><td style="padding:4px 28px 12px">
    <a href="${esc(b.contractLink)}" style="display:inline-block;background:${blauw};color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px;font-size:15px">Stagecontract invullen en ondertekenen</a>
    <p style="margin:8px 0 0;font-size:12px;color:${grijs}">Deze link is persoonlijk voor de stagegever. Werkt de knop niet? Kopieer dan: ${esc(b.contractLink)}</p>
  </td></tr>` : ""}
  <tr><td style="padding:4px 28px 8px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${lijn};border-radius:10px"><tr><td style="padding:14px 16px">
      <table role="presentation" cellpadding="0" cellspacing="0">
        ${rij("Stagiair", `${naamLeerling(b)} (${b.leerling.klas})`)}
        ${rij("Gsm stagiair", b.leerling.gsm)}
        ${rij("Stagebedrijf", naamBedrijf(b))}
        ${rij("Adres", adresBedrijf(b))}
        ${rij("Soort stage", soortStage(b))}
        ${rij("Stagementor", [m.naam, m.functie].filter(Boolean).join(", "))}
        ${rij("Eerste stagedag", `${datumMid(b.blok.start_datum)}${b.aanvraag.werkvloer?.startuur ? ` om ${b.aanvraag.werkvloer.startuur}` : ""}`)}
        ${rij("Begeleider school", b.begeleider?.naam)}
      </table>
    </td></tr></table>
    <p style="margin:12px 0 0;font-size:13px;color:${grijs}">In bijlage: de bevestiging met alle gegevens en de stagekalender (pdf) en de infobrochure.</p>
    <p style="margin:8px 0 0;font-size:14px;color:#3e4a5c">${voor === "stagiair" ? "Hoe het verder gaat, lees je in de" : "Hoe het verder gaat, leest u in de"} <a href="${site}/handleiding/${voor === "stagiair" ? "stagiair" : "stagegever"}" style="color:${blauw};font-weight:700">handleiding voor ${voor === "stagiair" ? "stagiairs" : "stagegevers"}</a>.</p>
  </td></tr>
  <tr><td style="padding:16px 28px 26px">
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#3e4a5c">${esc(t.vragen)}</p>
    <p style="margin:0;font-size:14px;line-height:1.6">Met vriendelijke groeten,<br>
    ${b.team.map((g) => `<b>${esc(g.naam)}</b>${g.telefoon ? ` · ${esc(g.telefoon)}` : ""}`).join("<br>")}<br>
    <span style="color:${blauw};font-weight:700">Stagebegeleiders Onthaal, organisatie en sales</span></p>
  </td></tr>
  <tr><td style="padding:14px 28px;background:#f8fafc;border-top:1px solid ${lijn};font-size:12px;color:${grijs};line-height:1.5">
    ${esc(SCHOOL.naam)} · ${esc(SCHOOL.straat)}, ${esc(SCHOOL.gemeente)} · ${esc(SCHOOL.telefoon)} · <a href="mailto:${SCHOOL.stagemail}" style="color:${blauw}">${SCHOOL.stagemail}</a>
  </td></tr>
</table></td></tr></table></body></html>`;

  const tekst = [
    `${aanspreking(b, voor)},`, "", t.intro, "", t.toestemming, "", t.periode, ...t.planning.map((x) => `- ${x}`), "",
    "Wat volgt", ...t.stappen.map((x, i) => `${i + 1}. ${x.t}: ${x.x}`), "",
    ...(b.contractLink ? [`Stagecontract invullen en ondertekenen (persoonlijke link voor de stagegever): ${b.contractLink}`, ""] : []),
    `Stagiair: ${naamLeerling(b)} (${b.leerling.klas})${b.leerling.gsm ? `, ${b.leerling.gsm}` : ""}`,
    `Stagebedrijf: ${naamBedrijf(b)}, ${adresBedrijf(b)}`,
    `Stagementor: ${[m.naam, m.functie].filter(Boolean).join(", ")}`,
    `Eerste stagedag: ${datumMid(b.blok.start_datum)}${b.aanvraag.werkvloer?.startuur ? ` om ${b.aanvraag.werkvloer.startuur}` : ""}`, "",
    `Handleiding: ${site}/handleiding/${voor === "stagiair" ? "stagiair" : "stagegever"}`, "",
    t.vragen, "", "Met vriendelijke groeten,", ...b.team.map((g) => `${g.naam}${g.telefoon ? ` - ${g.telefoon}` : ""}`), "Stagebegeleiders Onthaal, organisatie en sales",
  ].join("\n");

  return { onderwerp: onderwerp(b), html, tekst, ...ontvangers(b, voor) };
}
