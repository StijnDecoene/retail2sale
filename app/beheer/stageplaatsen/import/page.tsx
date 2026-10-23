import Link from "next/link";
import ImporterenPlaatsen from "./ImporterenPlaatsen";

export const metadata = { title: "Stageplaatsen importeren" };

export default function ImportPlaatsenPagina() {
  return (
    <>
      <p className="bh-kruimel"><Link href="/beheer/stageplaatsen">← Stageplaatsen</Link></p>
      <header className="bh-top">
        <div>
          <h1>Stageplaatsen importeren</h1>
          <p className="sub">Een bestaande lijst in één keer overnemen, zonder alles opnieuw in te typen.</p>
        </div>
      </header>
      <section className="bh-card bh-uitleg">
        <ol>
          <li>Bewaar de lijst als CSV-bestand, of open ze in Excel en kopieer de rijen (met de titelrij).</li>
          <li>Kies hieronder het bestand of plak de rijen. Controleer welke kolom waarvoor dient en klik op <b>Importeren</b>.</li>
        </ol>
        <p className="sm">
          Een stageplaats die al in de databank staat, wordt herkend aan het ondernemingsnummer, anders aan naam en gemeente.
          Daar worden enkel lege velden aangevuld: wat je al ingevuld hebt, blijft staan. Er wordt niets verwijderd. Nieuwe
          stageplaatsen krijgen de status <i>Werkt mee</i>.
        </p>
      </section>
      <ImporterenPlaatsen />
    </>
  );
}
