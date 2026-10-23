import "server-only";

/**
 * Mails versturen vanuit het Microsoft 365-postvak van de stagebegeleiding (Microsoft Graph, app-toegang).
 * Instellen in Vercel (Environment Variables):
 *   MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET  – app-registratie met toepassingsmachtiging Mail.Send
 *   MAIL_AFZENDER                                 – bv. retail2sale@snh.be
 * Zolang die ontbreken, staat versturen uit en kan je de mail enkel klaarzetten in je eigen mailprogramma.
 */
export function mailIngesteld() {
  return !!(process.env.MS_TENANT_ID && process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET && process.env.MAIL_AFZENDER);
}
export const mailAfzender = () => process.env.MAIL_AFZENDER || "retail2sale@snh.be";

let token: { waarde: string; tot: number } | null = null;
async function haalToken(): Promise<string> {
  if (token && token.tot > Date.now() + 60_000) return token.waarde;
  const r = await fetch(`https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID!,
      client_secret: process.env.MS_CLIENT_SECRET!,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  const j = (await r.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!r.ok || !j.access_token) throw new Error(`Aanmelden bij Microsoft lukte niet: ${j.error_description ?? r.status}`);
  token = { waarde: j.access_token, tot: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return token.waarde;
}

export type Bijlage = { naam: string; type: string; inhoud: Buffer };

export async function verstuurMail(m: { aan: string[]; cc?: string[]; onderwerp: string; html: string; bijlagen?: Bijlage[] }) {
  if (!mailIngesteld()) throw new Error("Mail versturen is nog niet ingesteld.");
  const adres = (a: string) => ({ emailAddress: { address: a } });
  const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailAfzender())}/sendMail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await haalToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject: m.onderwerp,
        body: { contentType: "HTML", content: m.html },
        toRecipients: m.aan.map(adres),
        ccRecipients: (m.cc ?? []).map(adres),
        replyTo: [adres(mailAfzender())],
        attachments: (m.bijlagen ?? []).map((b) => ({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: b.naam,
          contentType: b.type,
          contentBytes: b.inhoud.toString("base64"),
        })),
      },
      saveToSentItems: true,
    }),
  });
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`Versturen lukte niet: ${j.error?.message ?? r.status}`);
  }
}
