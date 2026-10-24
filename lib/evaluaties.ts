// Evaluaties: de formulieren (mentor, stagebegeleider, zelfevaluatie sales en onthaal, stageverslag, feedback), punten en status.
// Inhoud overgenomen uit de documenten van de stagebegeleiding (oktober 2026).

export type Niveau = "O" | "V" | "G" | "ZG" | "NVT";
export const NIVEAUS: { k: Exclude<Niveau, "NVT">; l: string }[] = [
  { k: "O", l: "Onvoldoende" }, { k: "V", l: "Voldoende" }, { k: "G", l: "Goed" }, { k: "ZG", l: "Zeer goed" },
];
export const NIVEAU_LABEL: Record<Niveau, string> = { O: "Onvoldoende", V: "Voldoende", G: "Goed", ZG: "Zeer goed", NVT: "Niet van toepassing" };

export type Vraag =
  | { t: "rubric"; id: string; label: string; niveaus?: Partial<Record<Exclude<Niveau, "NVT">, string>>; nvt?: boolean }
  | { t: "tekst"; id: string; label: string; lang?: boolean; optioneel?: boolean }
  | { t: "schaal"; id: string; label: string; max: 5 | 10 }
  | { t: "keuze"; id: string; label: string; opties: string[] }
  | { t: "datum"; id: string; label: string };
export type Deel = { titel: string; uitleg?: string; vragen: Vraag[] };
export type Soort = "mentor" | "school" | "zelf" | "verslag" | "feedback";
export type Formulier = { soort: Soort; titel: string; voor: string; intro: string; schaal?: string[]; delen: Deel[] };

const r = (id: string, label: string, O: string, V: string, G: string, ZG: string): Vraag => ({ t: "rubric", id, label, niveaus: { O, V, G, ZG }, nvt: true });

