"use client";

import { useMemo, useState } from "react";
import { IcDownload, IcFormulier, IcMap, IcZoek } from "@/components/Icons";

type Wie = "Stagegever" | "Stagiair" | "Ouder" | "Leraren" | "Iedereen";
type Actie = { t: string; href: string; hoofd?: boolean; download?: boolean };
type Doc = {
  titel: string;
  wie: Wie;
  tekst: string;
  soort: "form" | "file" | "folder";
  /** Knoppen: openen in de browser, pdf, downloaden of naar het platform. Zonder knoppen toont de lijst `status`. */
  acties?: Actie[];
  status?: string;
};
type Groep = { n: string; titel: string; sub: string; docs: Doc[] };

const PDF = (naam: string) => `/documenten/pdf/${naam}`;
const MIJN_STAGE: Actie = { t: "Naar Mijn stage", href: "/inloggen?rol=stagiair" };
const LINK: Actie = { t: "Link kwijt?", href: "/inloggen?rol=stagegever" };
const BEHEER: Actie = { t: "Naar het beheer", href: "/beheer" };
const bekijk = (naam: string): Actie => ({ t: "Formulier bekijken (pdf)", href: PDF(naam) });
const briefing = (wie: string): Actie[] => [{ t: "Openen", href: `/handleiding/${wie}`, hoofd: true }, { t: "Pdf", href: `/handleiding/${wie}/pdf` }];

