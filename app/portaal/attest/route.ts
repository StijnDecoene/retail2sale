import { serverClient } from "@/lib/supabase/server";
import { laadEvaluatie } from "@/lib/evaluaties-server";
import { attestAntwoord } from "@/lib/attest-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stageattest voor de stagiair (eigen dossier), zodra de stage afgerond is. */
export async function GET(req: Request) {
  const dossier = new URL(req.url).searchParams.get("dossier");
  if (!dossier) return new Response("Geen dossier.", { status: 400 });
  const ctx = await laadEvaluatie(await serverClient(), { dossier });
  return attestAntwoord(ctx?.afronding?.attest?.code ? ctx.afronding.attest : null);
}
