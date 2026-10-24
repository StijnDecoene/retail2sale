import { serverClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Logo van een partner (enkel als die op de homepagina mag). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await (await serverClient()).rpc("partner_logo", { p_id: id });
  const d = data as { type: string; inhoud: string } | null;
  if (!d?.inhoud) return new Response("Niet gevonden.", { status: 404 });
  return new Response(new Uint8Array(Buffer.from(d.inhoud, "base64")), {
    headers: { "Content-Type": d.type, "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" },
  });
}