// ---------------------------------------------------------------------------
// Stagementor
// ---------------------------------------------------------------------------
export const MENTOR: Formulier = {
  soort: "mentor",
  titel: "Evaluatie stage – stagementor",
  voor: "Stagementor",
  intro: "Beoordeel per criterium hoe de stagiair functioneerde. Klik op een niveau om de omschrijving te zien. Kwam iets niet of te weinig aan bod, kies dan 'Niet van toepassing'.",
  schaal: [
    "Niet van toepassing: de vaardigheden of attitudes kwamen niet of te weinig aan bod om te oordelen.",
    "Onvoldoende: de leerling vertoont het gedrag zelden tot nooit. Het is duidelijk een zwak punt.",
    "Voldoende: de leerling vertoont het gedrag af en toe, enkel als erom gevraagd wordt, niet altijd op de juiste momenten en/of in de juiste context. Het is een werkpunt.",
    "Goed: de leerling vertoont het gedrag en houdt daarbij meestal rekening met de context en timing.",
    "Zeer goed: de leerling vertoont het gedrag spontaan, daarbij rekening houdend met de context en timing. Het is duidelijk een troef.",
  ],
  delen: [
    { titel: "Houding en attitude", vragen: [
      r("m1a", "Komt op tijd en is goed voorbereid", "Komt regelmatig te laat en is niet voorbereid op taken.", "Komt meestal op tijd en heeft een basisvoorbereiding.", "Is stipt en goed voorbereid op dagelijkse taken.", "Komt altijd op tijd, toont initiatief in voorbereiding en denkt vooruit."),
      r("m1b", "Toont respect en beleefdheid tegenover klanten en collega's", "Gedraagt zich ongepast of onbeleefd.", "Is meestal beleefd, maar mist soms tact of empathie.", "Is consequent respectvol en vriendelijk.", "Straalt respect uit, is een voorbeeld voor anderen."),
      r("m1c", "Werkt met motivatie en neemt initiatief", "Toont weinig inzet en wacht op instructies.", "Voert taken uit, maar neemt zelden initiatief.", "Werkt actief mee en neemt af en toe initiatief.", "Is enthousiast, denkt mee en neemt spontaan verantwoordelijkheid."),
      r("m1d", "Verzorgd voorkomen", "Onverzorgd uiterlijk, niet aangepast aan de werkomgeving.", "Basisverzorging is aanwezig, maar niet altijd passend.", "Verzorgd en professioneel voorkomen.", "Altijd netjes, straalt professionaliteit uit."),
      r("m1e", "Staat open voor feedback en past zich aan", "Reageert defensief of negeert feedback.", "Luistert naar feedback, maar past zich beperkt aan.", "Neemt feedback ter harte en past gedrag aan.", "Vraagt actief om feedback en toont snelle verbetering."),
      r("m1f", "Taalgebruik", "Gebruikt vaak ongepaste of onduidelijke taal.", "Gebruikt meestal correcte taal, maar soms onduidelijk of informeel.", "Gebruikt duidelijke en correcte taal, passend bij de situatie.", "Gebruikt altijd correcte, professionele en duidelijke taal."),
    ] },
    { titel: "Inhoudelijke relevantie en kennis van zaken", vragen: [
      r("m2a", "Begrijpt de werking van het bedrijf en zijn/haar rol", "Heeft weinig inzicht in het bedrijf en eigen taken.", "Begrijpt de basisstructuur en zijn/haar rol.", "Heeft een goed overzicht van het bedrijf en handelt passend.", "Toont diepgaand inzicht en denkt mee over processen."),
      r("m2b", "Past schoolse kennis correct toe op de werkvloer", "Kan schoolse kennis niet vertalen naar praktijk.", "Past basiskennis toe, soms met hulp.", "Gebruikt schoolse kennis zelfstandig en correct.", "Integreert kennis vlot en draagt bij aan verbetering."),
      r("m2c", "Toont inzicht in producten, diensten of processen", "Heeft weinig kennis van producten/diensten.", "Kent de basiskenmerken en functies.", "Begrijpt werking en voordelen voor de klant.", "Kan producten/diensten strategisch inzetten."),
      r("m2d", "Verwerkt en communiceert informatie correct", "Maakt fouten in verwerking of communicatie.", "Verwerkt en communiceert informatie met enige ondersteuning.", "Doet dit zelfstandig en correct.", "Communiceert helder, gestructureerd en professioneel."),
    ] },
    { titel: "Salescompetenties", vragen: [
      r("m3a", "Klantgericht en service-minded", "Negeert klantbehoeften of reageert ongepast.", "Probeert klant te helpen, soms onvolledig.", "Is vriendelijk en denkt mee met de klant.", "Overtreft verwachtingen en bouwt klantrelaties op."),
      r("m3b", "Stelt producten/diensten professioneel voor", "Onzeker of onsamenhangende uitleg.", "Geeft correcte basisinformatie.", "Presenteert duidelijk en overtuigend.", "Inspireert en overtuigt met kennis en flair."),
      r("m3c", "Luistert actief naar de klant", "Neemt klant niet serieus of onderbreekt.", "Luistert, maar mist soms nuance.", "Begrijpt klantbehoeften en reageert gepast.", "Luistert empathisch en anticipeert op noden."),
      r("m3d", "Gaat gepast om met bezwaren of klachten", "Reageert defensief of ontwijkt probleem.", "Probeert te helpen, soms zonder oplossing.", "Blijft rustig en zoekt een oplossing.", "Lost klachten professioneel en klantgericht op."),
      r("m3e", "Draagt bij tot een positieve klantenervaring", "Laat negatieve indruk achter.", "Klant is tevreden, maar niet enthousiast.", "Klant voelt zich welkom en geholpen.", "Klant beleeft een topervaring en komt graag terug."),
    ] },
    { titel: "Onthaal- en organisatievaardigheden", vragen: [
      r("m4a", "Onthaal van bezoekers en klanten is professioneel en vriendelijk", "Onvriendelijk of chaotisch onthaal.", "Basisvriendelijkheid, soms onzeker.", "Vriendelijk, professioneel en duidelijk.", "Warm, efficiënt en klantgericht onthaal."),
      r("m4b", "Telefonisch en schriftelijk contact is correct en beleefd", "Slordige communicatie of onbeleefd.", "Correct maar soms onduidelijk.", "Beleefd, duidelijk en professioneel.", "Communiceert vlot, klantgericht en foutloos."),
      r("m4c", "Voert administratieve taken nauwkeurig uit", "Veel fouten of slordigheid.", "Voert taken uit met enkele fouten.", "Werkt nauwkeurig en zelfstandig.", "Is punctueel, efficiënt en betrouwbaar."),
      r("m4d", "Plant en organiseert taken efficiënt", "Verliest overzicht of plant chaotisch.", "Plant taken, maar mist soms structuur.", "Organiseert taken logisch en tijdig.", "Werkt proactief en optimaliseert planning."),
      r("m4e", "Werkt ordelijk, zorgvuldig en met overzicht", "Rommelig en ongestructureerd.", "Basisorde, maar mist consistentie.", "Houdt werkplek en taken overzichtelijk.", "Werkt met structuur, precisie en rust."),
    ] },
    { titel: "Teamgericht werken", vragen: [
      r("m5a", "Werkt constructief samen met collega's", "Isoleert zich of werkt storend.", "Werkt mee, maar mist soms afstemming.", "Communiceert en werkt goed samen.", "Stimuleert samenwerking en helpt collega's vooruit."),
      r("m5b", "Draagt bij aan een positieve teamsfeer", "Negatieve houding of gedrag.", "Neutraal, soms betrokken.", "Positieve houding en steunend gedrag.", "Brengt energie, humor en verbondenheid in het team."),
      r("m5c", "Deelt informatie en helpt anderen waar nodig", "Houdt informatie voor zich.", "Helpt af en toe, deelt basisinfo.", "Is behulpzaam en transparant.", "Deelt actief kennis en ondersteunt spontaan."),
      r("m5d", "Toont verantwoordelijkheidszin binnen het team", "Neemt geen verantwoordelijkheid.", "Voert taken uit, maar mist eigenaarschap.", "Neemt verantwoordelijkheid en communiceert hierover.", "Is betrouwbaar, neemt initiatief en denkt teamgericht."),
    ] },
    { titel: "Algemene beoordeling en feedback", vragen: [
      { t: "tekst", id: "m6sterk", label: "Sterke punten / zaken die goed verlopen", lang: true },
      { t: "tekst", id: "m6groei", label: "Groeipunten / aandachtspunten", lang: true },
      { t: "tekst", id: "m6alg", label: "Algemene beoordeling van de stagiair", lang: true },
      { t: "keuze", id: "m6job", label: "Zou u deze stagiair een job aanbieden indien er een vacature is?", opties: ["Ja", "Misschien", "Nee"] },
      { t: "keuze", id: "m6uren", label: "Heeft de stagiair de voorziene werkuren gepresteerd?", opties: ["Ja", "Nee"] },
      { t: "tekst", id: "m6urenopm", label: "Toelichting bij de uren (optioneel)", optioneel: true },
    ] },
  ],
};

