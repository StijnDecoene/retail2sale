import { handleidingAntwoord } from "@/lib/handleiding-pdf";
import { WIE, type Wie } from "@/lib/handleidingen";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ wie: string }> }) {
  const { wie } = await params;
  if (!WIE.includes(wie as Wie)) return new Response("Niet gevonden.", { status: 404 });
  return handleidingAntwoord(wie as Wie);
}
