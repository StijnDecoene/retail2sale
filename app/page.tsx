import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { IcDownload, IcKalender, IcOnthaal, IcPersoon, IcSchool, IcTas, IcWinkel } from "@/components/Icons";
import { BEGELEIDERS, BLOKKEN, SCHOOL, huidigOfVolgendBlok, periode } from "@/lib/stage";

// Elk uur opnieuw opbouwen, zodat "Nu bezig" mee verschuift met de datum.
export const revalidate = 3600;

const STAPPEN = [
  { t: "Top 3", s: "De stagiair kiest drie stageplaatsen; de begeleider keurt goed.", wie: "Stagiair · begeleider" },
  { t: "Aanvraag", s: "Stagiair en stagegever vullen samen de gegevens van de stage in.", wie: "Stagiair · stagegever" },
  { t: "Stagecontract", s: "Wettelijke bepalingen, gedragscode en overeenkomst in één bundel, digitaal ondertekend.", wie: "Stagegever · stagiair · school" },
  { t: "Werkrooster", s: "120 uur, gemiddeld 20 à 24 uur per week, samen gepland.", wie: "Stagegever · stagiair" },
  { t: "Tijdens de stage", s: "Afwezigheid melden en inhaaluren inplannen.", wie: "Stagegever · stagiair" },
  { t: "Evaluatie", s: "Mentor, begeleider en stagiair evalueren elk hun deel.", wie: "Alle rollen" },
  { t: "Afronding", s: "Feedback van de stagegever en een stageattest voor de stagiair.", wie: "Stagiair" },
];

