"use client";

import { useMemo, useState } from "react";
import { IcDownload, IcFormulier, IcMap, IcZoek } from "@/components/Icons";

type Wie = "Stagegever" | "Stagiair" | "Leraren" | "Iedereen";
type Doc = {
  titel: string;
  wie: Wie;
  tekst: string;
  soort: "form" | "file" | "folder";
  /** Link naar een bestand of pagina. Zonder link toont de lijst `status`. */
  href?: string;
  status?: string;
};
type Groep = { n: string; titel: string; sub: string; docs: Doc[] };

// Formulieren lopen straks via het stageportaal; tot het portaal open is, staan ze als "In het portaal".
const PORTAAL = "In het portaal";

const GROEPEN: Groep[] = [
  {
    n: "01",
    titel: "Top 3 stageplaatsen",
    sub: "De eerste stap voor de stagiair. Na goedkeuring opent de aanvraag.",
    docs: [
      { soort: "form", titel: "Mijn top 3 stageplaatsen", wie: "Stagiair", tekst: "Drie stageplaatsen in volgorde van voorkeur, met een korte motivatie per keuze.", status: PORTAAL },
      { soort: "form", titel: "Top 3 goedkeuren", wie: "Leraren", tekst: "Alle ingediende top 3's per klas: goedkeuren of een aanpassing vragen.", status: PORTAAL },
    ],
  },
  {
    n: "02–03",
    titel: "Aanvraag en contract",
    sub: "Na goedkeuring van de top 3. Stagiair en stagegever vullen in, de school keurt goed.",
    docs: [
      { soort: "form", titel: "Aanvraag stage", wie: "Stagegever", tekst: "Gegevens van de stageplaats, de mentor en de stagiair.", status: PORTAAL },
      { soort: "form", titel: "Stagecontract", wie: "Stagegever", tekst: "Overeenkomst, stagereglement en gedragscode in één bundel, digitaal ondertekend.", status: PORTAAL },
      { soort: "file", titel: "Stagecontract – inkijkexemplaar", wie: "Iedereen", tekst: "Enkel ter raadpleging, als pdf.", status: "Binnenkort" },
    ],
  },
  {
    n: "04",
    titel: "Werkrooster",
    sub: "Samen met de stagiair, vóór de eerste stagedag.",
    docs: [
      { soort: "form", titel: "Werkrooster", wie: "Stagegever", tekst: "120 uur per blokstage, gemiddeld 20 à 24 uur per week.", status: PORTAAL },
      { soort: "folder", titel: "Bibliotheek werkroosters", wie: "Leraren", tekst: "Alle goedgekeurde roosters per leerling en per klas.", status: PORTAAL },
    ],
  },
  {
    n: "05",
    titel: "Tijdens de stage",
    sub: "Alleen nodig als de stagiair afwezig is.",
    docs: [
      { soort: "form", titel: "Afwezigheid melden", wie: "Stagegever", tekst: "Niet-gepresteerde uren moeten worden ingehaald, tenzij de school de afwezigheid wettigt.", status: PORTAAL },
      { soort: "form", titel: "Inhaalstage plannen", wie: "Stagegever", tekst: "Woensdagnamiddag, zaterdag of vakantiedagen, tot 14 dagen na de stage.", status: PORTAAL },
    ],
  },
  {
    n: "06",
    titel: "Evaluatie",
    sub: "Opent automatisch tegen het einde van de stage.",
    docs: [
      { soort: "form", titel: "Evaluatie stagementor", wie: "Stagegever", tekst: "Attitudes en werkgerelateerde competenties van de stagiair.", status: "Nog niet beschikbaar" },
      { soort: "form", titel: "Zelfevaluatie en reflectie", wie: "Stagiair", tekst: "Competenties onthaal, organisatie en sales.", status: "Nog niet beschikbaar" },
      { soort: "form", titel: "Stagebezoek leraar", wie: "Leraren", tekst: "In te vullen bij een stagebezoek of verkoopgesprek.", status: "Nog niet beschikbaar" },
    ],
  },
  {
    n: "07",
    titel: "Afronding",
    sub: "Het stageverslag sluit de stage af.",
    docs: [
      { soort: "file", titel: "Hoe maak ik een stageverslag?", wie: "Stagiair", tekst: "Stappenplan voor het Portfolio op Smartschool.", status: "Binnenkort" },
    ],
  },
  {
    n: "Altijd handig",
    titel: "Algemeen",
    sub: "Om op elk moment te raadplegen.",
    docs: [
      { soort: "file", titel: "Infobrochure stage 2026-2027", wie: "Iedereen", tekst: "De aanpak van de stage in Spes Nostra Heule.", href: "/docs/infobrochure-stage-2026-2027.pdf" },
      { soort: "file", titel: "Kalender 2026-2027", wie: "Iedereen", tekst: "Alle data voor stage, blokstage en verlofdagen.", status: "Binnenkort" },
      { soort: "file", titel: "Handleiding stageportaal", wie: "Iedereen", tekst: "Inloggen en de verschillende onderdelen van het portaal.", status: "Binnenkort" },
    ],
  },
];

const FILTERS: ("Alles" | Exclude<Wie, "Iedereen">)[] = ["Alles", "Stagegever", "Stagiair", "Leraren"];

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
            Geordend in de volgorde van de stage. Formulieren vul je straks online in via het stageportaal; de rest kan je
            hier raadplegen of downloaden.
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
                {d.href ? (
                  <a className="doc-actie blauw" href={d.href} download>
                    Downloaden
                  </a>
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
