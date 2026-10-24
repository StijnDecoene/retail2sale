import Link from "next/link";
import { laadEvaluatieSchool } from "@/lib/evaluaties-server";
import { formulier, puntVoorstel, score, type Soort } from "@/lib/evaluaties";
import type { serverClient } from "@/lib/supabase/server";
import EvaluatieBeslissing from "./EvaluatieBeslissing";

const NAAM: Record<Soort, string> = { mentor: "Stagementor", school: "Stagebezoek", zelf: "Zelfevaluatie", verslag: "Stageverslag", feedback: "Feedback stagegever" };

/** Evaluaties in het dossier: stand van de drie formulieren, puntvoorstel, eindpunt en openstellen. */
export default async function EvaluatieKaart({ sb, dossierId }: { sb: Awaited<ReturnType<typeof serverClient>>; dossierId: string }) {
  const ctx = await laadEvaluatieSchool(sb, dossierId);
  if (!ctx) return null;
  const p = ctx.punten!;
  const sc = (s: Soort) => { const e = ctx.evaluaties.find((x) => x.soort === s && x.status === "ingediend"); return e ? score(formulier(s, ctx.stage), e.antwoorden, p) : null; };
  const voorstel = puntVoorstel(sc("mentor"), sc("school"), p);
  return (
    <section className="bh-card">
      <div className="hd">
        <h2>Evaluatie</h2>
        <span className={`pill ${ctx.vrijgegeven ? "ok" : "mut"}`}>{ctx.vrijgegeven ? "Opengesteld voor de stagiair" : "Nog niet opengesteld"}</span>
      </div>
      <div className="bd bh-stack">
        <div className="ev-status">
          {(["mentor", "school", "zelf"] as Soort[]).map((s) => {
            const e = ctx.evaluaties.find((x) => x.soort === s);
            const v = s !== "zelf" ? sc(s) : null;
            return (
              <div key={s}>
                <b>{NAAM[s]}</b>
                <span className={`pill ${e?.status === "ingediend" ? "ok" : e ? "warn" : "mut"}`}>{e?.status === "ingediend" ? "Ingediend" : e ? "Concept" : "Nog niet ingevuld"}</span>
                {v !== null && <small>score {v.toFixed(1)}/10</small>}
                {e?.naam && <small>{e.naam}</small>}
                <Link className="bh-btn sm" href={`/beheer/dossiers/${dossierId}/evaluatie?soort=${s}`}>{s === "school" ? (e ? "Bezoekformulier openen" : "Bezoekformulier invullen") : "Bekijken"}</Link>
              </div>
            );
          })}
        </div>
        <EvaluatieBeslissing dossierId={dossierId} voorstel={voorstel} eindpunt={ctx.eindpunt} opmerking={ctx.opmerking ?? ""} op={p.op} vrijgegeven={ctx.vrijgegeven} heeftEvaluatie={ctx.evaluaties.some((e) => e.status === "ingediend" && (e.soort === "mentor" || e.soort === "school"))} />
        <div className="bh-acties">
          <a className="bh-btn" href={`/beheer/dossiers/${dossierId}/evaluatie/pdf`} target="_blank" rel="noreferrer">Pdf (mentor en bezoek)</a>
          <a className="bh-btn" href={`/beheer/dossiers/${dossierId}/evaluatie/pdf?zelf=1`} target="_blank" rel="noreferrer">Pdf met zelfevaluatie</a>
        </div>
      </div>
    </section>
  );
}
