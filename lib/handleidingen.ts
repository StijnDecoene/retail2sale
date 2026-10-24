// Inhoud van de handleidingen: één bron voor de webpagina en de pdf.
// Opmaak in de tekst: **vet** en [tekst](link).

export type Wie = "stagegever" | "stagiair";
export type HStap = { titel: string; wanneer?: string; tekst: string[]; punten?: string[]; tip?: string };
export type HVraag = { v: string; a: string };
export type HandleidingInhoud = {
  wie: Wie;
  voor: string;
  titel: string;
  beschrijving: string;
  intro: string;
  kort: string[];
  stappen: HStap[];
  vragen: HVraag[];
  andere: { href: string; tekst: string };
};

export const CONTACT = "Mail naar [retail2sale@snh.be](mailto:retail2sale@snh.be) of bel een van de stagebegeleiders: Fien Claeys (0498 64 48 89) of Stijn Decoene (0479 28 85 07).";

export const HANDLEIDINGEN: Record<Wie, HandleidingInhoud> = {
  stagegever: {
    wie: "stagegever",
    voor: "Stagegever",
    titel: "Zo verloopt de stage voor u als stagegever",
    beschrijving: "Zo verloopt de stage voor de stagegever: bevestiging, digitaal contract, werkrooster, stagebezoek en evaluatie.",
    intro: "Bedankt dat u een stagiair van Spes Nostra Heule ontvangt. Alles verloopt digitaal en u hoeft nergens een account voor aan te maken: u krijgt telkens een persoonlijke link per mail.",
    andere: { href: "/handleiding/stagiair", tekst: "Handleiding voor stagiairs" },
    kort: [
      "U krijgt een mail dat de stage vastligt, met een persoonlijke link naar het stagecontract.",
      "U vult het contract aan en tekent digitaal. Dat duurt ongeveer vijf minuten.",
      "Daarna tekenen de stagiair, een ouder (bij een minderjarige stagiair) en de school. U krijgt het contract als pdf.",
      "U plant samen met de stagiair het werkrooster op het platform, vóór de eerste stagedag.",
      "Tijdens de stage komt de stagebegeleider op bezoek. Op het einde vult u een evaluatie in.",
    ],
    stappen: [
      {
        titel: "U ontvangt de bevestiging",
        wanneer: "Zodra de school de stage-aanvraag heeft goedgekeurd",
        tekst: ["U krijgt een mail van **retail2sale@snh.be** met als onderwerp “Stage bevestigd”. Daarin staan de periode, de planning en de belangrijkste gegevens. In bijlage:"],
        punten: [
          "een pdf met de bevestiging, alle gegevens en de stagekalender (met de vakantie- en feestdagen);",
          "de infobrochure over de aanpak van de stage in onze school;",
          "deze handleiding.",
        ],
        tip: "Bewaar deze mail: de knop om het contract te openen staat erin.",
      },
      {
        titel: "Het stagecontract openen",
        tekst: [
          "Klik in de mail op **Stagecontract invullen en ondertekenen**. Het contract opent in uw browser, op computer, tablet of gsm. U hoeft niet in te loggen: de link is persoonlijk.",
          "Bovenaan ziet u “Je opent dit contract als stagegever”. Het contract heeft drie stappen: **lezen**, **gegevens aanvullen** en **ondertekenen**.",
        ],
        tip: "Deel de link enkel met wie namens uw zaak tekent: wie de link heeft, kan het contract aanvullen en ondertekenen.",
      },
      {
        titel: "Lezen",
        tekst: ["U kan het contract rustig doorlezen of meteen verder gaan met **Lezen overslaan**. Het contract blijft altijd raadpleegbaar. Gegevens die al ingevuld zijn, staan in het blauw; wat nog ontbreekt, staat in het geel."],
      },
      {
        titel: "Gegevens nakijken en aanvullen",
        tekst: ["De gegevens uit de stage-aanvraag staan al ingevuld. Kijk ze na en vul aan wat ontbreekt:"],
        punten: [
          "**Naam ondertekenaar** en **hoedanigheid** (zaakvoerder, bestuurder, gerant, eigenaar of verantwoordelijke namens de zaakvoerder). Verplicht.",
          "**Stageplaats**: naam, adres van de zetel, telefoon, e-mail en ondernemingsnummer.",
          "**Paritair comité** en **RSZ-kengetal**: vraag ze na bij uw boekhouder of sociaal secretariaat als u ze niet kent. Ze zijn niet verplicht.",
          "**Mentor** op de werkvloer, met gsm-nummer. De naam is verplicht.",
          "**Risicoanalyse**: duid aan of u een risicoanalyse of werkpostfiche hebt (die bezorgt u vóór de start), of dat u geen werknemers hebt (dan stuurt de school u een werkpostfiche).",
          "**Bijzondere afspraken**: toestellen of taken die de stagiair niet mag gebruiken of doen, en andere afspraken zoals kledij of pauzes.",
        ],
        tip: "Klik op Bewaren en verder. Zolang u niet getekend hebt, kan u de gegevens nog aanpassen.",
      },
      {
        titel: "Ondertekenen",
        tekst: [
          "Vul de plaats in waar u tekent, vink het akkoord aan en zet uw handtekening in het vak, met de muis, uw vinger of een pen. Klik daarna op **Ondertekenen**.",
          "Een digitale handtekening heeft dezelfde waarde als een handtekening op papier. Een papieren versie is niet nodig.",
        ],
        tip: "Na uw handtekening kan u de gegevens niet meer zelf wijzigen. Klopt er toch iets niet, mail dan naar retail2sale@snh.be.",
      },
      {
        titel: "De andere partijen tekenen",
        tekst: ["Na u tekenen de stagiair en, bij een minderjarige stagiair, een ouder of voogd. De school tekent als laatste. Zodra iedereen getekend heeft, krijgt u het volledige contract als pdf. Via dezelfde link kan u het contract altijd opnieuw bekijken of downloaden."],
      },
      {
        titel: "Het werkrooster plannen",
        wanneer: "Vóór de eerste stagedag",
        tekst: [
          "Open het werkrooster via dezelfde persoonlijke link als het contract (knop **Werkrooster plannen**), of plan samen met de stagiair op zijn of haar gsm. Vink per week de stagedagen aan en vul de uren en de pauze in. Met **Overnemen in de volgende weken** kopieert u een week. De teller bovenaan toont hoeveel uur er nog te plannen is. De regels:",
        ],
        punten: [
          "het totaal is exact het aantal uur van de blokstage (meestal 120 uur), gemiddeld 24 uur per week;",
          "stage op dinsdag tot en met zaterdag: op maandag is de stagiair op school;",
          "op vakantie-, feest- en zondagen enkel in overleg (u bevestigt dat bij het indienen);",
          "voor een stagiair jonger dan 18: maximum 8 uur per dag en 40 uur per week, minstens 12 uur rust tussen twee werkdagen, geen werk tussen 20u en 6u, en een uur pauze bij meer dan zes uur werk.",
        ],
        tip: "Klopt alles, vul dan uw naam in, bevestig en klik op **Rooster indienen**. De stagebegeleiding keurt het rooster goed en u krijgt het als pdf. Moet er later iets wijzigen, kies dan **Rooster aanpassen**: het goedgekeurde rooster blijft gelden tot de wijziging is goedgekeurd.",
      },
      {
        titel: "Tijdens de stage",
        tekst: [
          "De mentor zorgt voor een goed onthaal, legt de werking en de taken uit en begeleidt de stagiair op de werkvloer. De stagebegeleider komt minstens één keer op bezoek, zonder dat vooraf te melden.",
          "**Afwezig?** De stagiair verwittigt u vóór de start van de stage. Afgesproken uren die niet gepresteerd zijn, moeten worden ingehaald: op woensdagnamiddag, op zaterdag of in de vakantie, tot 14 dagen na de stage. Afwezigheden en inhaalstage beheert u via dezelfde persoonlijke link, tabblad **Afwezigheden en inhaalstage**: een afwezigheid melden (de gemiste uren komen uit het werkrooster), samen een inhaalmoment plannen en na afloop bevestigen dat de uren gepresteerd zijn. Pas na uw bevestiging tellen ze als ingehaald.",
        ],
      },
      {
        titel: "Evaluatie",
        wanneer: "Op het einde van de stage",
        tekst: ["U beoordeelt de attitudes en competenties van de stagiair. U krijgt daarvoor tijdig een link. De stagebegeleiding bespreekt de evaluatie met de stagiair."],
      },
    ],
    vragen: [
      { v: "De link werkt niet.", a: "Kopieer de volledige link uit de mail en plak hem in de adresbalk van uw browser. Werkt het nog niet, mail dan naar retail2sale@snh.be: we sturen een nieuwe link." },
      { v: "Iemand anders moet tekenen dan de mentor.", a: "Dat kan. Vul bij **Naam ondertekenaar** de naam in van wie tekent, en geef de link aan die persoon. U kan ook de stagebegeleiding vragen om de link rechtstreeks naar die persoon te mailen." },
      { v: "Ik heb mij vergist na het tekenen.", a: "Mail naar retail2sale@snh.be. De stagebegeleiding past het contract aan; u hoeft niet opnieuw te tekenen." },
      { v: "Waarom tekent een ouder mee?", a: "Een minderjarige stagiair wordt vertegenwoordigd door een ouder of voogd. Is de stagiair op de eerste stagedag 18 jaar of ouder, dan tekent de stagiair zelf en is er geen handtekening van een ouder nodig." },
      { v: "Moet ik de stagiair betalen?", a: "Nee. De stage wordt niet betaald. Woon-werkverplaatsingen zijn ten laste van de stagiair; verplaatsingen in uw opdracht tijdens de stage zijn ten laste van u." },
      { v: "Is de stagiair verzekerd?", a: "Ja. De school heeft een verzekering voor de stage. Meld een ongeval onmiddellijk aan de stagebegeleiding." },
      { v: "Wat gebeurt er met de gegevens?", a: "De school gebruikt de gegevens enkel om de stage te organiseren en op te volgen. Ze worden veilig bewaard in de Europese Unie. Meer in de [privacyverklaring](/privacy)." },
    ],
  },

  stagiair: {
    wie: "stagiair",
    voor: "Stagiair",
    titel: "Zo regel je je stage",
    beschrijving: "Zo regel je je stage: top 3, aanvraag, contract, werkrooster en wat te doen tijdens de stage.",
    intro: "Je stage regel je stap voor stap op het stageplatform: van je top 3 tot het contract. Hier lees je wat je moet doen en wanneer.",
    andere: { href: "/handleiding/stagegever", tekst: "Handleiding voor stagegevers" },
    kort: [
      "Je kiest drie stageplaatsen: je top 3.",
      "De stagebegeleiding keurt er één of twee goed.",
      "Je gaat langs, stelt je voor en vult samen met de stagementor de aanvraag in.",
      "Na goedkeuring krijg je een bevestiging. De stagegever tekent het contract, daarna teken jij (en een ouder als je jonger bent dan 18).",
      "Je plant samen met de stagegever je werkrooster op het platform. Dan kan de stage beginnen.",
    ],
    stappen: [
      {
        titel: "Inloggen",
        tekst: ["Ga naar het stageplatform, klik op **Inloggen** en kies **Stagiair**. Je logt in met je Smartschool-account. Je komt in **Mijn stage**: daar zie je alle stappen en wat je nu moet doen."],
        tip: "Een stap met een blauw uitroepteken is aan jou. Een stap met drie puntjes ligt bij de school of de stagegever.",
      },
      {
        titel: "Je top 3 kiezen",
        wanneer: "Vóór de deadline die bovenaan in Mijn stage staat",
        tekst: ["Kies drie stageplaatsen in volgorde van voorkeur. Per keuze:"],
        punten: [
          "**Sales of onthaal**: je loopt één keer stage in een winkel (sales) en één keer aan een onthaal of receptie.",
          "de soort zaak, de naam, het adres en eventueel de website;",
          "hoe je er geraakt en waarom je die plaats kiest (voor keuze 1 en 2).",
        ],
        tip: "Begin de naam te typen: gekende stageplaatsen verschijnen dan met hun adres. Staat er een melding dat er al iemand stage loopt, dan mag je de plaats kiezen, maar de stagebegeleiding kijkt of er nog plaats is.",
      },
      {
        titel: "Top 3 indienen",
        tekst: [
          "Bespreek je keuzes met je ouders en vink aan dat ze akkoord gaan. Je kan tussendoor **bewaren als concept**. Ben je klaar, klik dan op **Top 3 indienen**. Daarna kan je niets meer wijzigen.",
          "De stagebegeleiding keurt één of twee keuzes goed, of vraagt een aanpassing. Dat zie je in Mijn stage, met de uitleg erbij.",
        ],
      },
      {
        titel: "Langsgaan en de aanvraag invullen",
        wanneer: "Na de goedkeuring van je top 3",
        tekst: ["Ga langs bij de goedgekeurde stageplaats, stel jezelf voor en vraag of je er stage mag lopen. Zegt de zaak ja, vul dan **samen met de stagementor** de aanvraag in. Je hebt nodig:"],
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
        tekst: ["Keurt de stagebegeleiding je aanvraag goed, dan ligt je stage vast. Jij en de stagegever krijgen een mail met de bevestiging, de stagekalender, de infobrochure en een handleiding."],
      },
      {
        titel: "Het contract ondertekenen",
        tekst: [
          "Eerst vult de stagegever het contract aan en tekent. Daarna is het jouw beurt: in Mijn stage staat bij **Contract** de knop **Contract ondertekenen**.",
          "Lees het contract, vul je adres in (straat, nummer, eventueel bus, postcode en gemeente), vink het akkoord aan en teken met je vinger of muis.",
        ],
        punten: [
          "**Jonger dan 18 op je eerste stagedag?** Dan tekent ook een ouder of voogd. Dat kan meteen na jou op hetzelfde toestel.",
          "**18 of ouder?** Dan teken je zelf en is er geen handtekening van een ouder nodig.",
        ],
        tip: "De school tekent als laatste. Daarna krijg je het volledige contract als pdf.",
      },
      {
        titel: "Je werkrooster",
        wanneer: "Vóór de eerste stagedag",
        tekst: [
          "Plan samen met je stagementor je stagedagen in Mijn stage, bij **Werkrooster**: vink de dagen aan en vul de uren en de pauze in. Het totaal moet exact het aantal uur van de blokstage zijn (meestal 120 uur), op dinsdag tot en met zaterdag. Ben je jonger dan 18, dan werk je maximum 8 uur per dag en niet na 20u.",
          "De stagegever bevestigt het rooster met zijn of haar naam en dient het in. Daarna keurt de stagebegeleiding het goed.",
        ],
        tip: "De stagegever kan het rooster ook zelf invullen via zijn persoonlijke link. Jullie zien allebei hetzelfde rooster.",
      },
      {
        titel: "Tijdens de stage",
        tekst: ["Wees minstens 10 minuten voor de start aanwezig, draag verzorgde kledij en volg de afspraken van de zaak."],
        punten: [
          "**Ziek of afwezig?** Verwittig vóór de start telefonisch en persoonlijk de winkel, beide stagebegeleiders en het secretariaat van de school. Bezorg daarna een doktersattest aan het secretariaat en een kopie aan de winkel. Meld de afwezigheid ook in Mijn stage, bij **Tijdens de stage**.",
          "Gemiste uren haal je in: op woensdagnamiddag, op zaterdag of in de vakantie, tot 14 dagen na de stage. Plan het inhaalmoment samen met de stagegever in Mijn stage en koppel het aan de afwezigheid. De stagegever bevestigt na afloop. Een afwezigheid die de school als gewettigd aanduidt, moet je niet inhalen.",
          "Plan tijdens je stage-uren geen afspraken bij de dokter, rijles of uitstappen.",
        ],
      },
    ],
    vragen: [
      { v: "Mijn top 3 werd teruggestuurd.", a: "Lees de uitleg van de stagebegeleiding in Mijn stage, pas je top 3 aan en dien hem opnieuw in." },
      { v: "De winkel van mijn eerste keuze zegt nee.", a: "Ga langs bij je tweede goedgekeurde keuze. Werd maar één keuze goedgekeurd, neem dan contact op met de stagebegeleiding." },
      { v: "Ik heb een fout gemaakt in mijn aanvraag.", a: "Is ze nog niet ingediend, pas ze dan gewoon aan. Is ze al ingediend, mail dan naar retail2sale@snh.be: de stagebegeleiding kan ze terugsturen zodat je ze kan verbeteren." },
      { v: "Mijn ouder kan niet meteen meetekenen.", a: "Geen probleem: je ouder kan later tekenen via dezelfde knop in Mijn stage. De stagebegeleiding kan ook een aparte link naar je ouder sturen." },
    ],
  },
};

/** Tekst met **vet** en [tekst](link) opsplitsen in stukken. */
export type Stuk = { t: string; vet?: boolean; link?: string };
export function stukken(s: string): Stuk[] {
  const uit: Stuk[] = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
  let i = 0, m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > i) uit.push({ t: s.slice(i, m.index) });
    uit.push(m[1] !== undefined ? { t: m[1], vet: true } : { t: m[2], link: m[3] });
    i = m.index + m[0].length;
  }
  if (i < s.length) uit.push({ t: s.slice(i) });
  return uit;
}

export const pdfNaamHandleiding = (wie: Wie) => (wie === "stagegever" ? "Handleiding voor stagegevers.pdf" : "Handleiding voor stagiairs.pdf");
