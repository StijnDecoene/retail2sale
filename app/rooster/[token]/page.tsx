import type { Metadata } from "next";
import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { laadRooster } from "@/lib/werkrooster-server";
import { datumMidden } from "@/lib/contract";
import RoosterEditor from "@/components/rooster/RoosterEditor";

export const metadata: Metadata = { title: "Werkrooster", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function RoosterPagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await laadRooster(await serverClient(), { token });
  return (
    <div className="pt">
      <header className="pt-balk">
        <Link href="/" className="pt-logos" aria-label="Retail2Sale">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-spes-nostra.png" alt="Spes Nostra Heule" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-retail2sale.png" alt="Retail2Sale" />
        </Link>
        <b className="pt-merk">Werkrooster</b>
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
                <h1>Werkrooster</h1>
                <p className="sub">
                  {ctx.leerling.voornaam} {ctx.leerling.naam} ({ctx.leerling.klas}) · {ctx.stagegever.winkel} · {datumMidden(ctx.blok.start_datum)} tot en met {datumMidden(ctx.blok.eind_datum)}
                </p>
              </div>
              <div className="ct-kop-rechts">
                <span className="ct-ik">Je opent dit rooster als <b>stagegever</b></span>
                <a className="bh-link" href={`/contract/${token}`}>Naar het stagecontract</a>
              </div>
            </header>
            <p className="pt-intro">
              Plan samen met {ctx.leerling.voornaam} de stagedagen: in totaal <b>{ctx.blok.uren} uur</b>. Vink een dag aan en pas de uren aan. Met
              {" "}<i>Overnemen in de volgende weken</i> kopieer je een week. Is alles in orde, bevestig en dien in: de stagebegeleiding keurt het rooster goed.
            </p>
            <RoosterEditor key={`${ctx.rooster?.status}-${ctx.rooster?.gewijzigd_op}`} ctx={ctx} sleutel={{ token }} pdfUrl={`/rooster/${token}/pdf`} />
          </>
        )}
      </main>
    </div>
  );
}
