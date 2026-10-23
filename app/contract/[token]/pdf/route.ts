import { type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { contractViaLink } from "@/lib/contract-server";
import { contractPdf } from "@/lib/contract-pdf";

/** Het contract als pdf, voor wie de persoonlijke link heeft. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await contractViaLink(await serverClient(), token);
  if (!d) return new Response("Deze link is niet geldig.", { status: 404 });
  const pdf = await contractPdf(d);
  const naam = `Stagecontract ${d.leerling.voornaam} ${d.leerling.naam}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(naam)}`, "Cache-Control": "no-store" },
  });
}
