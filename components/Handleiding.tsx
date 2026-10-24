import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AfdrukKnop from "@/components/AfdrukKnop";
import { CONTACT, HANDLEIDINGEN, WIE, stukken, type HandleidingInhoud } from "@/lib/handleidingen";

/** Tekst met **vet** en [tekst](link). */
function Rijk({ s }: { s: string }) {
  return (
    <>
      {stukken(s).map((x, i) =>
        x.link ? <a key={i} href={x.link}>{x.t}</a> : x.vet ? <b key={i}>{x.t}</b> : <span key={i}>{x.t}</span>,
      )}
    </>
  );
}

/** Opmaak voor een handleiding: kop, "in het kort", genummerde stappen, vragen en contact. Ook als pdf te downloaden. */
export default function Handleiding({ inhoud: h }: { inhoud: HandleidingInhoud }) {
  return (
    <>
      <Header actief="briefing" />
      <main className="wrap hl">
        <header className="hl-kop">
          <span className="eyebrow"><span className="streep" />Briefing · {h.voor}</span>
          <h1>{h.titel}</h1>
          <p className="lead">{h.intro}</p>
          <div className="hl-acties">
            <a className="btn btn-blue" href={`/handleiding/${h.wie}/pdf`} target="_blank" rel="noreferrer">Openen als pdf</a>
            <AfdrukKnop />
            <a className="btn btn-line" href="/handleiding">Briefing per rol</a>
          </div>
        </header>

        <section className="hl-kort" aria-labelledby="hl-kort">
          <h2 id="hl-kort">In het kort</h2>
          <ol>{h.kort.map((k, i) => <li key={i}><Rijk s={k} /></li>)}</ol>
        </section>

        <ol className="hl-stappen">
          {h.stappen.map((s, i) => (
            <li key={s.titel} className="hl-stap">
              <span className="hl-nr" aria-hidden="true">{i + 1}</span>
              <div>
                <h2>{s.titel}</h2>
                {s.wanneer && <p className="hl-wanneer">{s.wanneer}</p>}
                <div className="hl-tekst">{s.tekst.map((p, j) => <p key={j}><Rijk s={p} /></p>)}</div>
                {s.punten && <ul>{s.punten.map((p, j) => <li key={j}><Rijk s={p} /></li>)}</ul>}
                {s.tip && <p className="hl-tip"><b>Tip</b> <Rijk s={s.tip} /></p>}
              </div>
            </li>
          ))}
        </ol>

        <section className="hl-vragen" aria-labelledby="hl-vragen">
          <h2 id="hl-vragen">Vaak gestelde vragen</h2>
          {h.vragen.map((q) => (
            <details key={q.v}>
              <summary>{q.v}</summary>
              <div><Rijk s={q.a} /></div>
            </details>
          ))}
        </section>

        <nav className="hl-andere" aria-label="Andere briefings">
          <span>Ook lezen:</span>
          {WIE.filter((w) => w !== h.wie).map((w) => <a key={w} href={`/handleiding/${w}`}>{HANDLEIDINGEN[w].voor}</a>)}
        </nav>

        <section className="hl-contact">
          <h2>Vragen? Neem contact op</h2>
          <p><Rijk s={CONTACT} /></p>
        </section>
      </main>
      <Footer />
    </>
  );
}
