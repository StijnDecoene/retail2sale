import { type NextRequest } from "next/server";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import { contractBeheer, tekstHash } from "@/lib/contract-server";
import { contractPdf } from "@/lib/contract-pdf";

/** Het contract als pdf voor begeleiders (ook als het nog niet volledig getekend is). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return new Response("Geen toegang", { status: 403 });
  const { id } = await params;
  const d = await contractBeheer(await serverClient(), id);
  if (!d) return new Response("Er is nog geen contract voor dit dossier.", { status: 404 });
  const pdf = await contractPdf(d, d.contract.afgerond_op ? tekstHash(d) : undefined);
  const naam = `Stagecontract ${d.leerling.voornaam} ${d.leerling.naam}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${req.nextUrl.searchParams.get("download") ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(naam)}`,
      "Cache-Control": "no-store",
    },
  });
}
