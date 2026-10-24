import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import type { Blok } from "@/lib/beheer";
import { laadBezoeken } from "@/lib/bezoeken-server";
import { routePdf } from "@/lib/bezoeken-pdf";
import { routeKleur } from "@/lib/bezoeken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return new Response("Geen toegang.", { status: 403 });
  const sb = await serverClient();
  const { data: r } = await sb.from("bezoek_routes").select("blok_id").eq("id", id).maybeSingle();
  if (!r) return new Response("Route niet gevonden.", { status: 404 });
  const { data: b } = await sb.from("blokken").select("*").eq("id", r.blok_id).single();
  const d = await laadBezoeken(sb, b as Blok);
  const route = d.routes.find((x) => x.id === id)!;
  const pdf = await routePdf(d, route, routeKleur(route));
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Route ${route.nr}.pdf"`, "Cache-Control": "no-store" } });
}