// ---------------------------------------------------------------------------
// Stagebegeleider (stagebezoek)
// ---------------------------------------------------------------------------
const BEGROETING = { O: "De leerling begroet de leraar niet of op een ongepaste manier. Er is sprake van een gesloten lichaamshouding en weinig respectvolle interactie.", V: "De leerling begroet de leraar op een correcte maar weinig spontane manier. Houding is neutraal, zonder duidelijke betrokkenheid.", G: "De leerling begroet vriendelijk en beleefd, met een open houding en gepaste non-verbale communicatie.", ZG: "De leerling begroet spontaan, warm en professioneel. Er is sprake van een zelfverzekerde en respectvolle houding met duidelijke betrokkenheid." };
export const SCHOOL: Formulier = {
  soort: "school",
  titel: "Evaluatieformulier – stagebezoek stagebegeleider",
  voor: "Stagebegeleider",
  intro: "In te vullen tijdens of na het stagebezoek.",
  delen: [
    { titel: "Stagebezoek", vragen: [{ t: "datum", id: "s0datum", label: "Datum stagebezoek" }] },
    { titel: "Algemene eerste indruk", vragen: [
      { t: "rubric", id: "s1a", label: "Begroet de leraar op een vriendelijke en beleefde manier", niveaus: BEGROETING },
      { t: "rubric", id: "s1b", label: "Toont een open en positieve houding tijdens het gesprek", niveaus: BEGROETING },
      { t: "rubric", id: "s1c", label: "Maakt een verzorgde en professionele indruk", niveaus: { O: "De leerling maakt een slordige indruk, met ongepaste kleding of gedrag dat niet past binnen een professionele context.", V: "De leerling is verzorgd maar mist nog elementen van professionaliteit in voorkomen of gedrag.", G: "De leerling straalt professionaliteit uit in kleding, houding en gedrag.", ZG: "De leerling presenteert zich als een volwaardige professional, met aandacht voor detail en context." } },
      { t: "tekst", id: "s1fb", label: "Feedback", lang: true, optioneel: true },
    ] },
    { titel: "Inhoudelijke kennis en betrokkenheid", vragen: [
      { t: "rubric", id: "s2a", label: "Gebruikt gepaste vakterminologie", niveaus: { O: "De leerling gebruikt geen of foutieve vaktermen, wat duidt op een gebrek aan kennis.", V: "De leerling gebruikt enkele correcte termen, maar mist consistentie of diepgang.", G: "De leerling gebruikt relevante vakterminologie op een correcte manier.", ZG: "De leerling gebruikt vaktaal vloeiend en past deze adequaat toe in verschillende contexten." } },
      { t: "rubric", id: "s2b", label: "Kan uitleg geven over uitgevoerde taken en verantwoordelijkheden", niveaus: { O: "De leerling kan taken niet benoemen of uitleggen, wat wijst op een beperkte betrokkenheid.", V: "De leerling beschrijft taken oppervlakkig, zonder veel inzicht.", G: "De leerling geeft een duidelijke en gestructureerde uitleg over taken en verantwoordelijkheden.", ZG: "De leerling geeft een diepgaande en reflectieve uitleg, waarbij verbanden worden gelegd met leerdoelen en context." } },
      { t: "rubric", id: "s2c", label: "Toont inzicht in het bedrijf en de sector", niveaus: { O: "De leerling toont weinig kennis van het bedrijf of de sector.", V: "De leerling heeft basiskennis van de werking van het bedrijf.", G: "De leerling toont een goed begrip van de bedrijfsstructuur en sectorale context.", ZG: "De leerling verbindt eigen taken met bredere inzichten over de sector en toont strategisch begrip." } },
      { t: "rubric", id: "s2d", label: "Zoekt actief naar antwoorden of oplossingen bij moeilijkheden; is bereid om antwoorden te geven en geeft niet op", niveaus: { O: "De leerling toont weinig initiatief bij moeilijkheden en geeft snel op.", V: "De leerling probeert soms oplossingen te vinden, maar mist systematiek.", G: "De leerling zoekt actief naar antwoorden en toont doorzettingsvermogen.", ZG: "De leerling toont creativiteit en volharding bij het oplossen van problemen, en reflecteert op het proces." } },
      { t: "tekst", id: "s2fb", label: "Feedback", lang: true, optioneel: true },
    ] },
    { titel: "Communicatie en houding", vragen: [
      { t: "rubric", id: "s3a", label: "Communiceert duidelijk en gepast met de leraar en collega's", niveaus: { O: "De leerling communiceert onduidelijk of ongepast, wat leidt tot misverstanden.", V: "De communicatie is voldoende maar mist soms helderheid of professionaliteit.", G: "De leerling communiceert duidelijk, correct en respectvol.", ZG: "De leerling communiceert vlot, professioneel en met empathie, afgestemd op de gesprekspartner." } },
      { t: "rubric", id: "s3b", label: "Staat open voor feedback en reageert professioneel", niveaus: { O: "De leerling negeert feedback of reageert defensief.", V: "De leerling luistert naar feedback maar past deze niet consequent toe.", G: "De leerling neemt feedback aan en past deze zichtbaar toe.", ZG: "De leerling vraagt actief om feedback en integreert deze structureel in zijn/haar werkhouding." } },
      { t: "tekst", id: "s3fb", label: "Feedback", lang: true, optioneel: true },
    ] },
    { titel: "Professionele groei en reflectie", vragen: [
      { t: "rubric", id: "s4a", label: "Kan reflecteren over eigen sterktes en verbeterpunten", niveaus: { O: "De leerling toont geen zelfinzicht of reflectie over eigen functioneren.", V: "De leerling herkent enkele sterktes en werkpunten, maar blijft oppervlakkig.", G: "De leerling reflecteert bewust en genuanceerd over eigen functioneren.", ZG: "De leerling voert diepgaande reflectie uit met concrete voorbeelden en ontwikkelingsgerichte inzichten." } },
      { t: "rubric", id: "s4b", label: "Toont bereidheid om bij te leren", niveaus: { O: "De leerling toont weinig motivatie om bij te leren.", V: "De leerling staat open voor leren, maar neemt weinig initiatief.", G: "De leerling toont een actieve leerhouding en past nieuwe inzichten toe.", ZG: "De leerling zoekt actief naar leerkansen en toont enthousiasme voor professionele ontwikkeling." } },
      { t: "rubric", id: "s4c", label: "Zet feedback om in actie", niveaus: { O: "De leerling past feedback niet toe in de praktijk.", V: "De leerling probeert soms feedback toe te passen, met wisselend resultaat.", G: "De leerling past feedback zichtbaar en effectief toe.", ZG: "De leerling integreert feedback structureel en toont groei in werkhouding en prestaties." } },
      { t: "tekst", id: "s4fb", label: "Feedback", lang: true, optioneel: true },
    ] },
    { titel: "Samenvatting van het bezoek", vragen: [
      { t: "tekst", id: "s5sterk", label: "Sterke punten / zaken die goed verlopen", lang: true },
      { t: "tekst", id: "s5groei", label: "Groeipunten / aandachtspunten", lang: true },
      { t: "keuze", id: "s5alg", label: "Algemene beoordeling van de leerling", opties: ["Uitstekend", "Goed", "Voldoende", "Onvoldoende"] },
      { t: "keuze", id: "s5advies", label: "Advies", opties: ["Geschikt voor de sector", "Heeft nog groei nodig", "Niet geschikt op dit moment"] },
    ] },
  ],
};

