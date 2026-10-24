import { serverClient } from "@/lib/supabase/server";
import { documentAntwoord } from "@/lib/documenten-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  return documentAntwoord(await serverClient(), { token }, id);
}
