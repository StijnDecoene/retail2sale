import type { Metadata } from "next";
import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { contractViaLink } from "@/lib/contract-server";
import { ROL_LABEL, contractStatus, contractTekst, datumMidden, effectief } from "@/lib/contract";
import ContractFlow from "./ContractFlow";
import Documenten from "@/components/contract/Documenten";
import { documentenLijst } from "@/lib/documenten-server";

export const metadata: Metadata = { title: "Stagecontract", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ContractPagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = await serverClient();
  const d = await contractViaLink(sb, token);
  const docs = d?.rol === "stagegever" ? await documentenLijst(sb, { token }) : null;
  return (
    <div className="pt">
      <header className="pt-balk">
        <Link href="/" className="pt-logos" aria-label="Retail2Sale">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-spes-nostra.png" alt="Spes Nostra Heule" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-retail2sale.png" alt="Retail2Sale" />
        </Link>
        <b className="pt-merk">Stagecontract</b>
      </header>
      <main className="pt-main ct">
        {!d ? (
          <section className="pt-leeg">
            <h1>Deze link werkt niet</h1>
            <p>De link is onvolledig of niet meer geldig. Kopieer de volledige link uit de mail, of vraag een nieuwe link aan de stagebegeleiding via retail2sale@snh.be.</p>
          </section>
        ) : (
          <>
            <header className="pt-kop">
              <div>
                <span className="eyebrow"><span className="streep" />{d.blok.naam} · Onthaal, organisatie en sales</span>
                <h1>Stagecontract</h1>
                <p className="sub">
                  {d.leerling.voornaam} {d.leerling.naam} ({d.leerling.klas}) · {effectief(d).winkel_naam} · {datumMidden(d.blok.start_datum)} tot en met {datumMidden(d.blok.eind_datum)}
                </p>
              </div>
              <div className="ct-kop-rechts">
                <span className="ct-ik">Je opent dit contract als <b>{ROL_LABEL[d.rol].toLowerCase()}</b></span>
                {d.rol === "stagegever" && <a className="bh-link" href={`/rooster/${token}`}>Werkrooster plannen</a>}
                <a className="bh-link" href={`/handleiding/${d.rol === "stagegever" ? "stagegever" : d.rol === "ouder" ? "ouder" : "stagiair"}`} target="_blank" rel="noreferrer">Hulp nodig? Lees de handleiding</a>
              </div>
            </header>
            <ContractFlow d={d} token={token} secties={contractTekst(d)} status={contractStatus(d)} />
            {docs && (
              <section className="bh-card" id="risico">
                <div className="hd"><h2>Risicoanalyse of werkpostfiche</h2><span className="sm">Artikel 6 · vóór de eerste stagedag</span></div>
                <div className="bd">
                  <Documenten modus="stagegever" token={token} docs={docs} risico={effectief(d).risico} naamStart={effectief(d).ondertekenaar} />
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