// ---------------------------------------------------------------------------
// Zelfevaluatie (sales of onthaal, volgens de soort stage)
// ---------------------------------------------------------------------------
const FREQ = ["Nooit", "Af en toe", "Regelmatig", "Vaak"];
const ZELF_INTRO = "Deze zelfevaluatie helpt je om na te denken over je stage-ervaring. Beantwoord elke vraag eerlijk en volledig. Neem je tijd (ongeveer 50 minuten). Je antwoorden helpen je om te groeien en geven je leerkrachten en stagebegeleiders waardevolle feedback. Je kan tussendoor bewaren.";
export const ZELF_SALES: Formulier = {
  soort: "zelf", titel: "Zelfevaluatie stage – sales", voor: "Stagiair", intro: ZELF_INTRO,
  delen: [
    { titel: "Voor de stage", vragen: [
      { t: "tekst", id: "z1verw", label: "Wat waren je verwachtingen van deze stage?", lang: true },
      { t: "schaal", id: "z1voorb", label: "Hoe goed voelde je je voorbereid op deze stage?", max: 5 },
      { t: "tekst", id: "z1leren", label: "Wat hoopte je te leren tijdens deze stage?", lang: true },
    ] },
    { titel: "Tijdens de stage", vragen: [
      { t: "schaal", id: "z2begel", label: "Hoe tevreden was je over de begeleiding in het bedrijf?", max: 5 },
      { t: "schaal", id: "z2kansen", label: "Ik kreeg voldoende kansen om mijn talenten te tonen.", max: 5 },
      { t: "keuze", id: "z2t1", label: "Klanten ontvangen en adviseren", opties: FREQ },
      { t: "keuze", id: "z2t2", label: "Kassawerk uitvoeren", opties: FREQ },
      { t: "keuze", id: "z2t3", label: "Etalages verzorgen / winkelpresentatie", opties: FREQ },
      { t: "keuze", id: "z2t4", label: "Werken met voorraadbeheer", opties: FREQ },
      { t: "keuze", id: "z2t5", label: "Administratieve taken uitvoeren", opties: FREQ },
      { t: "tekst", id: "z2trots", label: "Beschrijf één moment waarop je trots was op jezelf tijdens de stage.", lang: true },
      { t: "tekst", id: "z2moeilijk", label: "Beschrijf één moeilijk moment en hoe je ermee omging.", lang: true },
      { t: "tekst", id: "z2contact", label: "Hoe vond je het contact met je collega's en stagebegeleider?", lang: true },
    ] },
    { titel: "Na de stage", vragen: [
      { t: "tekst", id: "z3beroep", label: "In welke mate heeft de stage je beeld over het beroep beïnvloed?", lang: true },
      { t: "tekst", id: "z3zelf", label: "Wat heb je geleerd over jezelf?", lang: true },
      { t: "tekst", id: "z3houding", label: "Hoe beoordeel je jouw werkhouding (motivatie, inzet, stiptheid, attitude)?", lang: true },
      { t: "schaal", id: "z3score", label: "Hoeveel scoor je je gehele stage op 10?", max: 10 },
      { t: "tekst", id: "z3aanraden", label: "Zou je deze stageplaats aanraden aan toekomstige stagiairs? Waarom wel of niet?", lang: true },
      { t: "keuze", id: "z3opnieuw", label: "Wil je hier graag nog een tweede stageperiode lopen?", opties: ["Ja", "Misschien", "Nee"] },
      { t: "tekst", id: "z3top5", label: "Waar zou je de volgende stage willen lopen? Geef een top 5 met korte motivatie.", lang: true },
      { t: "tekst", id: "z3opm", label: "Heb je opmerkingen of suggesties voor de school of stagebegeleiding?", lang: true, optioneel: true },
    ] },
    { titel: "Terugblik op de leerdoelen", uitleg: "Beoordeel jezelf van 1 (zwak) tot 5 (sterk).", vragen: [
      { t: "schaal", id: "z4a", label: "Klantgericht communiceren", max: 5 },
      { t: "schaal", id: "z4b", label: "Samenwerken met collega's", max: 5 },
      { t: "schaal", id: "z4c", label: "Verantwoordelijkheid nemen", max: 5 },
      { t: "schaal", id: "z4d", label: "Omgaan met feedback", max: 5 },
      { t: "schaal", id: "z4e", label: "Plannen en organiseren", max: 5 },
    ] },
  ],
};
export const ZELF_ONTHAAL: Formulier = {
  soort: "zelf", titel: "Zelfevaluatie stage – onthaal en organisatie", voor: "Stagiair", intro: ZELF_INTRO,
  delen: [
    { titel: "Voor de stage", vragen: [
      { t: "tekst", id: "z1verw", label: "Wat waren je verwachtingen van deze stage?", lang: true },
      { t: "schaal", id: "z1voorb", label: "Hoe goed voelde je je voorbereid op deze stage?", max: 5 },
      { t: "tekst", id: "z1leren", label: "Wat hoopte je te leren tijdens deze stage?", lang: true },
    ] },
    { titel: "Tijdens de stage", vragen: [
      { t: "schaal", id: "z2begel", label: "Hoe tevreden was je over de begeleiding op de werkvloer?", max: 5 },
      { t: "keuze", id: "z2o1", label: "Bezoekers onthalen en doorverwijzen", opties: FREQ },
      { t: "keuze", id: "z2o2", label: "Telefonische oproepen behandelen", opties: FREQ },
      { t: "keuze", id: "z2o3", label: "Agenda's beheren of afspraken noteren", opties: FREQ },
      { t: "keuze", id: "z2o4", label: "Vergaderingen of activiteiten voorbereiden", opties: FREQ },
      { t: "keuze", id: "z2o5", label: "Documenten of mailings verwerken", opties: FREQ },
      { t: "tekst", id: "z2fier", label: "Beschrijf een taak waar je fier op bent.", lang: true },
      { t: "tekst", id: "z2uitdaging", label: "Beschrijf een uitdaging en hoe je die hebt aangepakt.", lang: true },
      { t: "tekst", id: "z2contact", label: "Hoe vond je het contact met je collega's en stagebegeleider?", lang: true },
    ] },
    { titel: "Na de stage", vragen: [
      { t: "tekst", id: "z3leukst", label: "Wat vond je het leukst aan je stage?", lang: true },
      { t: "tekst", id: "z3moeilijkst", label: "Wat vond je het moeilijkst?", lang: true },
      { t: "tekst", id: "z3samen", label: "Wat heb je geleerd over samenwerken en communicatie?", lang: true },
      { t: "tekst", id: "z3talent", label: "Hoe goed past deze richting volgens jou bij je talenten?", lang: true },
      { t: "tekst", id: "z3houding", label: "Hoe beoordeel je je stiptheid, attitude en inzet?", lang: true },
      { t: "schaal", id: "z3score", label: "Hoeveel scoor je je gehele stage op 10?", max: 10 },
      { t: "tekst", id: "z3aanraden", label: "Zou je deze stageplaats aanraden aan toekomstige stagiairs? Waarom wel of niet?", lang: true },
      { t: "keuze", id: "z3opnieuw", label: "Wil je hier graag nog een tweede stageperiode lopen?", opties: ["Ja", "Misschien", "Nee"] },
      { t: "tekst", id: "z3top5", label: "Waar zou je de volgende stage willen lopen? Geef een top 5 met korte motivatie.", lang: true },
      { t: "tekst", id: "z3opm", label: "Heb je opmerkingen of suggesties voor de school of stagebegeleiding?", lang: true, optioneel: true },
    ] },
  ],
};