const GROEPEN: Groep[] = [
  {
    n: "01",
    titel: "Top 3 stageplaatsen",
    sub: "De eerste stap voor de stagiair. Na goedkeuring gaat de stagiair langs bij de stageplaats.",
    docs: [
      { soort: "form", titel: "Mijn top 3 stageplaatsen", wie: "Stagiair", tekst: "Drie stageplaatsen in volgorde van voorkeur, telkens sales of onthaal. Je ouders gaan akkoord met je keuze.", acties: [MIJN_STAGE] },
      { soort: "form", titel: "Top 3 goedkeuren", wie: "Leraren", tekst: "In Stagedossiers: goedkeuren of een aanpassing vragen, met uitleg voor de stagiair.", acties: [BEHEER] },
    ],
  },
  {
    n: "02",
    titel: "Aanvraag en bevestiging",
    sub: "De stagiair vult samen met de mentor de aanvraag in. Na goedkeuring ligt de stage vast.",
    docs: [
      { soort: "form", titel: "Aanvraag stage", wie: "Stagiair", tekst: "Samen met de stagementor: gegevens van de stageplaats, de mentor, de werkvloer en de stagiair.", acties: [MIJN_STAGE] },
      { soort: "file", titel: "Bevestiging van de stage", wie: "Iedereen", tekst: "Automatisch per mail na goedkeuring: een pdf met alle gegevens en de stagekalender, samen met de infobrochure en de handleiding.", status: "Per mail" },
    ],
  },
  {
    n: "03",
    titel: "Contract",
    sub: "De stagegever vult aan en tekent eerst, daarna de stagiair (en een ouder bij een minderjarige), de school als laatste.",
    docs: [
      { soort: "form", titel: "Stagecontract", wie: "Stagegever", tekst: "Overeenkomst, activiteitenlijst, stagereglement en gedragscode, digitaal ondertekend via de persoonlijke link uit de mail.", acties: [LINK] },
      { soort: "file", titel: "Stagecontract: voorbeeld", wie: "Iedereen", tekst: "De volledige contracttekst met fictieve gegevens, ter inzage.", acties: [{ t: "Openen (pdf)", href: PDF("stagecontract-voorbeeld"), hoofd: true }] },
      { soort: "file", titel: "Activiteitenlijst", wie: "Stagegever", tekst: "Voorstel van de school per soort stage. Bij het contract stelt de stagegever de lijst voor zijn stagiair samen.", acties: [{ t: "Openen (pdf)", href: PDF("activiteitenlijst"), hoofd: true }] },
      { soort: "form", titel: "Risicoanalyse of werkpostfiche", wie: "Stagegever", tekst: "Op te laden bij het contract, vóór de eerste stagedag. Zonder werknemers bezorgt de school een werkpostfiche.", acties: [LINK] },
    ],
  },
  {
    n: "04",
    titel: "Werkrooster",
    sub: "Samen gepland vóór de eerste stagedag. De school keurt goed.",
    docs: [
      { soort: "form", titel: "Werkrooster", wie: "Iedereen", tekst: "Exact het aantal uren van de blokstage, op dinsdag tot en met zaterdag. De stagegever via zijn link, de stagiair in Mijn stage. Na goedkeuring als pdf.", status: "Online" },
      { soort: "folder", titel: "Roosters per leerling", wie: "Leraren", tekst: "In het dossier: goedkeuren, terugsturen of een wijziging bekijken.", acties: [BEHEER] },
    ],
  },
  {
    n: "05",
    titel: "Tijdens de stage",
    sub: "Afwezigheden, inhaalstage en het stagebezoek.",
    docs: [
      { soort: "form", titel: "Afwezigheid melden", wie: "Iedereen", tekst: "Stagiair en stagegever melden online. De stagiair verwittigt daarnaast vóór de start telefonisch de stageplaats, de stagebegeleiders en het secretariaat.", status: "Online" },
      { soort: "form", titel: "Inhaalstage plannen", wie: "Iedereen", tekst: "Woensdagnamiddag, zaterdag of vakantiedagen, tot 14 dagen na de stage. De stagegever bevestigt de gepresteerde uren.", status: "Online" },
      { soort: "folder", titel: "Stagebezoeken", wie: "Leraren", tekst: "Planning met routes op de kaart, verdeling over de stagebegeleiders en het bezoekformulier per stop.", acties: [BEHEER] },
    ],
  },
  {
    n: "06",
    titel: "Evaluatie",
    sub: "Tegen het einde van de stage. De stagiair ziet de evaluaties van de mentor en de school pas als de school ze openstelt.",
    docs: [
      { soort: "form", titel: "Evaluatie stagementor", wie: "Stagegever", tekst: "Houding, kennis, sales, onthaal en organisatie, teamwerk en algemene feedback. Online via de persoonlijke link.", acties: [bekijk("evaluatie-stagementor")] },
      { soort: "form", titel: "Bezoekformulier stagebegeleider", wie: "Leraren", tekst: "In te vullen bij het stagebezoek, vanuit het dossier of de bezoekroute.", acties: [bekijk("bezoekformulier")] },
      { soort: "form", titel: "Zelfevaluatie sales", wie: "Stagiair", tekst: "Voor de stage in een winkel. Online in Mijn stage.", acties: [bekijk("zelfevaluatie-sales")] },
      { soort: "form", titel: "Zelfevaluatie onthaal en organisatie", wie: "Stagiair", tekst: "Voor de stage aan een onthaal. Online in Mijn stage.", acties: [bekijk("zelfevaluatie-onthaal")] },
    ],
  },
  {
    n: "07",
    titel: "Afronding",
    sub: "Feedback van de stagegever en een stageattest voor de stagiair.",
    docs: [
      { soort: "form", titel: "Feedback over de samenwerking", wie: "Stagegever", tekst: "Twee minuten: hoe verliep de stage en wil u opnieuw een stagiair ontvangen? De stagiair ziet de antwoorden niet.", acties: [bekijk("feedback-stagegever")] },
      { soort: "file", titel: "Stageattest", wie: "Stagiair", tekst: "Met stageplaats, periode en gepresteerde uren. Na de afronding in Mijn stage en per mail.", status: "Na de stage" },
    ],
  },
  {
    n: "Altijd handig",
    titel: "Algemeen",
    sub: "Om op elk moment te raadplegen.",
    docs: [
      { soort: "file", titel: "Infobrochure stage 2026-2027", wie: "Iedereen", tekst: "De aanpak van de stage in Spes Nostra Heule.", acties: [{ t: "Openen", href: "/docs/infobrochure-stage-2026-2027.pdf", hoofd: true }, { t: "Downloaden", href: "/docs/infobrochure-stage-2026-2027.pdf", download: true }] },
      { soort: "file", titel: "Stagekalender 2026-2027", wie: "Iedereen", tekst: "De periodes van de blokstages met het aantal uren, en de vakantie- en feestdagen.", acties: [{ t: "Openen (pdf)", href: PDF("kalender"), hoofd: true }] },
      { soort: "file", titel: "Briefing per rol", wie: "Iedereen", tekst: "Wie doet wat tijdens de stage? Kies uw rol.", acties: [{ t: "Openen", href: "/handleiding", hoofd: true }] },
      { soort: "file", titel: "Handleiding voor stagegevers", wie: "Stagegever", tekst: "Bevestiging, digitaal contract, risicoanalyse, werkrooster, afwezigheden, evaluatie en afronding, stap voor stap.", acties: briefing("stagegever") },
      { soort: "file", titel: "Briefing voor de stagementor", wie: "Stagegever", tekst: "De eerste dag, begeleiding, stagebezoek en evaluatie: wat we van de mentor verwachten.", acties: briefing("mentor") },
      { soort: "file", titel: "Handleiding voor stagiairs", wie: "Stagiair", tekst: "Top 3, aanvraag, contract, werkrooster, evaluatie en afronding, stap voor stap.", acties: briefing("stagiair") },
      { soort: "file", titel: "Info voor ouders", wie: "Ouder", tekst: "Wat de stage inhoudt, wanneer u meetekent en wat te doen bij ziekte.", acties: briefing("ouder") },
    ],
  },
];

