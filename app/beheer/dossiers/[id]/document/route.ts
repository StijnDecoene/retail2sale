import { revalidatePath } from "next/cache";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import { documentOpladen } from "@/lib/documenten-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** School laadt een document op (bv. een risicoanalyse die per mail of op papier binnenkwam). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return Response.json({ fout: "Geen toegang." }, { status: 403 });
  const fd = await req.formData();
  fd.set("naam", begeleider.naam);
  const r = await documentOpladen(await serverClient(), { dossier: id }, fd);
  if (r.ok) revalidatePath(`/beheer/dossiers/${id}`);
  return Response.json(r, { status: r.ok ? 200 : 400 });
}