// ---------------------------------------------------------------------------
// Afronding: stageverslag van de stagiair en feedback van de stagegever
// ---------------------------------------------------------------------------
export const VERSLAG: Formulier = {
  soort: "verslag",
  titel: "Stageverslag",
  voor: "Stagiair",
  intro: "In je stageverslag stel je je stageplaats voor en beschrijf je wat je gedaan en geleerd hebt. Schrijf in volzinnen en wees concreet: geef voorbeelden. Je kan tussendoor bewaren. Na indienen kan je niets meer wijzigen.",
  delen: [
    { titel: "Mijn stageplaats", vragen: [
      { t: "tekst", id: "v1zaak", label: "Stel de zaak voor: wat doet of verkoopt ze, voor welke klanten, en hoe groot is het team?", lang: true },
      { t: "tekst", id: "v1org", label: "Hoe is de werking georganiseerd? Wie doet wat, en wie was jouw aanspreekpunt?", lang: true },
    ] },
    { titel: "Mijn taken", vragen: [
      { t: "tekst", id: "v2taken", label: "Welke taken deed je het vaakst? Beschrijf hoe je ze aanpakte.", lang: true },
      { t: "tekst", id: "v2nieuw", label: "Welke taak deed je voor het eerst, en hoe verliep dat?", lang: true },
    ] },
    { titel: "Een situatie uit de praktijk", uitleg: "Beschrijf één concrete situatie met een klant, bezoeker of collega.", vragen: [
      { t: "tekst", id: "v3sit", label: "Wat was de situatie?", lang: true },
      { t: "tekst", id: "v3deed", label: "Wat deed je, en waarom?", lang: true },
      { t: "tekst", id: "v3res", label: "Wat was het resultaat, en wat zou je de volgende keer anders doen?", lang: true },
    ] },
    { titel: "Wat neem ik mee?", vragen: [
      { t: "tekst", id: "v4geleerd", label: "Wat zijn de drie belangrijkste dingen die je geleerd hebt?", lang: true },
      { t: "tekst", id: "v4school", label: "Wat uit de lessen op school kon je toepassen? Wat miste je nog?", lang: true },
      { t: "tekst", id: "v4toekomst", label: "Wat betekent deze stage voor je verdere studie of job?", lang: true },
    ] },
  ],
};

