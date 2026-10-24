// Inhoud van de handleidingen: één bron voor de webpagina en de pdf.
// Opmaak in de tekst: **vet** en [tekst](link).

export type Wie = "stagegever" | "mentor" | "stagiair" | "ouder";
export const WIE: Wie[] = ["stagegever", "mentor", "stagiair", "ouder"];
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
  /** korte omschrijving voor het overzicht van de briefings */
  samenvatting: string;
};

export const CONTACT = "Mail naar [retail2sale@snh.be](mailto:retail2sale@snh.be) of bel een van de stagebegeleiders: Fien Claeys (0498 64 48 89) of Stijn Decoene (0479 28 85 07).";

export const HANDLEIDINGEN: Record<Wie, HandleidingInhoud> = {
  stagegever: {
    wie: "stagegever",
    voor: "Stagegever",
    titel: "Zo verloopt de stage voor u als stagegever",
    beschrijving: "Zo verloopt de stage voor de stagegever: bevestiging, digitaal contract, werkrooster, stagebezoek en evaluatie.",
    intro: "Bedankt dat u een stagiair van Spes Nostra Heule ontvangt. Alles verloopt digitaal en u hoeft nergens een account voor aan te maken: u krijgt telkens een persoonlijke link per mail.",
    samenvatting: "Voor wie de stagiair ontvangt en het contract tekent: wat u wanneer doet, van bevestiging tot afronding.",
    kort: [
      "U krijgt een mail dat de stage vastligt, met een persoonlijke link naar het stagecontract. Een account of wachtwoord is niet nodig.",
      "U vult het contract aan en tekent digitaal. Dat duurt ongeveer vijf minuten.",
      "Daarna tekenen de stagiair, een ouder (bij een minderjarige stagiair) en de school. U krijgt het contract als pdf.",
      "U plant samen met de stagiair het werkrooster op het platform, vóór de eerste stagedag.",
      "Tijdens de stage meldt u afwezigheden en bevestigt u inhaalstage. De stagebegeleider komt op bezoek.",
      "Op het einde vult u de evaluatie in (ongeveer 15 minuten) en geeft u kort feedback over de samenwerking.",
      "De school rondt de stage af: de stagiair krijgt een stageattest, u een bedankmail.",
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
          "**Risicoanalyse**: duid aan of u een risicoanalyse of werkpostfiche hebt, of dat u geen werknemers hebt (dan bezorgt de school u een werkpostfiche om in te vullen).",
          "**Activiteitenlijst**: wat de stagiair bij u effectief zal doen. De school stelt een lijst voor die past bij de stage (sales of onthaal). Vink af wat niet van toepassing is, voeg eigen activiteiten toe en duid aan wat enkel **onder rechtstreeks toezicht** mag (bijvoorbeeld de kassa). Minstens vijf activiteiten. De lijst komt als bijlage bij het contract.",
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
        titel: "Risicoanalyse of werkpostfiche opladen",
        wanneer: "Vóór de eerste stagedag",
        tekst: [
          "Onderaan de contractpagina, bij **Risicoanalyse of werkpostfiche**, laadt u het document op: de risicoanalyse of werkpostfiche van de werkpost waar de stagiair werkt. Een pdf, Word-bestand of een duidelijke foto volstaat (maximum 4 MB).",
          "Hebt u geen werknemers, dan vindt u daar de blanco werkpostfiche van de school. Vul ze in en laad ze op dezelfde plek op.",
        ],
        tip: "Zolang de stagebegeleiding het document niet nagekeken heeft, kan u het nog verwijderen en opnieuw opladen.",
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
        wanneer: "In de laatste week van de stage",
        tekst: [
          "Via dezelfde persoonlijke link, tabblad **Evaluatie**, beoordeelt de mentor de stagiair: houding, kennis van zaken, salescompetenties, onthaal en organisatie, en teamwerk. Per criterium kiest u **Onvoldoende**, **Voldoende**, **Goed** of **Zeer goed**; met **Omschrijvingen** ziet u wat elk niveau betekent. Kwam iets niet aan bod, kies dan **n.v.t.**. Afsluiten doet u met sterke punten, groeipunten en een algemene beoordeling.",
          "U kan tussendoor bewaren en later verder invullen. Klaar? Vul de naam van de mentor in en klik op **Indienen**.",
        ],
        tip: "De stagiair ziet uw evaluatie pas wanneer de stagebegeleiding ze openstelt, samen met de evaluatie van het stagebezoek. Dan krijgt u ze ook als pdf per mail.",
      },
      {
        titel: "Afronding en feedback",
        wanneer: "Na de stage",
        tekst: [
          "Op het tabblad **Afronding** vragen we u in twee minuten hoe de samenwerking verliep en of u volgend schooljaar opnieuw een stagiair wil ontvangen. De stagiair ziet uw antwoorden niet.",
          "Zijn de uren en de evaluaties in orde, dan rondt de school de stage af. De stagiair krijgt een stageattest; u krijgt een bedankmail met een kopie.",
        ],
      },
      {
        titel: "Meerdere stagiairs of link kwijt?",
        tekst: [
          "Ga naar **Inloggen** en kies **Stagegever**. Vul het mailadres in waarop u de mail over de stage kreeg. U krijgt meteen een mail met een overzicht van al uw stagiairs: per stagiair ziet u wat er nog te doen is, met de knoppen naar contract, rooster, afwezigheden, evaluatie en afronding.",
        ],
        tip: "Bewaar het overzicht als bladwijzer. De link is 30 dagen geldig; daarna vraagt u gewoon een nieuwe aan.",
      },
    ],
    vragen: [
      { v: "De link werkt niet of ik ben hem kwijt.", a: "Ga naar [Inloggen → Stagegever](/inloggen?rol=stagegever) en vul uw mailadres in: u krijgt uw links opnieuw. Lukt dat niet, mail dan naar retail2sale@snh.be." },
      { v: "De mentor is iemand anders dan wie het contract tekent.", a: "Geef de link door aan de mentor voor het werkrooster, de afwezigheden en de evaluatie. Voor de mentor is er ook een korte [briefing voor de mentor](/handleiding/mentor)." },
      { v: "Wat is de activiteitenlijst?", a: "Een verplicht onderdeel van de stageovereenkomst: de activiteiten die de stagiair tijdens de stage effectief uitvoert. Het is geen evaluatie. De lijst beschermt u en de stagiair: activiteiten die er niet op staan, vragen extra aandacht in uw risicoanalyse. Moet er tijdens de stage iets bij, laat het de stagebegeleiding weten." },
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
    samenvatting: "Voor de leerling: van top 3 tot stageattest, wat je wanneer moet doen in Mijn stage.",
    kort: [
      "Je kiest drie stageplaatsen: je top 3.",
      "De stagebegeleiding keurt er één of twee goed.",
      "Je gaat langs, stelt je voor en vult samen met de stagementor de aanvraag in.",
      "Na goedkeuring krijg je een bevestiging. De stagegever tekent het contract, daarna teken jij (en een ouder als je jonger bent dan 18).",
      "Je plant samen met de stagegever je werkrooster op het platform. Dan kan de stage beginnen.",
      "Na de stage vul je je zelfevaluatie in. Daarna krijg je je evaluatie en je stageattest.",
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
      {
        titel: "Evaluatie",
        wanneer: "Op het einde van de stage",
        tekst: [
          "Je stagementor en de stagebegeleiding evalueren je stage. Jij vult in Mijn stage, bij **Evaluatie**, je **zelfevaluatie** in: hoe je je voorbereid voelde, welke taken je deed, wat je leerde en hoe je jezelf scoort. Neem er je tijd voor (ongeveer 50 minuten); je kan tussendoor bewaren.",
          "De evaluaties van je mentor en van de school zie je zodra de stagebegeleiding ze openstelt, samen met je eindpunt. Je krijgt ze dan ook per mail.",
        ],
      },
      {
        titel: "Afronding: je stageattest",
        wanneer: "Na de stage",
        tekst: [
          "Zijn je uren en je evaluatie in orde, dan rondt de stagebegeleiding je stage af. Je krijgt een **stageattest** met je stageplaats, de periode en je gepresteerde uren. Je kan het downloaden in Mijn stage bij **Afronding** en je krijgt het per mail.",
        ],
        tip: "Bewaar je attest: het is handig bij een sollicitatie.",
      },
    ],
    vragen: [
      { v: "Mijn top 3 werd teruggestuurd.", a: "Lees de uitleg van de stagebegeleiding in Mijn stage, pas je top 3 aan en dien hem opnieuw in." },
      { v: "De winkel van mijn eerste keuze zegt nee.", a: "Ga langs bij je tweede goedgekeurde keuze. Werd maar één keuze goedgekeurd, neem dan contact op met de stagebegeleiding." },
      { v: "Ik heb een fout gemaakt in mijn aanvraag.", a: "Is ze nog niet ingediend, pas ze dan gewoon aan. Is ze al ingediend, mail dan naar retail2sale@snh.be: de stagebegeleiding kan ze terugsturen zodat je ze kan verbeteren." },
      { v: "Mijn ouder kan niet meteen meetekenen.", a: "Geen probleem: je ouder kan later tekenen via dezelfde knop in Mijn stage. De stagebegeleiding kan ook een aparte link naar je ouder sturen. Voor je ouders is er een [korte uitleg](/handleiding/ouder)." },
      { v: "Waarom zie ik mijn evaluatie nog niet?", a: "De stagebegeleiding stelt de evaluaties open nadat ze alles heeft bekeken. Je krijgt een mail zodra je ze kan zien." },
      { v: "Ik heb te weinig uren.", a: "Haal de gemiste uren in en laat de stagegever ze bevestigen in Mijn stage, bij **Tijdens de stage**. Pas daarna kan je stage afgerond worden." },
    ],
  },

  mentor: {
    wie: "mentor",
    voor: "Stagementor",
    titel: "Briefing voor de stagementor",
    beschrijving: "Wat we verwachten van de stagementor op de werkvloer: onthaal, begeleiding, afwezigheden, bezoek en evaluatie.",
    samenvatting: "Voor wie de stagiair op de werkvloer begeleidt: de eerste dag, de begeleiding, het bezoek en de evaluatie.",
    intro: "U begeleidt een stagiair van de richting Onthaal, organisatie en sales. Dank u wel! Op deze pagina leest u in vijf minuten wat de stagiair moet leren, wat we van u verwachten en wat u op het platform doet. Alles gaat via de persoonlijke link die de stagegever per mail kreeg.",
    kort: [
      "Vóór de start: het werkrooster samen met de stagiair plannen en indienen.",
      "De eerste dag: een goed onthaal, de afspraken en de werking uitleggen.",
      "Tijdens de stage: taken geven die bij de opleiding passen, feedback geven, afwezigheden melden.",
      "De stagebegeleider komt minstens één keer op bezoek, onaangekondigd.",
      "In de laatste week: de evaluatie invullen (ongeveer 15 minuten).",
    ],
    stappen: [
      {
        titel: "Wat de stagiair moet leren",
        tekst: ["De stagiair volgt de richting Onthaal, organisatie en sales. Afhankelijk van de stageplaats ligt de nadruk op:"],
        punten: [
          "**Sales**: klanten begroeten en helpen, actief luisteren, producten en diensten uitleggen, afrekenen, aanvullen en presenteren van de winkel, omgaan met bezwaren of klachten.",
          "**Onthaal en organisatie**: bezoekers onthalen en doorverwijzen, telefoon en mails behandelen, afspraken en agenda's beheren, administratieve taken, vergaderingen of activiteiten voorbereiden.",
          "**Altijd**: stiptheid, verzorgd voorkomen, beleefdheid, initiatief nemen, samenwerken en openstaan voor feedback.",
        ],
        tip: "Wat de stagiair bij u precies doet, staat in de activiteitenlijst bij het contract. Activiteiten met 'onder rechtstreeks toezicht' gebeuren enkel als u of een ervaren collega erbij is. Geef liefst gevarieerde taken met echt klantcontact: daar leert de stagiair het meest van.",
      },
      {
        titel: "Vóór de start: het werkrooster",
        wanneer: "Vóór de eerste stagedag",
        tekst: ["Plan samen met de stagiair de stagedagen via de link (knop **Werkrooster plannen**). Het totaal is exact het aantal uur van de blokstage (meestal 120 uur), op dinsdag tot en met zaterdag. Voor een stagiair jonger dan 18: maximum 8 uur per dag, niet na 20u, en een uur pauze bij meer dan zes uur werk. De teller en de controles op het scherm helpen u."],
      },
      {
        titel: "De eerste dag",
        tekst: ["Een goede start maakt veel verschil. Een handige checklist:"],
        punten: [
          "rondleiding en voorstelling aan de collega's;",
          "afspraken over uren, pauzes, kledij, gsm-gebruik en wie het aanspreekpunt is;",
          "veiligheid: nooduitgangen, toestellen of taken die niet mogen (zoals in het contract staat);",
          "uitleg over de werking, de producten of diensten en de klanten;",
          "een eerste eenvoudige taak, zodat de stagiair meteen meedraait.",
        ],
      },
      {
        titel: "Tijdens de stage",
        tekst: [
          "Geef geregeld kort feedback: wat ging goed, wat kan beter? Dat helpt de stagiair meer dan één gesprek op het einde. Hebt u zorgen over houding, stiptheid of gedrag, neem dan meteen contact op met de stagebegeleiding.",
          "**Afwezig?** De stagiair verwittigt u vóór de start. Meld de afwezigheid via de link, tabblad **Afwezigheden en inhaalstage**. Gemiste uren worden ingehaald (woensdagnamiddag, zaterdag of in de vakantie). Plan samen het inhaalmoment en bevestig na afloop dat de uren gepresteerd zijn.",
        ],
      },
      {
        titel: "Het stagebezoek",
        tekst: ["De stagebegeleider komt minstens één keer langs, zonder dat vooraf te melden. Het bezoek duurt een kwartiertje: even kijken hoe de stagiair werkt, en een kort gesprek met u over hoe het loopt. U hoeft niets voor te bereiden."],
      },
      {
        titel: "De evaluatie",
        wanneer: "In de laatste week van de stage",
        tekst: [
          "Via de link, tabblad **Evaluatie**, beoordeelt u per criterium: **Onvoldoende**, **Voldoende**, **Goed** of **Zeer goed**, of **n.v.t.** als iets niet aan bod kwam. Klik op **Omschrijvingen** voor de betekenis van elk niveau. Sluit af met sterke punten, groeipunten en een algemene beoordeling. Het duurt ongeveer 15 minuten.",
        ],
        punten: [
          "**Onvoldoende**: de stagiair toont het gedrag zelden of nooit; duidelijk een zwak punt.",
          "**Voldoende**: af en toe of enkel als erom gevraagd wordt; een werkpunt.",
          "**Goed**: meestal, met oog voor de context en de timing.",
          "**Zeer goed**: spontaan en op het juiste moment; duidelijk een troef.",
        ],
        tip: "Wees eerlijk: een realistische evaluatie helpt de stagiair het meest. De stagiair ziet uw evaluatie pas als de school ze openstelt, samen met de evaluatie van het stagebezoek.",
      },
    ],
    vragen: [
      { v: "Ik heb de link niet.", a: "De link ging naar wie het contract tekende. Vraag hem aan die persoon, of vraag hem zelf op via [Inloggen → Stagegever](/inloggen?rol=stagegever) als uw mailadres in de aanvraag staat. Anders mailt u naar retail2sale@snh.be." },
      { v: "De stagiair komt te laat of is vaak afwezig.", a: "Meld elke afwezigheid via de link en verwittig de stagebegeleiding als het vaker gebeurt. We nemen dan contact op met de stagiair en de ouders." },
      { v: "Er gebeurt een ongeval.", a: "Verwittig onmiddellijk de stagebegeleiding. De school heeft een verzekering voor de stage." },
      { v: "Mag de stagiair alleen in de winkel of aan het onthaal staan?", a: "De stagiair werkt altijd onder begeleiding van de mentor of een collega. Laat de stagiair niet alleen de zaak openen of sluiten, en geef geen verantwoordelijkheid voor de kassa zonder toezicht." },
    ],
  },

  ouder: {
    wie: "ouder",
    voor: "Ouder",
    titel: "De stage van uw zoon of dochter",
    beschrijving: "Wat ouders moeten weten over de stage: wanneer, wat er van hen gevraagd wordt, afwezigheden, verzekering en evaluatie.",
    samenvatting: "Voor ouders: wat de stage inhoudt, wanneer u meetekent en wat te doen bij ziekte.",
    intro: "Uw zoon of dochter volgt de richting Onthaal, organisatie en sales en loopt stage in een winkel of aan een onthaal. Alles verloopt digitaal. Hier leest u wat er van u gevraagd wordt.",
    kort: [
      "Uw kind kiest drie stageplaatsen; u gaat akkoord met de keuze.",
      "Is uw kind jonger dan 18 op de eerste stagedag, dan tekent u het stagecontract mee, digitaal.",
      "Bij ziekte verwittigt uw kind vóór de start de stageplaats, de stagebegeleiders en het secretariaat.",
      "Gemiste uren worden ingehaald.",
      "Na de stage krijgt uw kind een evaluatie en een stageattest.",
    ],
    stappen: [
      {
        titel: "De keuze van de stageplaats",
        wanneer: "Enkele maanden vóór de stage",
        tekst: ["Uw kind kiest in het portaal een top 3 van stageplaatsen en bespreekt die met u. Bij het indienen bevestigt uw kind dat u akkoord gaat. De stagebegeleiding keurt een plaats goed, waarna uw kind er langsgaat en samen met de mentor een aanvraag invult."],
        tip: "Een stageplaats bij familie is niet toegelaten. Denk ook aan de bereikbaarheid: hoe geraakt uw kind er, ook op zaterdag?",
      },
      {
        titel: "Het stagecontract meetekenen",
        wanneer: "Na de stagegever",
        tekst: [
          "Eerst tekent de stagegever, daarna uw kind. Is uw kind op de eerste stagedag jonger dan 18, dan tekent ook een ouder of voogd. Dat kan meteen na uw kind op hetzelfde toestel (knop in Mijn stage), of via een eigen link die de stagebegeleiding u mailt.",
          "U leest het contract, vult uw naam en relatie in, en tekent met uw vinger of muis. Een digitale handtekening heeft dezelfde waarde als een handtekening op papier. Iedereen krijgt het ondertekende contract als pdf.",
        ],
      },
      {
        titel: "De stage zelf",
        tekst: ["De stage duurt meestal 120 uur, verspreid over enkele weken, op dinsdag tot en met zaterdag. Uw kind plant de stagedagen samen met de stagegever in een werkrooster. Een minderjarige werkt maximum 8 uur per dag en niet na 20u. Woon-werkverplaatsingen zijn ten laste van de stagiair; de stage wordt niet betaald."],
      },
      {
        titel: "Ziek of afwezig",
        tekst: ["Bij ziekte of een andere afwezigheid verwittigt uw kind **vóór de start** telefonisch de stageplaats, beide stagebegeleiders en het secretariaat van de school. Bezorg daarna een doktersattest aan het secretariaat en een kopie aan de stageplaats."],
        punten: [
          "Gemiste uren worden ingehaald: op woensdagnamiddag, op zaterdag of in de vakantie, tot 14 dagen na de stage.",
          "Een afwezigheid die de school als gewettigd aanvaardt, hoeft niet ingehaald te worden.",
          "Plan tijdens de stage-uren geen afspraken bij de dokter, rijles of uitstappen.",
        ],
      },
      {
        titel: "Evaluatie en afronding",
        wanneer: "Na de stage",
        tekst: ["De mentor en de stagebegeleiding evalueren de stage; uw kind vult een zelfevaluatie in. Zodra de school de evaluatie openstelt, ziet uw kind ze in het portaal en per mail. Na de afronding krijgt uw kind een stageattest met de gepresteerde uren."],
        tip: "Vraag gerust aan uw kind om de evaluatie samen te bekijken: het is een mooie kans om over de toekomst te praten.",
      },
    ],
    vragen: [
      { v: "Is mijn kind verzekerd?", a: "Ja. De school heeft een verzekering voor de stage, ook op weg van en naar de stageplaats. Meld een ongeval onmiddellijk aan de stagebegeleiding." },
      { v: "Mijn kind is 18 geworden.", a: "Is uw kind op de eerste stagedag 18 jaar of ouder, dan tekent het zelf en is uw handtekening niet nodig." },
      { v: "Ik kreeg geen link om te tekenen.", a: "U kan meetekenen op het toestel van uw kind, via de knop in Mijn stage. Een eigen link vraagt u aan de stagebegeleiding via retail2sale@snh.be." },
      { v: "Wat gebeurt er met de gegevens?", a: "De school gebruikt de gegevens enkel om de stage te organiseren en op te volgen. Meer in de [privacyverklaring](/privacy)." },
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

const PDF_NAAM: Record<Wie, string> = {
  stagegever: "Handleiding voor stagegevers.pdf",
  mentor: "Briefing voor de stagementor.pdf",
  stagiair: "Handleiding voor stagiairs.pdf",
  ouder: "Info voor ouders over de stage.pdf",
};
export const pdfNaamHandleiding = (wie: Wie) => PDF_NAAM[wie];