export default function Home() {
  const nu = huidigOfVolgendBlok();
  const [b1, b2] = BLOKKEN;

  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="wrap">
            <div className="hero-tekst">
              <div className="eyebrow"><span className="streep" />Onthaal, organisatie en sales · Spes Nostra Heule</div>
              <h1>Passie voor klantgericht werken.</h1>
              <p>
                Help jij graag mensen en heb je commerciële flair? Bij Retail2Sale leer je het gezicht van een organisatie te
                zijn: bezoekers verwelkomen, gericht adviseren en een verkoop correct afhandelen.
              </p>
              <div className="knoppen">
                <a href="#stage" className="btn btn-dark btn-lg">Zo verloopt de stage</a>
                <Link href="/inloggen" className="btn btn-line btn-lg" style={{ fontWeight: 600 }}>Naar het stageportaal</Link>
              </div>
            </div>
            <div className="hero-beeld">
              <div className="hero-foto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/stage-kassa.jpg" alt="Stagiair aan de kassa helpt een klant" width={1800} height={1361} />
                <div className="streepjescode" />
              </div>
              {nu && (
                <div className="nu-bezig">
                  <span className="label">{nu.bezig ? "Nu bezig" : "Volgende stage"}</span>
                  <b>{nu.blok.naam}</b>
                  <span>{periode(nu.blok)} · {nu.blok.uren} uur</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="wie" className="wrap" style={{ paddingTop: 96, paddingBottom: 24 }}>
          <h2 id="wie" className="h2-mid">Eén portaal, drie rollen</h2>
          <div className="rollen">
            <div className="kaart">
              <div className="icoon"><IcWinkel /></div>
              <h3>Stagegever &amp; mentor</h3>
              <p>Contract, werkrooster, afwezigheden en evaluatie: alles wat u als stageplaats moet invullen, stap voor stap.</p>
              <Link href="/inloggen?rol=stagegever">Inloggen als stagegever →</Link>
            </div>
            <div className="kaart">
              <div className="icoon"><IcPersoon /></div>
              <h3>Stagiair</h3>
              <p>Je top 3, je contract, je rooster en je uren. Altijd zichtbaar wat de volgende stap is.</p>
              <Link href="/inloggen?rol=stagiair">Inloggen als stagiair →</Link>
            </div>
            <div className="kaart">
              <div className="icoon"><IcSchool /></div>
              <h3>Leraar &amp; stagebegeleider</h3>
              <p>Overzicht van al je stagiairs, stagebezoeken en evaluaties, met meldingen zodra er iets binnenkomt.</p>
              <Link href="/inloggen?rol=school">Inloggen als school →</Link>
            </div>
          </div>
        </section>

        <section id="stage" aria-labelledby="flow" className="wrap sectie">
          <div className="flow-kop">
            <div>
              <span className="eyebrow">De stage in zeven stappen</span>
              <h2 id="flow" className="h2-groot">Elk document op het juiste moment.</h2>
            </div>
            <p>Het portaal volgt dezelfde volgorde. Een stap opent pas wanneer ze aan de beurt is, zodat niemand moet zoeken.</p>
          </div>
          <ol className="stappen">
            {STAPPEN.map((s, i) => (
              <li key={s.t}>
                <span className="nr">{String(i + 1).padStart(2, "0")}</span>
                <span className="t">{s.t}</span>
                <span className="s">{s.s}</span>
                <span className="wie">{s.wie}</span>
              </li>
            ))}
          </ol>
        </section>

        <section id="opleiding" className="sectie-wit">
          <div className="wrap opleiding">
            <div className="pijlers">
              <div className="streepjescode" aria-hidden="true" />
              <div className="pijler">
                <div className="blok" style={{ background: "#1D5BAA" }}><IcOnthaal color="#fff" /></div>
                <div><b>Onthaal</b><span>Bezoekers verwelkomen, vragen beantwoorden, de telefoon aannemen.</span></div>
                <span className="n">01</span>
              </div>
              <div className="pijler">
                <div className="blok" style={{ background: "#fff" }}><IcKalender color="#123E78" /></div>
                <div><b>Organisatie</b><span>Afspraken plannen, administratie en post verwerken, digitaal werken.</span></div>
                <span className="n">02</span>
              </div>
              <div className="pijler">
                <div className="blok" style={{ background: "#C21F2E" }}><IcTas color="#fff" /></div>
                <div><b>Sales</b><span>Klanten adviseren, een verkoopgesprek voeren, correct afrekenen.</span></div>
                <span className="n">03</span>
              </div>
            </div>

            <div className="opleiding-tekst">
              <span className="eyebrow">De opleiding</span>
              <h2 className="h2-groot">Onthaal, organisatie en sales</h2>
              <p className="lead">
                Leerlingen leren het gezicht van een organisatie te zijn. Ze ontvangen bezoekers en klanten, helpen hen
                vriendelijk en correct verder aan de balie, aan de telefoon en in de winkel, en zorgen achter de schermen voor
                een vlotte organisatie.
              </p>
              <p className="lead">
                Op school leggen ze de basis, op stage toetsen ze die aan de praktijk. Communicatie, klantgerichtheid,
                nauwkeurigheid en zelfstandig werken staan daarbij centraal.
              </p>
              <dl className="feiten">
                <div><dt>Leerjaren met stage</dt><dd>4de, 5de en 6de jaar</dd></div>
                <div><dt>Stageplaatsen</dt><dd>Zuid-West-Vlaanderen</dd></div>
                <div><dt>{b1.naam} · {b1.uren} uur</dt><dd>{periode(b1)}</dd></div>
                <div><dt>{b2.naam} · {b2.uren} uur</dt><dd>{periode(b2)}</dd></div>
              </dl>
              <a className="download" href="/docs/infobrochure-stage-2026-2027.pdf" download>
                <span className="ic"><IcDownload color="#fff" /></span>
                <span><b>Infobrochure stage 2026-2027</b><small>pdf · 254 kB</small></span>
                <span className="actie">Downloaden ↓</span>
              </a>
            </div>
          </div>
        </section>

        <section className="wrap sectie">
          <div className="missie">
            <div className="streepjescode" aria-hidden="true" />
            <div>
              <span className="eyebrow">Spes Nostra Heule</span>
              <h2>Wegwijzers voor jongeren, op weg naar zichzelf en hun toekomst.</h2>
            </div>
            <div>
              <p>
                We kiezen resoluut voor extra aandacht voor wie het moeilijk heeft. We zorgen voor de nodige vangrails, laden
                indien nodig de batterij weer op of nemen jongeren mee op sleeptouw.
              </p>
              <a href={SCHOOL.web}>www.snh.be →</a>
            </div>
          </div>
        </section>

        <section id="team" aria-labelledby="teamtitel" className="wrap" style={{ paddingBottom: 96 }}>
          <h2 id="teamtitel" className="h2-mid">Je stagebegeleiders</h2>
          <div className="team">
            {BEGELEIDERS.map((p) => (
              <div className="persoon" key={p.mail}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.foto} alt={`Portret van ${p.naam}`} width={598} height={900} />
                <div>
                  <span className="eyebrow">Stagebegeleider</span>
                  <b>{p.naam}</b>
                  <span>{p.tekst}</span>
                  <a href={`mailto:${p.mail}`}>{p.mail}</a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