export const FEEDBACK: Formulier = {
  soort: "feedback",
  titel: "Feedback over de samenwerking",
  voor: "Stagegever",
  intro: "Hoe verliep de samenwerking met de school? Uw feedback helpt ons om leerlingen beter voor te bereiden en de stage vlotter te organiseren. Dit duurt een tweetal minuten. De stagiair ziet uw antwoorden niet.",
  delen: [
    { titel: "Samenwerking", vragen: [
      { t: "schaal", id: "f1voorb", label: "Hoe goed was de stagiair voorbereid op de stage?", max: 5 },
      { t: "schaal", id: "f1info", label: "Hoe duidelijk was de informatie van de school (afspraken, verwachtingen)?", max: 5 },
      { t: "schaal", id: "f1contact", label: "Hoe vlot verliep het contact met de stagebegeleiding?", max: 5 },
      { t: "schaal", id: "f1platform", label: "Hoe eenvoudig was het werken met het stageplatform (contract, rooster, evaluatie)?", max: 5 },
    ] },
    { titel: "Volgende keer", vragen: [
      { t: "keuze", id: "f2opnieuw", label: "Wil u volgend schooljaar opnieuw een stagiair ontvangen?", opties: ["Ja", "Misschien", "Nee"] },
      { t: "keuze", id: "f2periode", label: "Welke periode past u het best?", opties: ["Blokstage 1 (najaar)", "Blokstage 2 (voorjaar)", "Beide", "Maakt niet uit"] },
      { t: "tekst", id: "f2beter", label: "Wat kunnen we beter doen?", lang: true, optioneel: true },
      { t: "tekst", id: "f2opm", label: "Andere opmerkingen", lang: true, optioneel: true },
    ] },
  ],
};

