import { revalidatePath } from "next/cache";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Logo van een stageplaats opladen (png, jpg of webp, max. 1 MB). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return Response.json({ fout: "Geen toegang." }, { status: 403 });
  const f = (await req.formData()).get("logo");
  if (!(f instanceof File) || !f.size) return Response.json({ fout: "Kies een afbeelding." }, { status: 400 });
  if (!TYPES.includes(f.type)) return Response.json({ fout: "Enkel png, jpg of webp." }, { status: 400 });
  if (f.size > 1024 * 1024) return Response.json({ fout: "Het logo is te groot (maximum 1 MB)." }, { status: 400 });
  const hex = "\\x" + Buffer.from(await f.arrayBuffer()).toString("hex");
  const sb = await serverClient();
  const { error } = await sb.from("stageplaatsen").update({ logo: hex, logo_type: f.type, logo_op: new Date().toISOString() }).eq("id", id);
  if (error) return Response.json({ fout: "Opladen lukte niet." }, { status: 400 });
  revalidatePath(`/beheer/stageplaatsen/${id}`);
  revalidatePath("/");
  return Response.json({ ok: "Logo opgeladen." });
}

/** Logo bekijken in het beheer (ook als de plaats geen partner is). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return new Response("Geen toegang.", { status: 403 });
  const { data } = await (await serverClient()).from("stageplaatsen").select("logo, logo_type").eq("id", id).maybeSingle();
  const d = data as { logo: string | Uint8Array | null; logo_type: string | null } | null;
  if (!d?.logo || !d.logo_type) return new Response("Niet gevonden.", { status: 404 });
  // PostgREST geeft bytea terug als "\x" + hex.
  const bin = typeof d.logo === "string" ? Buffer.from(d.logo.replace(/^\\x/, ""), "hex") : Buffer.from(d.logo);
  return new Response(new Uint8Array(bin), { headers: { "Content-Type": d.logo_type, "Cache-Control": "private, max-age=600", "X-Content-Type-Options": "nosniff" } });
}
