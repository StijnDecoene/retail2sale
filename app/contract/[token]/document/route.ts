import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase/server";
import { documentOpladen } from "@/lib/documenten-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stagegever laadt een document op via zijn persoonlijke link. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await documentOpladen(await serverClient(), { token }, await req.formData());
  if (r.ok) { revalidatePath(`/contract/${token}`); revalidatePath("/beheer", "layout"); }
  return Response.json(r, { status: r.ok ? 200 : 400 });
}