export function formulier(soort: Soort, stage: "sales" | "onthaal" | "" | null | undefined): Formulier {
  if (soort === "mentor") return MENTOR;
  if (soort === "school") return SCHOOL;
  if (soort === "verslag") return VERSLAG;
  if (soort === "feedback") return FEEDBACK;
  return stage === "onthaal" ? ZELF_ONTHAAL : ZELF_SALES;
}

export type Antwoorden = Record<string, string>;
export type EvaluatieRij = {
  dossier_id: string;
  soort: Soort;
  antwoorden: Antwoorden;
  status: "concept" | "ingediend";
  naam: string | null;
  ingediend_op: string | null;
  gewijzigd_op: string;
};
export type Resultaat = {
  dossier_id: string;
  vrijgegeven_op: string | null;
  eindpunt: number | null;
  opmerking: string | null;
};
export type Puntenschema = { O: number; V: number; G: number; ZG: number; op: number; aandeel_mentor: number };
export const PUNTEN_STANDAARD: Puntenschema = { O: 4, V: 6, G: 8, ZG: 10, op: 20, aandeel_mentor: 50 };

/** Wat ontbreekt er nog voor indienen? */
export function ontbreekt(f: Formulier, a: Antwoorden) {
  const uit: string[] = [];
  for (const d of f.delen) for (const v of d.vragen) {
    if (v.t === "tekst" && v.optioneel) continue;
    if (!String(a[v.id] ?? "").trim()) uit.push(v.label);
  }
  return uit;
}

