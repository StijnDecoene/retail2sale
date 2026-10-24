import { notFound } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import type { Blok } from "@/lib/beheer";
import { laadBezoeken } from "@/lib/bezoeken-server";
import RouteDetail from "@/components/bezoeken/RouteDetail";

export const metadata = { title: "Route stagebezoeken" };

export default async function RoutePagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await serverClient();
  const { data: r } = await sb.from("bezoek_routes").select("blok_id").eq("id", id).maybeSingle();
  if (!r) notFound();
  const { data: b } = await sb.from("blokken").select("*").eq("id", r.blok_id).single();
  const d = await laadBezoeken(sb, b as Blok);
  return <RouteDetail d={d} id={id} />;
}
