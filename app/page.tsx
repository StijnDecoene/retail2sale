import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { IcDownload, IcKalender, IcOnthaal, IcPersoon, IcSchool, IcTas, IcWinkel } from "@/components/Icons";
import { BEGELEIDERS, BLOKKEN, SCHOOL, huidigOfVolgendBlok, periode } from "@/lib/stage";
import VraagKnop from "@/components/VraagKnop";
import { laadPartners } from "@/lib/supabase/publiek";

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

const LEERWEG = [
  { jaar: "3de en 4de jaar", titel: "Organisatie en logistiek", tekst: "De basis: onthaal, verkoop en logistiek, met veel praktijk op school. Op het einde van het 4de jaar kiest de leerling een top 3 van stageplaatsen voor het 5de jaar.", stage: "" },
  { jaar: "5de jaar", titel: "Onthaal, organisatie en sales", tekst: "De eerste echte werkervaring: één blokstage in een winkel en één aan een onthaal.", stage: "2 blokstages · 240 uur" },
  { jaar: "6de jaar", titel: "Onthaal, organisatie en sales", tekst: "Opnieuw twee blokstages, met meer verantwoordelijkheid en zelfstandigheid. Afsluiten met het diploma secundair onderwijs.", stage: "2 blokstages · 240 uur" },
  { jaar: "Daarna", titel: "Werken of verder studeren", tekst: "Rechtstreeks aan de slag in onthaal, administratie of verkoop, of verder studeren.", stage: "" },
];

const VAKKEN = [
  { u: "12", t: "Onthaal, organisatie en sales", s: "praktijk, inclusief de stage" },
  { u: "8", t: "Talen", s: "Nederlands, Frans, Engels en Duits, en business Frenglish" },
  { u: "2", t: "Project", s: "echte opdrachten, zoals etalages bij winkeliers in de regio" },
  { u: "1", t: "Toegepaste informatica", s: "" },
  { u: "7", t: "Algemene vorming", s: "wiskunde, MAVO, godsdienst en lichamelijke opvoeding" },
];

const PROJECTEN = [
  { t: "Mode Event in Shopping Kuurne", s: "Dertig winkels stellen hun mooiste producten tentoon. De leerlingen zorgen voor de opbouw en de presentatie." },
  { t: "Kringloopwinkel", s: "Etalages met gebruikte en nieuwe materialen, voor de campagne \u201cNieuw is zo passé\u201d." },
  { t: "Jonge ondernemers", s: "Samen met Onderneem in Kortrijk ontmoeten de leerlingen jonge ondernemers en bouwen ze voor elk van hen een etalage." },
  { t: "Etalages voor winkeliers", s: "Op geregelde basis richten de leerlingen etalages in bij winkeliers in de regio. Interesse? Neem contact op." },
];

const JOBS = ["onthaal- of receptiemedewerker", "verkoopmedewerker of winkelbediende", "administratief medewerker", "medewerker klantendienst of callcenter", "kassamedewerker of afdelingsmedewerker"];