/** Score van één evaluatie op 10 (gemiddelde van de beoordelingen, zonder 'niet van toepassing'), of null. */
export function score(f: Formulier, a: Antwoorden, p: Puntenschema = PUNTEN_STANDAARD) {
  const w: number[] = [];
  for (const d of f.delen) for (const v of d.vragen) {
    if (v.t !== "rubric") continue;
    const x = a[v.id] as Niveau | undefined;
    if (x && x !== "NVT" && p[x] !== undefined) w.push(p[x]);
  }
  return w.length ? w.reduce((s, x) => s + x, 0) / w.length : null;
}

/** Voorstel van punt: mentor en school volgens het aandeel, omgerekend naar 'op'. */
export function puntVoorstel(mentor: number | null, school: number | null, p: Puntenschema = PUNTEN_STANDAARD) {
  if (mentor === null && school === null) return null;
  const m = p.aandeel_mentor / 100;
  const s10 = mentor === null ? school! : school === null ? mentor : mentor * m + school * (1 - m);
  return Math.round((s10 / 10) * p.op * 10) / 10;
}

/** Tellingen per niveau, voor overzichten. */
export function verdeling(f: Formulier, a: Antwoorden) {
  const t: Record<Niveau, number> = { O: 0, V: 0, G: 0, ZG: 0, NVT: 0 };
  for (const d of f.delen) for (const v of d.vragen) if (v.t === "rubric" && a[v.id]) t[a[v.id] as Niveau]++;
  return t;
}

/** Antwoorden opschonen: enkel vragen uit het formulier, tekst ingekort. */
export function schoon(f: Formulier, a: Antwoorden): Antwoorden {
  const ids = new Set(f.delen.flatMap((d) => d.vragen.map((v) => v.id)));
  return Object.fromEntries(Object.entries(a ?? {}).filter(([k]) => ids.has(k)).map(([k, v]) => [k, String(v ?? "").slice(0, 4000)]));
}

/** Antwoord in woorden (voor weergave en pdf). */
export function antwoordTekst(v: Vraag, x: string | undefined) {
  if (!x) return "–";
  if (v.t === "rubric") return NIVEAU_LABEL[x as Niveau] ?? x;
  if (v.t === "schaal") return `${x} / ${v.max}`;
  if (v.t === "datum") return x.split("-").reverse().join("/");
  return x;
}
