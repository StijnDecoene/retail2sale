import type { Metadata } from "next";
import Handleiding from "@/components/Handleiding";

export const metadata: Metadata = {
  title: "Handleiding voor stagiairs",
  description: "Zo regel je je stage: top 3, aanvraag, contract, werkrooster en wat te doen tijdens de stage.",
};

export default function HandleidingStagiair() {
  return (
    <Handleiding
      voor="Stagiair"
      titel="Zo regel je je stage"
      intro="Je stage regel je stap voor stap op het stageplatform: van je top 3 tot het contract. Hier lees je wat je moet doen en wanneer."
      andere={{ href: "/handleiding/stagegever", tekst: "Handleiding voor stagegevers" }}
      kort={[
        "Je kiest drie stageplaatsen: je top 3.",
        "De stagebegeleiding keurt er één of twee goed.",
        "Je gaat langs, stelt je voor en vult samen met de stagementor de aanvraag in.",
        "Na goedkeuring krijg je een bevestiging. De stagegever tekent het contract, daarna teken jij (en een ouder als je jonger bent dan 18).",
        "Je legt samen met de stagegever je werkrooster vast. Dan kan de stage beginnen.",
      ]}
      stappen={[
        {
          titel: "Inloggen",
          tekst: (
            <p>Ga naar het stageplatform, klik op <b>Inloggen</b> en kies <b>Stagiair</b>. Je logt in met je Smartschool-account. Je komt in <b>Mijn stage</b>: daar zie je alle stappen en wat je nu moet doen.</p>
          ),
          tip: "Een stap met een blauw uitroepteken is aan jou. Een stap met drie puntjes ligt bij de school of de stagegever.",
        },
        {
          titel: "Je top 3 kiezen",
          wanneer: "Vóór de deadline die bovenaan in Mijn stage staat",
          tekst: <p>Kies drie stageplaatsen in volgorde van voorkeur. Per keuze:</p>,
          punten: [
            <><b>Sales of onthaal</b>: je loopt één keer stage in een winkel (sales) en één keer aan een onthaal of receptie.</>,
            "de soort zaak, de naam, het adres en eventueel de website;",
            "hoe je er geraakt en waarom je die plaats kiest (voor keuze 1 en 2).",
          ],
          tip: "Begin de naam te typen: gekende stageplaatsen verschijnen dan met hun adres. Staat er een melding dat er al iemand stage loopt, dan mag je de plaats kiezen, maar de stagebegeleiding kijkt of er nog plaats is.",
        },
        {
          titel: "Top 3 indienen",
          tekst: (
            <>
              <p>Bespreek je keuzes met je ouders en vink aan dat ze akkoord gaan. Je kan tussendoor <b>bewaren als concept</b>. Ben je klaar, klik dan op <b>Top 3 indienen</b>. Daarna kan je niets meer wijzigen.</p>
              <p>De stagebegeleiding keurt één of twee keuzes goed, of vraagt een aanpassing. Dat zie je in Mijn stage, met de uitleg erbij.</p>
            </>
          ),
        },
        {
          titel: "Langsgaan en de aanvraag invullen",
          wanneer: "Na de goedkeuring van je top 3",
          tekst: (
            <>
              <p>Ga langs bij de goedgekeurde stageplaats, stel jezelf voor en vraag of je er stage mag lopen. Zegt de zaak ja, vul dan <b>samen met de stagementor</b> de aanvraag in. Je hebt nodig:</p>
            </>
          ),
          punten: [
            "de naam, het adres en het telefoonnummer van de zaak (het ondernemingsnummer als de mentor het weet);",
            "de naam, de functie, het e-mailadres en het telefoonnummer van de mentor;",
            "je taken, het startuur op de eerste dag en de kledij;",
            "je geboortedatum, je gsm-nummer en iemand die we bij nood kunnen verwittigen;",
            "de drie afspraken: het aantal uren, geen stage op maandag, en geen stage bij familie.",
          ],
          tip: "Werden twee keuzes goedgekeurd, duid dan eerst aan waar je aangenomen bent.",
        },
        {
          titel: "De bevestiging",
          tekst: <p>Keurt de stagebegeleiding je aanvraag goed, dan ligt je stage vast. Jij en de stagegever krijgen een mail met de bevestiging, de stagekalender en de infobrochure.</p>,
        },
        {
          titel: "Het contract ondertekenen",
          tekst: (
            <>
              <p>Eerst vult de stagegever het contract aan en tekent. Daarna is het jouw beurt: in Mijn stage staat bij <b>Contract</b> de knop <b>Contract ondertekenen</b>.</p>
              <p>Lees het contract, vul je adres in (straat, nummer, eventueel bus, postcode en gemeente), vink het akkoord aan en teken met je vinger of muis.</p>
            </>
          ),
          punten: [
            <><b>Jonger dan 18 op je eerste stagedag?</b> Dan tekent ook een ouder of voogd. Dat kan meteen na jou op hetzelfde toestel.</>,
            <><b>18 of ouder?</b> Dan teken je zelf en is er geen handtekening van een ouder nodig.</>,
          ],
          tip: "De school tekent als laatste. Daarna krijg je het volledige contract als pdf.",
        },
        {
          titel: "Je werkrooster",
          wanneer: "Vóór de eerste stagedag",
          tekst: <p>Leg samen met je stagementor je werkrooster vast: het aantal uur van de blokstage (meestal 120 uur), op dinsdag tot en met zaterdag. Ben je jonger dan 18, dan werk je maximum 8 uur per dag en niet na 20u.</p>,
        },
        {
          titel: "Tijdens de stage",
          tekst: <p>Wees minstens 10 minuten voor de start aanwezig, draag verzorgde kledij en volg de afspraken van de zaak.</p>,
          punten: [
            <><b>Ziek of afwezig?</b> Verwittig vóór de start telefonisch en persoonlijk de winkel, beide stagebegeleiders en het secretariaat van de school. Bezorg daarna een doktersattest aan het secretariaat en een kopie aan de winkel.</>,
            "Gemiste uren haal je in: op woensdagnamiddag, op zaterdag of in de vakantie, tot 14 dagen na de stage.",
            "Plan tijdens je stage-uren geen afspraken bij de dokter, rijles of uitstappen.",
          ],
        },
      ]}
      vragen={[
        { v: "Mijn top 3 werd teruggestuurd.", a: <p>Lees de uitleg van de stagebegeleiding in Mijn stage, pas je top 3 aan en dien hem opnieuw in.</p> },
        { v: "De winkel van mijn eerste keuze zegt nee.", a: <p>Ga langs bij je tweede goedgekeurde keuze. Werd maar één keuze goedgekeurd, neem dan contact op met de stagebegeleiding.</p> },
        { v: "Ik heb een fout gemaakt in mijn aanvraag.", a: <p>Is ze nog niet ingediend, pas ze dan gewoon aan. Is ze al ingediend, mail dan naar retail2sale@snh.be: de stagebegeleiding kan ze terugsturen zodat je ze kan verbeteren.</p> },
        { v: "Mijn ouder kan niet meteen meetekenen.", a: <p>Geen probleem: je ouder kan later tekenen via dezelfde knop in Mijn stage. De stagebegeleiding kan ook een aparte link naar je ouder sturen.</p> },
      ]}
    />
  );
}