export default async function Home() {
  const partners = await laadPartners();
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
                <div><b>Onthaal</b><span>Bezoekers en klanten verwelkomen, informeren en doorverwijzen, de telefoon aannemen en de onthaalruimte verzorgen.</span></div>
                <span className="n">01</span>
              </div>
              <div className="pijler">
                <div className="blok" style={{ background: "#fff" }}><IcKalender color="#123E78" /></div>
                <div><b>Organisatie</b><span>Afspraken en agenda&apos;s beheren, post en administratie verwerken, vergaderingen voorbereiden en vlot digitaal werken.</span></div>
                <span className="n">02</span>
              </div>
              <div className="pijler">
                <div className="blok" style={{ background: "#C21F2E" }}><IcTas color="#fff" /></div>
                <div><b>Sales</b><span>Klanten adviseren, een verkoopgesprek voeren met bij- en meerverkoop, correct afrekenen en goederen presenteren.</span></div>
                <span className="n">03</span>
              </div>
            </div>

            <div className="opleiding-tekst">
              <span className="eyebrow">De opleiding</span>
              <h2 className="h2-groot">Onthaal, organisatie en sales</h2>
              <p className="lead">
                Een praktische studierichting in het 5de en 6de jaar, gericht op de arbeidsmarkt. Leerlingen leren het gezicht
                van een organisatie te zijn: ze ontvangen bezoekers en klanten, helpen hen vriendelijk en correct verder aan de
                balie, aan de telefoon en in de winkel, en zorgen achter de schermen voor een vlotte organisatie.
              </p>
              <p className="lead">
                Op school leggen ze de basis, op stage toetsen ze die aan de praktijk. Communicatie, klantgerichtheid,
                nauwkeurigheid en zelfstandig werken staan daarbij centraal, net als talen en digitale vaardigheden.
              </p>
              <dl className="feiten">
                <div><dt>Leerjaren met stage</dt><dd>5de en 6de jaar</dd></div>
                <div><dt>Stage per schooljaar</dt><dd>2 × 120 uur</dd></div>
                <div><dt>{b1.naam} · {b1.uren} uur</dt><dd>{periode(b1)}</dd></div>
                <div><dt>{b2.naam} · {b2.uren} uur</dt><dd>{periode(b2)}</dd></div>
              </dl>
              <a className="download" href="/docs/infobrochure-stage-2026-2027.pdf" target="_blank" rel="noreferrer">
                <span className="ic"><IcDownload color="#fff" /></span>
                <span><b>Infobrochure stage 2026-2027</b><small>pdf · 254 kB</small></span>
                <span className="actie">Openen →</span>
              </a>
            </div>
          </div>

          <div className="wrap opl-meer">
            <div className="opl-kop">
              <span className="eyebrow">De leerweg</span>
              <h2 className="h2-mid">Van de basis naar de werkvloer</h2>
            </div>
            <ol className="leerweg">
              {LEERWEG.map((x, i) => (
                <li key={x.jaar} className={x.stage ? "stage" : undefined}>
                  <span className="lw-nr">{String(i + 1).padStart(2, "0")}</span>
                  <span className="lw-jaar">{x.jaar}</span>
                  <b>{x.titel}</b>
                  <span className="lw-tekst">{x.tekst}</span>
                  {x.stage && <span className="lw-tag">{x.stage}</span>}
                </li>
              ))}
            </ol>

            <div className="opl-twee">
              <div className="opl-blok">
                <span className="eyebrow">Op school</span>
                <h3>Wat staat er op het lessenrooster?</h3>
                <p>Dertig uur per week in het 5de en 6de jaar, waarvan twaalf uur praktijk in onthaal, organisatie en sales.</p>
                <ul className="vakken">
                  {VAKKEN.map((v) => (
                    <li key={v.t}><span className="v-uren">{v.u}</span><span><b>{v.t}</b>{v.s && <small>{v.s}</small>}</span></li>
                  ))}
                </ul>
              </div>
              <div className="opl-blok">
                <span className="eyebrow">Op stage</span>
                <h3>Twee blokstages per schooljaar</h3>
                <p>
                  Tijdens een blokstage liggen de lessen stil en werkt de stagiair 120 uur mee op de werkvloer, gemiddeld
                  20 à 24 uur per week van dinsdag tot en met zaterdag. Een mentor begeleidt op de werkvloer; de
                  stagebegeleider komt op bezoek en volgt alles op via het stageplatform.
                </p>
                <div className="stage-soorten">
                  <div className="stage-soort sales">
                    <IcTas color="#C21F2E" />
                    <b>Stage sales</b>
                    <span>In een winkel: klanten onthalen en adviseren, verkopen en afrekenen, goederen ontvangen en presenteren.</span>
                  </div>
                  <div className="stage-soort onthaal">
                    <IcOnthaal color="#1D5BAA" />
                    <b>Stage onthaal en organisatie</b>
                    <span>Aan een onthaal of receptie: bezoekers ontvangen, telefoon en mail, afspraken, post en administratie.</span>
                  </div>
                </div>
                <p className="opl-links">
                  <a href="/documenten/pdf/activiteitenlijst" target="_blank" rel="noreferrer">Wat doet een stagiair? De activiteitenlijst →</a>
                  <a href="#stage">Zo verloopt de stage →</a>
                </p>
              </div>
            </div>

            <div className="opl-twee">
              <div className="opl-blok">
                <span className="eyebrow">Na de opleiding</span>
                <h3>Aan de slag, of verder studeren</h3>
                <p>
                  Na het 6de jaar behalen de leerlingen hun diploma secundair onderwijs. Ze kunnen meteen aan de slag, onder meer als:
                </p>
                <ul className="jobs">
                  {JOBS.map((j) => <li key={j}>{j}</li>)}
                </ul>
                <p>Met hun diploma kunnen ze ook verder studeren, bijvoorbeeld in een graduaatsopleiding.</p>
              </div>
              <div className="opl-blok opl-cta">
                <span className="eyebrow">Voor bedrijven en organisaties</span>
                <h3>Een stagiair ontvangen?</h3>
                <p>
                  Een winkel, een kantoor, een hotel, een ziekenhuis of een gemeentehuis: overal waar mensen onthaald en geholpen
                  worden, is een stagiair welkom. U krijgt een duidelijke briefing, een digitaal contract en een vaste
                  stagebegeleider als aanspreekpunt.
                </p>
                <div className="knoppen">
                  <VraagKnop className="btn btn-blue">Stageplaats aanbieden</VraagKnop>
                  <Link href="/handleiding/stagegever" className="btn btn-line" style={{ fontWeight: 600 }}>Zo werkt het voor stagegevers</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="projecten" aria-labelledby="projtitel" className="wrap sectie">
          <div className="flow-kop">
            <div>
              <span className="eyebrow">Projecten en samenwerkingen</span>
              <h2 id="projtitel" className="h2-groot">Leren met echte opdrachten.</h2>
            </div>
            <p>Naast de stage werken de leerlingen aan projecten met winkels, organisaties en ondernemers uit de regio Kortrijk.</p>
          </div>
          <div className="projecten">
            {PROJECTEN.map((p, i) => (
              <div className="project" key={p.t}>
                <span className="nr">{String(i + 1).padStart(2, "0")}</span>
                <b>{p.t}</b>
                <span>{p.s}</span>
              </div>
            ))}
          </div>
          <div className="reis">
            <div className="streepjescode" aria-hidden="true" />
            <div>
              <span className="eyebrow">Studiereis</span>
              <h3>Elk jaar op retailreis</h3>
              <p>
                Elk jaar trekken leerlingen en begeleiders op studiereis naar een stad met een sterk winkelaanbod. We bezochten al
                onder meer Berlijn, Düsseldorf, Amsterdam en Rotterdam. Op het programma: winkelconcepten bekijken, cultuur
                opsnuiven en, wanneer ze plaatsvindt, EuroShop in Düsseldorf, de grootste retailbeurs van Europa (om de drie jaar).
              </p>
            </div>
            <ul className="steden" aria-label="Bestemmingen">
              {["Berlijn", "Düsseldorf", "Amsterdam", "Rotterdam"].map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
        </section>

        <section id="partners" aria-labelledby="parttitel" className="sectie-wit">
          <div className="wrap sectie">
            <div className="flow-kop">
              <div>
                <span className="eyebrow">Partners</span>
                <h2 id="parttitel" className="h2-groot">Met dank aan onze stagegevers.</h2>
              </div>
              <p>
                Zonder hen geen stage. We zijn onze stagegevers heel dankbaar voor de kansen die ze onze leerlingen geven,
                in winkels, op kantoren en aan onthaalbalies in Kortrijk en Zuid-West-Vlaanderen.
              </p>
            </div>
            {partners.length > 0 && (
              <ul className="partners">
                {partners.map((p) => {
                  const inhoud = p.logo
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={`/partners/logo/${p.id}?v=${p.versie ?? 0}`} alt={p.naam} loading="lazy" />
                    : <span>{p.naam}{p.gemeente ? <small>{p.gemeente}</small> : null}</span>;
                  const url = p.website ? (p.website.startsWith("http") ? p.website : `https://${p.website}`) : null;
                  return <li key={p.id}>{url ? <a className="p-kaart" href={url} target="_blank" rel="noreferrer noopener" title={p.naam}>{inhoud}</a> : <span className="p-kaart" title={p.naam}>{inhoud}</span>}</li>;
                })}
              </ul>
            )}
            <div className="partner-cta">
              <p><b>Ook stagegever worden?</b> Of staat uw logo er nog niet bij? Laat het ons weten.</p>
              <VraagKnop className="btn btn-dark">Neem contact op</VraagKnop>
            </div>
            <div className="snh-links">
              <span className="eyebrow">Meer op snh.be</span>
              <a href="https://www.snh.be/studieaanbod" target="_blank" rel="noreferrer">Studieaanbod Spes Nostra Heule <small>Organisatie en logistiek (3de-4de) · Onthaal, organisatie en sales (5de-6de)</small></a>
              <a href="https://www.snh.be/sites/spes_nostra_heule/files/wysiwyg/docs/brochures/studieaanbod_2-3de_graad_web.pdf" target="_blank" rel="noreferrer">Brochure 2de en 3de graad (pdf) <small>met de lessentabellen</small></a>
              <a href="https://www.snh.be/lessentabellen" target="_blank" rel="noreferrer">Lessentabellen <small>alle richtingen</small></a>
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
