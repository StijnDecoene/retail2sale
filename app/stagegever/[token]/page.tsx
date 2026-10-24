import type { Metadata } from "next";
import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { vandaagIso } from "@/lib/beheer";
import { datumMidden } from "@/lib/contract";
import { laadOverzicht } from "@/lib/stagegever-server";
import { fase, taken } from "@/lib/stagegever";
import NuTeDoen from "@/components/stagegever/NuTeDoen";

export const metadata: Metadata = { title: "Uw stagiairs", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Overzicht voor de stagegever: al zijn stagiairs, wat er te doen is, en de links per stagiair. */
export default async function StagegeverOverzicht({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ov = await laadOverzicht(await serverClient(), token);
  const vandaag = vandaagIso();
  const alle = ov?.stagiairs ?? [];
  const lopend = alle.filter((s) => !s.afgerond);
  const af = alle.filter((s) => s.afgerond);
  const teDoen = lopend.reduce((n, s) => n + taken(s, vandaag).length, 0);
  return (
    <div className="pt">
      <header className="pt-balk">
        <Link href="/" className="pt-logos" aria-label="Retail2Sale">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-spes-nostra.png" alt="Spes Nostra Heule" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-retail2sale.png" alt="Retail2Sale" />
        </Link>
        <b className="pt-merk">Stagegever</b>
      </header>
      <main className="pt-main">
        {!ov ? (
          <section className="pt-leeg">
            <h1>Deze link werkt niet (meer)</h1>
            <p>De link is onvolledig of verlopen. Vraag een nieuwe link aan via <a href="/inloggen?rol=stagegever">Inloggen → Stagegever</a>: u krijgt die meteen per mail.</p>
          </section>
        ) : (
          <>
            <header className="pt-kop">
              <div>
                <span className="eyebrow"><span className="streep" />Onthaal, organisatie en sales · stagegever</span>
                <h1>Uw stagiairs</h1>
                <p className="sub">{alle.length} {alle.length === 1 ? "stagiair" : "stagiairs"} voor {ov.email}{teDoen ? <> · <b>{teDoen} {teDoen === 1 ? "taak" : "taken"} te doen</b></> : null}</p>
              </div>
              <div className="ct-kop-rechts">
                <a className="bh-link" href="/handleiding/stagegever">Hoe werkt het? Handleiding</a>
                <a className="bh-link" href="/handleiding/mentor">Briefing voor de mentor</a>
              </div>
            </header>
            {!alle.length && <p className="bh-melding">Er staan (nog) geen stagiairs op dit mailadres.</p>}
            <div className="sg-lijst">
              {[...lopend, ...af].map((s) => {
                const tk = s.afgerond ? [] : taken(s, vandaag);
                return (
                  <section key={s.token} className={`sg-kaart${s.afgerond ? " af" : ""}`}>
                    <div className="sg-kop">
                      <div>
                        <h2>{s.naam} <small>({s.klas})</small></h2>
                        <p className="sub">{s.winkel ?? ""}{s.winkel ? " · " : ""}{s.blok}: {datumMidden(s.start_datum)} tot en met {datumMidden(s.eind_datum)}</p>
                      </div>
                      <span className={`pill ${s.afgerond ? "ok" : tk.some((x) => x.dringend) ? "warn" : "mut"}`}>{fase(s, vandaag)}</span>
                    </div>
                    <NuTeDoen taken={tk} compact leeg={s.afgerond ? "Afgerond. Bedankt voor de begeleiding!" : "Niets te doen op dit moment."} />
                    <nav className="sg-links" aria-label={`Onderdelen voor ${s.naam}`}>
                      <a href={`/contract/${s.token}`}>Contract{s.contract_rond ? " ✓" : ""}</a>
                      <a href={`/rooster/${s.token}`}>Werkrooster{s.rooster === "goedgekeurd" ? " ✓" : ""}</a>
                      <a href={`/rooster/${s.token}?tab=afwezig`}>Afwezigheden</a>
                      <a href={`/rooster/${s.token}?tab=evaluatie`}>Evaluatie{s.mentor_eval === "ingediend" ? " ✓" : ""}</a>
                      <a href={`/rooster/${s.token}?tab=afronding`}>Afronding{s.feedback === "ingediend" ? " ✓" : ""}</a>
                    </nav>
                  </section>
                );
              })}
            </div>
            <p className="pt-intro sm">Bewaar deze pagina als bladwijzer. Link kwijt? Via <a href="/inloggen?rol=stagegever">Inloggen → Stagegever</a> vraagt u een nieuwe aan. Vragen? Mail naar <a href="mailto:retail2sale@snh.be">retail2sale@snh.be</a>.</p>
          </>
        )}
      </main>
    </div>
  );
}
