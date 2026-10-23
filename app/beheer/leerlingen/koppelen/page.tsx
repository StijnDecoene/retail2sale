import Link from "next/link";
import Koppelen from "./Koppelen";
import { serverClient } from "@/lib/supabase/server";
import { schooljaarVan, vandaagIso, type Blok } from "@/lib/beheer";

export const metadata = { title: "Stageplaatsen koppelen" };

export default async function KoppelenPagina() {
  const sj = schooljaarVan();
  const vandaag = vandaagIso();
  const sb = await serverClient();
  const [lR, pR, bR] = await Promise.all([
    sb.from("leerlingen").select("id, voornaam, naam, klas").eq("schooljaar", sj),
    sb.from("stageplaatsen").select("id, naam, gemeente"),
    sb.from("blokken").select("*").eq("schooljaar", sj).order("start_datum"),
  ]);
  const blokken = (bR.data ?? []) as Blok[];
  const huidig =
    blokken.find((b) => b.start_datum <= vandaag && vandaag <= b.eind_datum) ?? blokken.find((b) => b.start_datum > vandaag) ?? blokken[0];

  return (
    <>
      <p className="bh-kruimel"><Link href="/beheer/leerlingen">← Leerlingen</Link></p>
      <header className="bh-top">
        <div>
          <h1>Stageplaatsen koppelen</h1>
          <p className="sub">Per leerling de stageplaats en de mentor in het dossier zetten, vanuit een stagelijst.</p>
        </div>
      </header>
      <section className="bh-card bh-uitleg">
        <ol>
          <li>Zorg dat de <Link href="/beheer/leerlingen/import">klaslijst</Link> en de <Link href="/beheer/stageplaatsen/import">stageplaatsen</Link> al geïmporteerd zijn.</li>
          <li>Kies een CSV-bestand of plak de rijen uit Excel: per leerling de naam, de klas en de stageplaats (met gemeente), eventueel de mentor.</li>
          <li>Kijk in het voorbeeld na of elke leerling en stageplaats gevonden is, en klik op <b>Koppelen</b>.</li>
        </ol>
        <p className="sm">
          Enkel lege gegevens worden ingevuld. Staat een leerling in het dossier al bij een andere stageplaats, dan blijft die
          staan en krijg je een melding.
        </p>
      </section>
      {(lR.data ?? []).length === 0 ? (
        <section className="bh-card"><div className="bh-leeg"><b>Nog geen leerlingen voor {sj}</b>Importeer eerst de <Link href="/beheer/leerlingen/import">klaslijst</Link>.</div></section>
      ) : (
        <Koppelen
          leerlingen={(lR.data ?? []) as { id: string; voornaam: string; naam: string; klas: string }[]}
          plaatsen={(pR.data ?? []) as { id: string; naam: string; gemeente: string | null }[]}
          blokken={blokken.map((b) => ({ id: b.id, naam: b.naam }))}
          standaardBlok={huidig?.id ?? ""}
        />
      )}
    </>
  );
}
