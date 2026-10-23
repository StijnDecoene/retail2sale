import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AfdrukKnop from "@/components/AfdrukKnop";

export type HStap = { titel: string; wanneer?: string; tekst: ReactNode; punten?: ReactNode[]; tip?: ReactNode };
export type HVraag = { v: string; a: ReactNode };

/** Opmaak voor een handleiding: kop, "in het kort", genummerde stappen, vragen en contact. Ook netjes af te drukken. */
export default function Handleiding({
  voor, titel, intro, kort, stappen, vragen, andere,
}: {
  voor: string;
  titel: string;
  intro: ReactNode;
  kort: ReactNode[];
  stappen: HStap[];
  vragen: HVraag[];
  andere: { href: string; tekst: string };
}) {
  return (
    <>
      <Header actief="documenten" />
      <main className="wrap hl">
        <header className="hl-kop">
          <span className="eyebrow"><span className="streep" />Handleiding · {voor}</span>
          <h1>{titel}</h1>
          <p className="lead">{intro}</p>
          <div className="hl-acties">
            <AfdrukKnop />
            <a className="btn btn-line" href={andere.href}>{andere.tekst}</a>
          </div>
        </header>

        <section className="hl-kort" aria-labelledby="hl-kort">
          <h2 id="hl-kort">In het kort</h2>
          <ol>{kort.map((k, i) => <li key={i}>{k}</li>)}</ol>
        </section>

        <ol className="hl-stappen">
          {stappen.map((s, i) => (
            <li key={s.titel} className="hl-stap">
              <span className="hl-nr" aria-hidden="true">{i + 1}</span>
              <div>
                <h2>{s.titel}</h2>
                {s.wanneer && <p className="hl-wanneer">{s.wanneer}</p>}
                <div className="hl-tekst">{s.tekst}</div>
                {s.punten && <ul>{s.punten.map((p, j) => <li key={j}>{p}</li>)}</ul>}
                {s.tip && <p className="hl-tip"><b>Tip</b> {s.tip}</p>}
              </div>
            </li>
          ))}
        </ol>

        <section className="hl-vragen" aria-labelledby="hl-vragen">
          <h2 id="hl-vragen">Vaak gestelde vragen</h2>
          {vragen.map((q) => (
            <details key={q.v}>
              <summary>{q.v}</summary>
              <div>{q.a}</div>
            </details>
          ))}
        </section>

        <section className="hl-contact">
          <h2>Vragen? Neem contact op</h2>
          <p>
            Mail naar <a href="mailto:retail2sale@snh.be">retail2sale@snh.be</a> of bel een van de stagebegeleiders:
            Fien Claeys (0498 64 48 89) of Stijn Decoene (0479 28 85 07).
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
