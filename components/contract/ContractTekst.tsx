import type { Deel, Sectie, TekstBlok } from "@/lib/contract";

function Delen({ d }: { d: Deel[] }) {
  return (
    <>
      {d.map((x, i) =>
        typeof x === "string" ? <span key={i}>{x}</span>
          : "b" in x ? <strong key={i}>{x.b}</strong>
          : x.v ? <span key={i} className="ct-fill">{x.v}</span>
          : <span key={i} className="ct-fill leeg">{x.leeg ?? "nog in te vullen"}</span>,
      )}
    </>
  );
}

function Blokken({ blokken }: { blokken: TekstBlok[] }) {
  return (
    <>
      {blokken.map((b, i) =>
        b.t === "ul" ? <ul key={i}>{b.items.map((it, j) => <li key={j}><Delen d={it} /></li>)}</ul>
          : b.t === "h4" ? <h4 key={i}><Delen d={b.d} /></h4>
          : <p key={i} className={b.t === "note" ? "ct-note" : undefined}><Delen d={b.d} /></p>,
      )}
    </>
  );
}

/** De volledige contracttekst met inhoudstafel. */
export default function ContractTekst({ secties }: { secties: Sectie[] }) {
  return (
    <div className="ct-lees">
      <nav className="ct-toc" aria-label="Inhoud contract">
        {secties.map((s) => <a key={s.id} href={`#sec-${s.id}`}>{s.titel}</a>)}
      </nav>
      <div className="ct-doc">
        {secties.map((s) =>
          s.inklapbaar ? (
            <section key={s.id} id={`sec-${s.id}`}>
              <details><summary><h3>{s.titel}</h3><span>Openklappen</span></summary><Blokken blokken={s.blokken} /></details>
            </section>
          ) : (
            <section key={s.id} id={`sec-${s.id}`}><h3>{s.titel}</h3><Blokken blokken={s.blokken} /></section>
          ),
        )}
      </div>
    </div>
  );
}
