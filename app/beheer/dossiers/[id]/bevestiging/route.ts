import { type NextRequest } from "next/server";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import { laadBevestiging } from "@/lib/bevestiging-server";
import { bevestigingPdf } from "@/lib/bevestiging-pdf";
import { bevestigingMail } from "@/lib/bevestiging-mail";
import { naamLeerling } from "@/lib/bevestiging";
import { pdfNaam } from "@/lib/bevestiging-versturen";

/** Bevestiging van een dossier: ?soort=pdf (standaard) of ?soort=mail (voorbeeld van de mail). Enkel voor begeleiders. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return new Response("Geen toegang", { status: 403 });
  const { id } = await params;
  const b = await laadBevestiging(await serverClient(), id, req.nextUrl.origin);
  if (!b) return new Response("Er is nog geen aanvraag voor dit dossier.", { status: 404 });

  if (req.nextUrl.searchParams.get("soort") === "mail") {
    const m = bevestigingMail(b, req.nextUrl.origin, req.nextUrl.searchParams.get("voor") === "stagiair" ? "stagiair" : "stagegever");
    return new Response(m.html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }
  const pdf = await bevestigingPdf(b);
  const naam = pdfNaam(naamLeerling(b));
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${req.nextUrl.searchParams.get("download") ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(naam)}`,
      "Cache-Control": "no-store",
    },
  });
}
