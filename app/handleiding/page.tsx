import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { HANDLEIDINGEN, WIE } from "@/lib/handleidingen";

export const metadata: Metadata = { title: "Briefing per rol", description: "Wat stagegever, mentor, stagiair en ouder wanneer doen tijdens de stage Onthaal, organisatie en sales." };

const ICOON: Record<string, string> = {
  stagegever: "M3 9l1.5-5h15L21 9M3 9h18M3 9v11h18V9M9 20v-6h6v6",
  mentor: "M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5M14 15.5c.6-.3 1.3-.5 2-.5 3 0 6 2 6 5",
  stagiair: "M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6",
  ouder: "M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-5h4v5",
};

export default function Briefings() {
  return (
    <>
      <Header actief="briefing" />
      <main className="wrap hl">
        <header className="hl-kop">
          <span className="eyebrow"><span className="streep" />Briefing per rol</span>
          <h1>Wie doet wat tijdens de stage?</h1>
          <p className="lead">Kies uw rol. U leest in een paar minuten wat er van u verwacht wordt, wanneer, en hoe het op het platform werkt. Elke briefing kan u ook als pdf downloaden.</p>
        </header>
        <div className="hl-rollen">
          {WIE.map((w) => {
            const h = HANDLEIDINGEN[w];
            return (
              <a key={w} className="hl-rol" href={`/handleiding/${w}`}>
                <span className="hl-rol-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICOON[w]} /></svg></span>
                <b>{h.voor}</b>
                <span>{h.samenvatting}</span>
                <small>Lees de briefing →</small>
              </a>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
