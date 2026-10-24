import type { Metadata } from "next";
import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { laadRooster } from "@/lib/werkrooster-server";
import { datumMidden } from "@/lib/contract";
import RoosterEditor from "@/components/rooster/RoosterEditor";
import TijdensStage from "@/components/rooster/TijdensStage";
import { laadTijdens } from "@/lib/tijdens-server";
import { stand } from "@/lib/tijdens";
import { vandaagIso } from "@/lib/beheer";
import { laadEvaluatie } from "@/lib/evaluaties-server";
import { formulier } from "@/lib/evaluaties";
import EvaluatieForm from "@/components/evaluatie/EvaluatieForm";
import NuTeDoen from "@/components/stagegever/NuTeDoen";
import { laadOverzicht } from "@/lib/stagegever-server";
import { taken } from "@/lib/stagegever";

export const metadata: Metadata = { title: "Werkrooster", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function RoosterPagina({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { token } = await params;
  const { tab } = await searchParams;
  const sb = await serverClient();
  const [ctx, t, ov] = await Promise.all([laadRooster(sb, { token }), laadTijdens(sb, { token }), laadOverzicht(sb, token)]);
  const vandaag = vandaagIso();
  const st = ctx && t ? stand(t, ctx.blok, vandaag) : null;
  const afw = tab === "afwezig";
  const af = tab === "afronding";
  const ev = (tab === "evaluatie" || af) && ctx ? await laadEvaluatie(sb, { token }) : null;
  const titel = af ? "Afronding" : ev ? "Evaluatie" : afw ? "Afwezigheden en inhaalstage" : "Werkrooster";
  const ik = ov?.stagiairs.find((x) => x.token === token);
  const todo = ik ? taken(ik, vandaag) : [];
  const fb = ev?.evaluaties.find((e) => e.soort === "feedback");
  return (
    <div className="pt">
      <header className="pt-balk">
        <Link href="/" className="pt-logos" aria-label="Retail2Sale">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-spes-nostra.png" alt="Spes Nostra Heule" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-retail2sale.png" alt="Retail2Sale" />
        </Link>
        <b className="pt-merk">{af ? "Afronding" : ev ? "Evaluatie" : afw ? "Afwezigheden" : "Werkrooster"}</b>
      </header>
      <main className="pt-main">
        {!ctx ? (
          <section className="pt-leeg">
            <h1>Deze link werkt niet</h1>
            <p>De link is onvolledig of niet meer geldig. Gebruik de link uit de mail met het stagecontract, of vraag een nieuwe link aan de stagebegeleiding via retail2sale@snh.be.</p>
          </section>
        ) : (
          <>
            <header className="pt-kop">
              <div>
                <span className="eyebrow"><span className="streep" />{ctx.blok.naam} · Onthaal, organisatie en sales</span>
                <h1>{titel}</h1>
                <p className="sub">
                  {ctx.leerling.voornaam} {ctx.leerling.naam} ({ctx.leerling.klas}) · {ctx.stagegever.winkel} · {datumMidden(ctx.blok.start_datum)} tot en met {datumMidden(ctx.blok.eind_datum)}
                </p>
              </div>
              <div className="ct-kop-rechts">
                <span className="ct-ik">Je opent dit rooster als <b>stagegever</b></span>
                <a className="bh-link" href={`/contract/${token}`}>Naar het stagecontract</a>
                {ov && ov.stagiairs.length > 1 && <a className="bh-link" href={`/stagegever/${token}`}>Al uw stagiairs ({ov.stagiairs.length})</a>}
                <a className="bh-link" href="/handleiding/stagegever">Handleiding</a>
              </div>
            </header>
            <NuTeDoen taken={todo.filter((x) => !x.href.endsWith(af ? "?tab=afronding" : ev ? "?tab=evaluatie" : afw ? "?tab=afwezig" : `/rooster/${token}`))} />
            <nav className="bh-seg pt-tabs" aria-label="Onderdeel">
              <Link href={`/rooster/${token}`} className={afw || ev || af ? undefined : "on"}>Werkrooster</Link>
              <Link href={`/rooster/${token}?tab=afwezig`} className={afw ? "on" : undefined}>
                Afwezigheden en inhaalstage{st && (st.open > 0 || st.teBevestigen.length > 0 || st.nietGekoppeld.length > 0) ? " •" : ""}
              </Link>
              <Link href={`/rooster/${token}?tab=evaluatie`} className={ev && !af ? "on" : undefined}>Evaluatie</Link>
              <Link href={`/rooster/${token}?tab=afronding`} className={af ? "on" : undefined}>Afronding</Link>
            </nav>
            {af && ev ? (
              <>
                {ev.afgerond ? (
                  <div className="pt-feedback ok">
                    <b>De stage is afgerond</b>
                    <p>Bedankt voor de begeleiding van {ctx.leerling.voornaam}! {ctx.leerling.voornaam} kreeg een stageattest. U kreeg een bedankmail met een kopie.</p>
                  </div>
                ) : (
                  <p className="pt-intro">
                    Na de stage rondt de stagebegeleiding de stage af: {ctx.leerling.voornaam} krijgt dan een stageattest en u een bedankmail. Wil u ons intussen laten weten hoe de samenwerking verliep? Dat duurt een tweetal minuten.
                  </p>
                )}
                <h3 className="pt-sub">Feedback over de samenwerking</h3>
                <EvaluatieForm
                  key={fb?.gewijzigd_op ?? "nieuw"}
                  f={formulier("feedback", ev.stage)}
                  start={fb?.antwoorden ?? {}}
                  ingediend={fb?.status === "ingediend"}
                  naamStart={fb?.naam ?? ctx.stagegever.naam ?? ""}
                  naamVraag="Uw naam"
                  sleutel={{ token }}
                />
              </>
            ) : ev ? (
              <>
                <p className="pt-intro">
                  Op het einde van de stage beoordeelt u {ctx.leerling.voornaam}. U kan tussendoor bewaren en later verder invullen. {ctx.leerling.voornaam} ziet uw evaluatie pas wanneer de stagebegeleiding ze openstelt; dan krijgt u ze ook per mail.
                </p>
                <EvaluatieForm
                  key={ev.evaluaties.find((e) => e.soort === "mentor")?.gewijzigd_op ?? "nieuw"}
                  f={formulier("mentor", ev.stage)}
                  start={ev.evaluaties.find((e) => e.soort === "mentor")?.antwoorden ?? {}}
                  ingediend={ev.evaluaties.find((e) => e.soort === "mentor")?.status === "ingediend"}
                  naamStart={ev.evaluaties.find((e) => e.soort === "mentor")?.naam ?? ctx.stagegever.mentor ?? ctx.stagegever.naam ?? ""}
                  naamVraag="Naam stagementor"
                  sleutel={{ token }}
                />
              </>
            ) : afw && t ? (
              <>
                <p className="pt-intro">
                  Meld hier een afwezigheid van {ctx.leerling.voornaam} en plan samen de inhaalstage. Na afloop bevestigt u dat de uren gepresteerd zijn: pas dan tellen ze als ingehaald.
                </p>
                <TijdensStage key={`${t.afwezigheden.length}-${t.inhaal.length}`} ctx={ctx} t={t} sleutel={{ token }} vandaag={vandaag} naamStart={ctx.stagegever.naam ?? ""} />
              </>
            ) : (
              <>
                <p className="pt-intro">
                  Plan samen met {ctx.leerling.voornaam} de stagedagen: in totaal <b>{ctx.blok.uren} uur</b>. Vink een dag aan en pas de uren aan. Met
                  {" "}<i>Overnemen in de volgende weken</i> kopieer je een week. Is alles in orde, bevestig en dien in: de stagebegeleiding keurt het rooster goed.
                </p>
                <RoosterEditor key={`${ctx.rooster?.status}-${ctx.rooster?.gewijzigd_op}`} ctx={ctx} sleutel={{ token }} pdfUrl={`/rooster/${token}/pdf`} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
