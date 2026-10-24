import Link from "next/link";
import { notFound } from "next/navigation";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import { laadEvaluatieSchool } from "@/lib/evaluaties-server";
import { formulier, type Soort } from "@/lib/evaluaties";
import EvaluatieForm from "@/components/evaluatie/EvaluatieForm";

export const metadata = { title: "Evaluatie" };
const TITEL: Record<Soort, string> = { school: "Bezoekformulier stagebegeleider", mentor: "Evaluatie stagementor", zelf: "Zelfevaluatie", verslag: "Stageverslag", feedback: "Feedback van de stagegever" };

export default async function EvaluatiePagina({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ soort?: string; terug?: string }> }) {
  const { id } = await params;
  const { soort: s, terug } = await searchParams;
  const soort = (["school", "mentor", "zelf", "feedback"].includes(s ?? "") ? s : "school") as Soort;
  const sb = await serverClient();
  const ctx = await laadEvaluatieSchool(sb, id);
  if (!ctx) notFound();
  const { begeleider } = await huidigeGebruiker();
  const e = ctx.evaluaties.find((x) => x.soort === soort);
  const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
  const start = e?.antwoorden ?? (soort === "school" ? { s0datum: vandaag } : {});
  return (
    <>
      <p className="bh-kruimel"><Link href={terug && terug.startsWith("/beheer/") ? terug : `/beheer/dossiers/${id}`}>← Terug</Link></p>
      <header className="bh-top">
        <div>
          <h1>{TITEL[soort]}</h1>
          <p className="sub">{ctx.leerling.voornaam} {ctx.leerling.naam} ({ctx.leerling.klas}) · {ctx.winkel ?? "geen stageplaats"} · {ctx.blok.naam}{ctx.stage ? ` · ${ctx.stage === "sales" ? "sales" : "onthaal"}` : ""}</p>
        </div>
        <nav className="bh-seg" aria-label="Evaluatie">
          {(["school", "mentor", "zelf", "feedback"] as Soort[]).map((x) => (
            <Link key={x} href={`/beheer/dossiers/${id}/evaluatie?soort=${x}`} className={x === soort ? "on" : undefined}>
              {({ school: "Bezoek", mentor: "Mentor", zelf: "Zelfevaluatie", verslag: "Verslag", feedback: "Feedback" } as const)[x]}{ctx.evaluaties.find((y) => y.soort === x)?.status === "ingediend" ? " ✓" : ""}
            </Link>
          ))}
        </nav>
      </header>
      {soort !== "school" && (
        <p className="bh-melding">
          {soort === "mentor" ? "De mentor vult dit in via zijn persoonlijke link (tabblad Evaluatie). Hier kan je een evaluatie op papier overnemen of iets verbeteren." : soort === "feedback" ? "De stagegever vult dit in via zijn persoonlijke link (tabblad Afronding). De stagiair ziet dit niet." : "De stagiair vult dit in het portaal in. Hier kan je meekijken of iets verbeteren."}
        </p>
      )}
      <EvaluatieForm
        key={e?.gewijzigd_op ?? "nieuw"}
        f={formulier(soort, ctx.stage)}
        start={start}
        ingediend={e?.status === "ingediend"}
        naamStart={e?.naam ?? (soort === "school" ? begeleider?.naam ?? "" : soort === "mentor" ? ctx.mentor ?? "" : `${ctx.leerling.voornaam} ${ctx.leerling.naam}`)}
        naamVraag={soort === "mentor" ? "Naam stagementor" : soort === "school" ? "Stagebegeleider" : undefined}
        schoolDossier={id}
      />
    </>
  );
}
