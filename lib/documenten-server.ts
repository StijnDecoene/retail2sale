import "server-only";
import type { serverClient } from "@/lib/supabase/server";
import { DOC_FOUT, DOC_MAX, DOC_TYPES, type DocRij, type DocSoort } from "@/lib/documenten";

type Sb = Awaited<ReturnType<typeof serverClient>>;
export type DocSleutel = { token?: string | null; dossier?: string | null };
const p = (k: DocSleutel) => ({ p_token: k.token ?? null, p_dossier: k.token ? null : (k.dossier ?? null) });

export async function documentenLijst(sb: Sb, k: DocSleutel): Promise<DocRij[] | null> {
  const { data, error } = await sb.rpc("documenten_lijst", p(k));
  if (error || !data) return null;
  return data as DocRij[];
}

/** Bestand uit een formulier opladen. */
export async function documentOpladen(sb: Sb, k: DocSleutel, fd: FormData): Promise<{ ok?: string; fout?: string }> {
  const f = fd.get("bestand");
  const soort = String(fd.get("soort") ?? "") as DocSoort;
  const naam = String(fd.get("naam") ?? "").trim();
  if (!(f instanceof File) || f.size === 0) return { fout: "Kies een bestand." };
  if (f.size > DOC_MAX) return { fout: DOC_FOUT.grootte };
  let type = f.type;
  if (!DOC_TYPES[type]) {
    const ext = f.name.split(".").pop()?.toLowerCase();
    type = ext === "pdf" ? "application/pdf" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : ext === "heic" ? "image/heic" : ext === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : ext === "doc" ? "application/msword" : "";
  }
  if (!DOC_TYPES[type]) return { fout: DOC_FOUT.type };
  const inhoud = Buffer.from(await f.arrayBuffer()).toString("base64");
  const { data, error } = await sb.rpc("document_opladen", { ...p(k), p_soort: soort, p_naam: f.name.slice(0, 200), p_type: type, p_inhoud: inhoud, p_door_naam: naam.slice(0, 200) || null });
  if (error) return { fout: "Opladen lukte niet. Probeer opnieuw." };
  if (data !== "ok") return { fout: DOC_FOUT[String(data)] ?? "Opladen lukte niet." };
  return { ok: "Opgeladen. Bedankt!" };
}

/** Bestand als download-antwoord. */
export async function documentAntwoord(sb: Sb, k: DocSleutel, id: string) {
  const { data } = await sb.rpc("document_ophalen", { ...p(k), p_id: id });
  const d = data as { naam: string; type: string; inhoud: string } | null;
  if (!d) return new Response("Niet gevonden.", { status: 404 });
  return new Response(new Uint8Array(Buffer.from(d.inhoud, "base64")), {
    headers: { "Content-Type": d.type, "Content-Disposition": `inline; filename="${encodeURIComponent(d.naam)}"`, "Cache-Control": "private, no-store" },
  });
}
