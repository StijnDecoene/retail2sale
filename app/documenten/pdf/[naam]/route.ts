import { serverClient } from "@/lib/supabase/server";
import { schooljaarVan, vandaagIso } from "@/lib/beheer";
import { FEEDBACK, MENTOR, SCHOOL, ZELF_ONTHAAL, ZELF_SALES, type Formulier } from "@/lib/evaluaties";
import { laadCatalogus } from "@/lib/contract-server";
import { contractPdf } from "@/lib/contract-pdf";
import type { ContractData } from "@/lib/contract";
import { activiteitenAntwoord, formulierAntwoord, kalenderAntwoord, pdfAntwoord, type Kalender } from "@/lib/documenten-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORMULIEREN: Record<string, [Formulier, string]> = {
  "evaluatie-stagementor": [MENTOR, "Evaluatie stagementor.pdf"],
  "bezoekformulier": [SCHOOL, "Bezoekformulier stagebegeleider.pdf"],
  "zelfevaluatie-sales": [ZELF_SALES, "Zelfevaluatie sales.pdf"],
  "zelfevaluatie-onthaal": [ZELF_ONTHAAL, "Zelfevaluatie onthaal en organisatie.pdf"],
  "feedback-stagegever": [FEEDBACK, "Feedback stagegever.pdf"],
};

async function kalender(sj: string): Promise<Kalender> {
  const { data } = await (await serverClient()).rpc("publieke_kalender", { p_schooljaar: sj });
  return (data as Kalender | null) ?? { blokken: [], uitzonderingen: [] };
}

/** Pdf's voor de documentenpagina: blanco formulieren, activiteitenlijst, kalender en een voorbeeldcontract. */
export async function GET(_: Request, { params }: { params: Promise<{ naam: string }> }) {
  const { naam } = await params;
  if (FORMULIEREN[naam]) return formulierAntwoord(...FORMULIEREN[naam]);
  if (naam === "activiteitenlijst") return activiteitenAntwoord(await laadCatalogus(await serverClient()));
  const sj = schooljaarVan();
  if (naam === "kalender") return kalenderAntwoord(await kalender(sj), sj);
  if (naam === "stagecontract-voorbeeld") {
    const k = await kalender(sj);
    const vandaag = vandaagIso();
    const b = k.blokken.find((x) => x.eind_datum >= vandaag) ?? k.blokken.at(-1);
    const sb = await serverClient();
    const d: ContractData = {
      dossier_id: "voorbeeld",
      leerling: { voornaam: "Voornaam", naam: "Naam (voorbeeld)", klas: "5OS1", email: null, gsm: null },
      blok: b ? { naam: b.naam, code: "b2", schooljaar: sj, start_datum: b.start_datum, eind_datum: b.eind_datum, uren: b.uren, uren_per_week: b.uren_per_week }
        : { naam: "Blokstage", code: "b2", schooljaar: sj, start_datum: vandaag, eind_datum: vandaag, uren: 120, uren_per_week: 24 },
      uitzonderingen: b ? k.uitzonderingen.filter((u) => u.blok_id === b.id) : [],
      aanvraag: { bedrijf: { naam: "Voorbeeldwinkel", straat: "Marktstraat 1", postcode: "8500", gemeente: "Kortrijk", soort: "sales" }, mentor: { naam: "Naam mentor" } },
      team: [{ naam: "Fien Claeys", telefoon: "0498 64 48 89", email: "retail2sale@snh.be" }, { naam: "Stijn Decoene", telefoon: "0479 28 85 07", email: "retail2sale@snh.be" }],
      contract: { gegevens: {}, meerderjarig: false, afgerond_op: null },
      partijen: [],
      catalogus: await laadCatalogus(sb),
    };
    return pdfAntwoord(await contractPdf(d), "Stagecontract voorbeeld.pdf");
  }
  return new Response("Niet gevonden.", { status: 404 });
}
