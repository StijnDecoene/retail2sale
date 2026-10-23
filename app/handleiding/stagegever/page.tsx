import type { Metadata } from "next";
import Handleiding from "@/components/Handleiding";

export const metadata: Metadata = {
  title: "Handleiding voor stagegevers",
  description: "Zo verloopt de stage voor de stagegever: bevestiging, digitaal contract, werkrooster, stagebezoek en evaluatie.",
};

export default function HandleidingStagegever() {
  return (
    <Handleiding
      voor="Stagegever"
      titel="Zo verloopt de stage voor u als stagegever"
      intro="Bedankt dat u een stagiair van Spes Nostra Heule ontvangt. Alles verloopt digitaal en u hoeft nergens een account voor aan te maken: u krijgt telkens een persoonlijke link per mail."
      andere={{ href: "/handleiding/stagiair", tekst: "Handleiding voor stagiairs" }}
      kort={[
        "U krijgt een mail dat de stage vastligt, met een persoonlijke link naar het stagecontract.",
        "U vult het contract aan en tekent digitaal. Dat duurt ongeveer vijf minuten.",
        "Daarna tekenen de stagiair, een ouder (bij een minderjarige stagiair) en de school. U krijgt het contract als pdf.",
        "U legt samen met de stagiair het werkrooster vast vóór de eerste stagedag.",
        "Tijdens de stage komt de stagebegeleider op bezoek. Op het einde vult u een evaluatie in.",
      ]}
      stappen={[
        {
          titel: "U ontvangt de bevestiging",
          wanneer: "Zodra de school de stage-aanvraag heeft goedgekeurd",
          tekst: <p>U krijgt een mail van <b>retail2sale@snh.be</b> met als onderwerp &ldquo;Stage bevestigd&rdquo;. Daarin staan de periode, de planning en de belangrijkste gegevens. In bijlage:</p>,
          punten: [
            "een pdf met de bevestiging, alle gegevens en de stagekalender (met de vakantie- en feestdagen);",
            "de infobrochure over de aanpak van de stage in onze school.",
          ],
          tip: "Bewaar deze mail: de knop om het contract te openen staat erin.",
        },
        {
          titel: "Het stagecontract openen",
          tekst: (
            <>
              <p>Klik in de mail op <b>Stagecontract invullen en ondertekenen</b>. Het contract opent in uw browser, op computer, tablet of gsm. U hoeft niet in te loggen: de link is persoonlijk.</p>
              <p>Bovenaan ziet u &ldquo;Je opent dit contract als stagegever&rdquo;. Het contract heeft drie stappen: <b>lezen</b>, <b>gegevens aanvullen</b> en <b>ondertekenen</b>.</p>
            </>
          ),
          tip: "Deel de link enkel met wie namens uw zaak tekent: wie de link heeft, kan het contract aanvullen en ondertekenen.",
        },
        {
          titel: "Lezen",
          tekst: (
            <p>U kan het contract rustig doorlezen of meteen verder gaan met <b>Lezen overslaan</b>. Het contract blijft altijd raadpleegbaar. Gegevens die al ingevuld zijn, staan in het blauw; wat nog ontbreekt, staat in het geel.</p>
          ),
        },
        {
          titel: "Gegevens nakijken en aanvullen",
          tekst: <p>De gegevens uit de stage-aanvraag staan al ingevuld. Kijk ze na en vul aan wat ontbreekt:</p>,
          punten: [
            <><b>Naam ondertekenaar</b> en <b>hoedanigheid</b> (zaakvoerder, bestuurder, gerant, eigenaar of verantwoordelijke namens de zaakvoerder). Verplicht.</>,
            <><b>Stageplaats</b>: naam, adres van de zetel, telefoon, e-mail en ondernemingsnummer.</>,
            <><b>Paritair comité</b> en <b>RSZ-kengetal</b>: vraag ze na bij uw boekhouder of sociaal secretariaat als u ze niet kent. Ze zijn niet verplicht.</>,
            <><b>Mentor</b> op de werkvloer, met gsm-nummer. De naam is verplicht.</>,
            <><b>Risicoanalyse</b>: duid aan of u een risicoanalyse of werkpostfiche hebt (die bezorgt u vóór de start), of dat u geen werknemers hebt (dan stuurt de school u een werkpostfiche).</>,
            <><b>Bijzondere afspraken</b>: toestellen of taken die de stagiair niet mag gebruiken of doen, en andere afspraken zoals kledij of pauzes.</>,
          ],
          tip: "Klik op Bewaren en verder. Zolang u niet getekend hebt, kan u de gegevens nog aanpassen.",
        },
        {
          titel: "Ondertekenen",
          tekst: (
            <>
              <p>Vul de plaats in waar u tekent, vink het akkoord aan en zet uw handtekening in het vak, met de muis, uw vinger of een pen. Klik daarna op <b>Ondertekenen</b>.</p>
              <p>Een digitale handtekening heeft dezelfde waarde als een handtekening op papier. Een papieren versie is niet nodig.</p>
            </>
          ),
          tip: "Na uw handtekening kan u de gegevens niet meer zelf wijzigen. Klopt er toch iets niet, mail dan naar retail2sale@snh.be.",
        },
        {
          titel: "De andere partijen tekenen",
          tekst: (
            <p>Na u tekenen de stagiair en, bij een minderjarige stagiair, een ouder of voogd. De school tekent als laatste. Zodra iedereen getekend heeft, krijgt u het volledige contract als pdf. Via dezelfde link kan u het contract altijd opnieuw bekijken of downloaden.</p>
          ),
        },
        {
          titel: "Het werkrooster vastleggen",
          wanneer: "Vóór de eerste stagedag",
          tekst: <p>Leg samen met de stagiair het werkrooster vast. De regels:</p>,
          punten: [
            "het aantal uur van de blokstage (meestal 120 uur), gemiddeld 24 uur per week;",
            "stage op dinsdag tot en met zaterdag: op maandag is de stagiair op school;",
            "geen stage op zon- en feestdagen, tenzij in overleg;",
            "voor een stagiair jonger dan 18: maximum 8 uur per dag en 40 uur per week, minstens 12 uur rust tussen twee werkdagen, geen werk tussen 20u en 6u, en een uur pauze bij meer dan zes uur werk.",
          ],
          tip: "Bezorg het rooster aan retail2sale@snh.be. Binnenkort kan u het rooster ook rechtstreeks via het stageplatform doorgeven.",
        },
        {
          titel: "Tijdens de stage",
          tekst: (
            <>
              <p>De mentor zorgt voor een goed onthaal, legt de werking en de taken uit en begeleidt de stagiair op de werkvloer. De stagebegeleider komt minstens één keer op bezoek, zonder dat vooraf te melden.</p>
              <p><b>Afwezig?</b> De stagiair verwittigt u vóór de start van de stage. Afgesproken uren die niet gepresteerd zijn, moeten worden ingehaald: op woensdagnamiddag, op zaterdag of in de vakantie, tot 14 dagen na de stage. Meld afwezigheden en inhaalmomenten aan de stagebegeleiding.</p>
            </>
          ),
        },
        {
          titel: "Evaluatie",
          wanneer: "Op het einde van de stage",
          tekst: <p>U beoordeelt de attitudes en competenties van de stagiair. U krijgt daarvoor tijdig een link. De stagebegeleiding bespreekt de evaluatie met de stagiair.</p>,
        },
      ]}
      vragen={[
        { v: "De link werkt niet.", a: <p>Kopieer de volledige link uit de mail en plak hem in de adresbalk van uw browser. Werkt het nog niet, mail dan naar retail2sale@snh.be: we sturen een nieuwe link.</p> },
        { v: "Iemand anders moet tekenen dan de mentor.", a: <p>Dat kan. Vul bij <b>Naam ondertekenaar</b> de naam in van wie tekent, en geef de link aan die persoon. U kan ook de stagebegeleiding vragen om de link rechtstreeks naar die persoon te mailen.</p> },
        { v: "Ik heb mij vergist na het tekenen.", a: <p>Mail naar retail2sale@snh.be. De stagebegeleiding past het contract aan; u hoeft niet opnieuw te tekenen.</p> },
        { v: "Waarom tekent een ouder mee?", a: <p>Een minderjarige stagiair wordt vertegenwoordigd door een ouder of voogd. Is de stagiair op de eerste stagedag 18 jaar of ouder, dan tekent de stagiair zelf en is er geen handtekening van een ouder nodig.</p> },
        { v: "Moet ik de stagiair betalen?", a: <p>Nee. De stage wordt niet betaald. Woon-werkverplaatsingen zijn ten laste van de stagiair; verplaatsingen in uw opdracht tijdens de stage zijn ten laste van u.</p> },
        { v: "Is de stagiair verzekerd?", a: <p>Ja. De school heeft een verzekering voor de stage. Meld een ongeval onmiddellijk aan de stagebegeleiding.</p> },
        { v: "Wat gebeurt er met de gegevens?", a: <p>De school gebruikt de gegevens enkel om de stage te organiseren en op te volgen. Ze worden veilig bewaard in de Europese Unie. Meer in de <a href="/privacy">privacyverklaring</a>.</p> },
      ]}
    />
  );
}
