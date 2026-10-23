import Link from "next/link";
import Importeren from "./Importeren";
import { schooljaarVan } from "@/lib/beheer";

export const metadata = { title: "Klaslijst importeren" };

export default function ImportPagina() {
  return (
    <>
      <p className="bh-kruimel"><Link href="/beheer/leerlingen">← Leerlingen</Link></p>
      <header className="bh-top">
        <div>
          <h1>Klaslijst importeren</h1>
          <p className="sub">Leerlingen uit Smartschool in één keer toevoegen of bijwerken.</p>
        </div>
      </header>
      <section className="bh-card bh-uitleg">
        <ol>
          <li>Maak in Smartschool een export van de klassen <b>4OL, 4OS, 5OS en 6OS</b> met voornaam, naam, klas, gebruikersnaam en e-mailadres.</li>
          <li>Bewaar ze als CSV-bestand, of open ze in Excel en kopieer de rijen (met de titelrij).</li>
          <li>Kies hieronder het bestand of plak de rijen. Controleer welke kolom waarvoor dient en klik op <b>Importeren</b>.</li>
        </ol>
        <p className="sm">
          Bestaande leerlingen worden herkend aan de gebruikersnaam, anders aan het e-mailadres of aan naam en klas. Hun klas
          en e-mailadres worden bijgewerkt; er wordt niets verwijderd.
        </p>
      </section>
      <Importeren schooljaar={schooljaarVan()} />
    </>
  );
}
