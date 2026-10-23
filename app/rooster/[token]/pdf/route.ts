import { serverClient } from "@/lib/supabase/server";
import { laadRooster } from "@/lib/werkrooster-server";
import { roosterPdfAntwoord } from "@/lib/werkrooster-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return roosterPdfAntwoord(await laadRooster(await serverClient(), { token }));
}
