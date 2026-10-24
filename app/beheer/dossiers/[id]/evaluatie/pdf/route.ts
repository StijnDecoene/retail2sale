import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import { laadEvaluatieSchool } from "@/lib/evaluaties-server";
import { evaluatiePdf, evaluatiePdfNaam } from "@/lib/evaluatie-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return new Response("Geen toegang.", { status: 403 });
  const ctx = await laadEvaluatieSchool(await serverClient(), id);
  if (!ctx) return new Response("Niet gevonden.", { status: 404 });
  const metZelf = new URL(req.url).searchParams.get("zelf") === "1";
  const pdf = await evaluatiePdf(ctx, metZelf ? ["mentor", "school", "zelf"] : ["mentor", "school"]);
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${evaluatiePdfNaam(ctx)}"`, "Cache-Control": "no-store" } });
}
