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
          <li>In Smartschool: <b>Gebruikersbeheer</b>, kies links een klas (bv. 6OS1), tabblad <b>Lijsten</b>, rechts exporteren als <b>MS Excel</b>.</li>
          <li>Open het bestand in Excel, selecteer alles (met de titelrij) en kopieer. Of bewaar het als CSV-bestand.</li>
          <li>Plak de rijen hieronder of kies het bestand. Staat er geen kolom Klas in, kies dan de klas. Klik op <b>Importeren</b>.</li>
          <li>Herhaal voor elke klas: 4OL1, 4OL2, 5OS1, 5OS2, 5OS3, 6OS1 en 6OS2.</li>
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
