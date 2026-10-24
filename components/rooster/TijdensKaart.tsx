import TijdensStage from "@/components/rooster/TijdensStage";
import { laadRooster } from "@/lib/werkrooster-server";
import { laadTijdens } from "@/lib/tijdens-server";
import { stand, standTekst } from "@/lib/tijdens";
import { vandaagIso } from "@/lib/beheer";
import type { serverClient } from "@/lib/supabase/server";

/** Afwezigheden en inhaalstage in het dossier: wettigen, en melden of plannen namens de school. */
export default async function TijdensKaart({ sb, dossierId, ikNaam, site }: { sb: Awaited<ReturnType<typeof serverClient>>; dossierId: string; ikNaam: string; site: string }) {
  const [ctx, t] = await Promise.all([laadRooster(sb, { dossier: dossierId }), laadTijdens(sb, { dossier: dossierId })]);
  if (!ctx || !t) return null;
  const vandaag = vandaagIso();
  const st = stand(t, ctx.blok, vandaag);
  const { data: p } = await sb.from("contract_partijen").select("token").eq("dossier_id", dossierId).eq("rol", "stagegever").maybeSingle();
  const pil = st.teBeoordelen.length ? "in" : st.verstreken ? "bad" : st.rest ? "warn" : st.per.size ? "ok" : "mut";
  return (
    <section className="bh-card">
      <div className="hd">
        <h2>Afwezigheden en inhaalstage</h2>
        <span className={`pill ${pil}`}>{st.teBeoordelen.length ? `${st.teBeoordelen.length} te beoordelen` : standTekst(st)}</span>
      </div>
      <div className="bd bh-stack">
        <p className="sm">
          Stagiair en stagegever melden afwezigheden en plannen inhaalstage{p?.token ? <> (stagegever via <a href={`${site}/rooster/${p.token}?tab=afwezig`} target="_blank" rel="noreferrer">de persoonlijke link</a>)</> : null}.
          Duid per afwezigheid aan of ze gewettigd is: een gewettigde afwezigheid moet niet worden ingehaald.
        </p>
        <TijdensStage key={`${t.afwezigheden.length}-${t.inhaal.length}`} ctx={ctx} t={t} sleutel={{ dossier: dossierId }} vandaag={vandaag} naamStart={ikNaam} />
      </div>
    </section>
  );
}