const FILTERS: ("Alles" | Exclude<Wie, "Iedereen">)[] = ["Alles", "Stagegever", "Stagiair", "Ouder", "Leraren"];

export default function DocumentenLijst() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Alles");
  const [zoek, setZoek] = useState("");

  const groepen = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    return GROEPEN.map((g) => ({
      ...g,
      docs: g.docs.filter(
        (d) =>
          (filter === "Alles" || d.wie === filter || d.wie === "Iedereen") &&
          (!q || `${d.titel} ${d.tekst}`.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.docs.length);
  }, [filter, zoek]);

  return (
    <>
      <div className="doc-kop">
        <div>
          <span className="eyebrow">Documenten</span>
          <h1>Elk document bij zijn stap.</h1>
          <p className="lead" style={{ fontSize: 16 }}>
            Geordend in de volgorde van de stage. Formulieren vul je online in: de stagiair in Mijn stage, de stagegever via de
            persoonlijke link uit de mail. Handleidingen en formulieren open je in de browser of als pdf.
          </p>
        </div>
        <label className="zoek">
          <IcZoek color="#5A6578" />
          <span className="sr-only">Zoeken in documenten</span>
          <input type="search" placeholder="Zoek een document" value={zoek} onChange={(e) => setZoek(e.target.value)} />
        </label>
      </div>

      <div className="filters" role="group" aria-label="Filter op rol">
        {FILTERS.map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {groepen.length === 0 && <p className="lead">Geen documenten gevonden.</p>}

      {groepen.map((g) => (
        <section className="doc-groep" key={g.titel} aria-labelledby={`g-${g.n}`}>
          <div className="doc-groep-kop">
            <span className="n">{g.n}</span>
            <h2 id={`g-${g.n}`}>{g.titel}</h2>
            <span>{g.sub}</span>
          </div>
          <ul className="doc-lijst">
            {g.docs.map((d) => (
              <li key={d.titel}>
                <div className={`doc-ic${d.soort === "form" ? " form" : ""}`}>
                  {d.soort === "form" ? <IcFormulier /> : d.soort === "folder" ? <IcMap /> : <IcDownload />}
                </div>
                <div className="doc-tekst">
                  <div>
                    <b>{d.titel}</b>
                    <span className="wie">{d.wie}</span>
                  </div>
                  <span>{d.tekst}</span>
                </div>
                {d.acties?.length ? (
                  <div className="doc-acties">
                    {d.acties.map((a) => (
                      <a key={a.t} className={`doc-actie${a.hoofd ? " blauw" : ""}`} href={a.href}
                        {...(a.download ? { download: true } : a.href.startsWith("/documenten/pdf/") || a.href.endsWith(".pdf") || a.href.endsWith("/pdf") ? { target: "_blank", rel: "noreferrer" } : {})}>
                        {a.t}
                      </a>
                    ))}
                  </div>
                ) : (
                  <span className="doc-niet">{d.status}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
