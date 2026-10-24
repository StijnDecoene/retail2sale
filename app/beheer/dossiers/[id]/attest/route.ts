import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import { vandaagIso } from "@/lib/beheer";
import { afrondingVoorDossiers, attestBasis, type AttestGegevens } from "@/lib/afronding-server";
import { attestAntwoord } from "@/lib/attest-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stageattest: het vastgelegde attest, of een voorbeeld (CONCEPT) zolang de stage niet afgerond is. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return new Response("Geen toegang.", { status: 403 });
  const sb = await serverClient();
  const { data } = await sb.from("afrondingen").select("attest").eq("dossier_id", id).maybeSingle();
  if (data?.attest && (data.attest as AttestGegevens).code) return attestAntwoord(data.attest as AttestGegevens);
  const b = await attestBasis(sb, id);
  if (!b) return new Response("Niet gevonden.", { status: 404 });
  const vandaag = vandaagIso();
  const st = (await afrondingVoorDossiers(sb, [id], b.blok, vandaag)).per.get(id)!;
  return attestAntwoord({
    code: "CONCEPT", datum: vandaag, leerling: b.leerling, blok: b.blok, stage: b.stage, winkel: b.winkel, adres: b.adres, mentor: b.mentor, u: st.u, team: b.team, directeur: b.directeur,
  });
}
