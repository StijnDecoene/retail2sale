import { serverClient } from "@/lib/supabase/server";
import { laadRooster } from "@/lib/werkrooster-server";
import { roosterPdfAntwoord } from "@/lib/werkrooster-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Werkrooster als pdf voor de stagiair (eigen dossier) of de stagebegeleiding. */
export async function GET(req: Request) {
  const dossier = new URL(req.url).searchParams.get("dossier");
  if (!dossier) return new Response("Geen dossier.", { status: 400 });
  return roosterPdfAntwoord(await laadRooster(await serverClient(), { dossier }));
}
