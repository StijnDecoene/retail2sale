import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = { title: "Privacyverklaring" };

// Voorlopige tekst. Laten nakijken door de school (DPO) voor de site publiek gaat.
export default function Privacy() {
  return (
    <>
      <Header actief="andere" />
      <main className="wrap tekstpagina">
        <span className="eyebrow">Privacy</span>
        <h1>Privacyverklaring Retail2Sale</h1>
        <p>
          Deze website is van Spes Nostra Heule, Heulsekasteelstraat 2A, 8501 Heule. Hieronder lees je welke gegevens we via
          deze site verwerken en waarom.
        </p>
        <h2>Contactformulier</h2>
        <p>
          Als je een vraag stelt, bewaren we je naam, e-mailadres, eventueel je telefoonnummer, organisatie en klas, en je
          vraag. We gebruiken die gegevens alleen om je vraag te beantwoorden. Enkel de stagebegeleiders van Retail2Sale
          kunnen ze lezen. We verwijderen je vraag uiterlijk aan het einde van het schooljaar volgend op je vraag.
        </p>
        <h2>Waar de gegevens staan</h2>
        <p>
          De gegevens worden opgeslagen bij Supabase, in een datacenter in de Europese Unie. De website zelf wordt gehost door
          Vercel.
        </p>
        <h2>Je rechten</h2>
        <p>
          Je kan altijd vragen welke gegevens we van je hebben, ze laten verbeteren of laten verwijderen. Mail daarvoor naar{" "}
          <a href="mailto:retail2sale@snh.be">retail2sale@snh.be</a>. Voor het volledige privacybeleid van de school, zie{" "}
          <a href="https://www.snh.be">www.snh.be</a>.
        </p>
      </main>
      <Footer />
    </>
  );
}
