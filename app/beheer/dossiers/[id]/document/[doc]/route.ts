import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import { documentAntwoord } from "@/lib/documenten-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string; doc: string }> }) {
  const { id, doc } = await params;
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return new Response("Geen toegang.", { status: 403 });
  return documentAntwoord(await serverClient(), { dossier: id }, doc);
}
