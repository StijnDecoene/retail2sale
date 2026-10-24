// Stagecontract: gegevens, contracttekst (gedeeld door scherm en pdf) en status van de ondertekening.
// Geen server-only code: wordt ook in de contractpagina in de browser gebruikt.
import type { AanvraagGegevens } from "@/lib/portaal";
import { leeftijdOp } from "@/lib/portaal";
import { MIN_ACTIVITEITEN, perGroep, voorstel, type ActItem, type Activiteit } from "@/lib/activiteiten";

export type Rol = "stagegever" | "stagiair" | "ouder" | "directie";
export const ROLLEN: Rol[] = ["stagegever", "stagiair", "ouder", "directie"];
export const ROL_LABEL: Record<Rol, string> = { stagegever: "Stagegever", stagiair: "Stagiair", ouder: "Ouder of voogd", directie: "Directeur" };

/** Wat de stagegever (of de school) aanvult bovenop de aanvraag. */
export type ContractGegevens = {
  ondertekenaar?: string;
  hoedanigheid?: string;
  mentor?: string;
  mentor_tel?: string;
  winkel_naam?: string;
  winkel_adres?: string;
  winkel_tel?: string;
  winkel_email?: string;
  kbo?: string;
  pc?: string;
  rsz?: string;
  risico?: "" | "heb" | "stuur";
  toestellen?: string;
  afspraken?: string;
  stagiair_adres?: string;
  /** individuele activiteitenlijst (bijlage bij de overeenkomst) */
  activiteiten?: ActItem[];
};

export type Partij = {
  rol: Rol;
  getekend_op: string | null;
  getekend_naam: string | null;
  plaats: string | null;
  handtekening: string | null;
  extra: { relatie?: string; hoedanigheid?: string; adres?: string; namens?: string } | null;
};

export type ContractData = {
  dossier_id: string;
  leerling: { voornaam: string; naam: string; klas: string; email: string | null; gsm: string | null };
  blok: { naam: string; code: string; schooljaar: string; start_datum: string; eind_datum: string; uren: number; uren_per_week: number };
  uitzonderingen: { van: string; tot: string; naam: string; soort: string }[];
  aanvraag: AanvraagGegevens;
  team: { naam: string; telefoon: string | null; email: string }[];
  contract: { gegevens: ContractGegevens; meerderjarig: boolean; afgerond_op: string | null };
  partijen: Partij[];
  /** schooleigen activiteitenlijst (actieve activiteiten), voor het voorstel */
  catalogus?: Activiteit[];
};

export const SCHOOL_CONTRACT = {
  naam: "Spes Nostra vzw",
  afdeling: "Spes Nostra 2de en 3de graad",
  adres: "Heulsekasteelstraat 2A, 8501 Heule",
  gemeente: "Heule",
  telefoon: "056 35 39 53",
  secretariaat: "secretariaat2-3@snh.be",
  ondernemingsnr: "0409 859 939",
  rpr: "RPR Gent, afdeling Kortrijk",
  directeur: "Dhr. P. Dhuyvetter",
  stagemail: "retail2sale@snh.be",
};

export const HOEDANIGHEDEN = ["zaakvoerder", "bestuurder", "gerant", "eigenaar", "verantwoordelijke, namens de zaakvoerder"];

/** Is de stagiair op de eerste stagedag 18 of ouder? */
export function isMeerderjarig(geboortedatum: string | undefined, start: string) {
  const l = leeftijdOp(geboortedatum, start);
  return l !== null && l >= 18;
}

/** Beginwaarden uit de aanvraag; de aanvullingen gaan voor. */
export function effectief(d: Pick<ContractData, "aanvraag" | "contract"> & { catalogus?: Activiteit[] }): Required<ContractGegevens> {
  const a = d.aanvraag ?? {}, b = a.bedrijf ?? {}, m = a.mentor ?? {}, v = a.verantwoordelijke ?? {};
  const basis: Required<ContractGegevens> = {
    ondertekenaar: v.zelfde === false && v.naam ? v.naam : m.naam ?? "",
    hoedanigheid: "",
    mentor: m.naam ?? "",
    mentor_tel: m.tel ?? "",
    winkel_naam: [b.naam, b.juridisch && b.juridisch !== b.naam ? `(${b.juridisch})` : ""].filter(Boolean).join(" "),
    winkel_adres: [b.straat, [b.postcode, b.gemeente].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    winkel_tel: b.tel ?? "",
    winkel_email: (v.zelfde === false ? v.email : m.email) ?? "",
    kbo: b.kbo ?? "",
    pc: "",
    rsz: "",
    risico: "",
    toestellen: "",
    afspraken: "",
    stagiair_adres: "",
    activiteiten: voorstel(d.catalogus ?? [], b.soort),
  };
  const g = d.contract?.gegevens ?? {};
  const uit = { ...basis };
  if (Array.isArray(g.activiteiten) && g.activiteiten.length) uit.activiteiten = g.activiteiten;
  for (const k of Object.keys(basis) as (keyof ContractGegevens)[]) {
    if (k === "activiteiten") continue;
    const w = g[k];
    if (w !== undefined && w !== null && String(w) !== "") (uit as unknown as Record<string, string>)[k] = String(w);
  }
  return uit;
}

/** Welke partijen moeten tekenen (zonder ouder bij een meerderjarige stagiair). */
export const nodigeRollen = (meerderjarig: boolean): Rol[] => (meerderjarig ? ROLLEN.filter((r) => r !== "ouder") : ROLLEN);

export function partij(d: Pick<ContractData, "partijen">, rol: Rol) {
  return d.partijen.find((p) => p.rol === rol);
}
export const getekend = (d: Pick<ContractData, "partijen">, rol: Rol) => !!partij(d, rol)?.getekend_op;

/** Mag deze rol nu tekenen? */
export function magTekenen(d: Pick<ContractData, "partijen" | "contract">, rol: Rol) {
  if (getekend(d, rol)) return false;
  if (rol === "stagegever") return true;
  if (rol === "directie") return nodigeRollen(d.contract.meerderjarig).filter((r) => r !== "directie").every((r) => getekend(d, r));
  return getekend(d, "stagegever");
}

/** Ontbrekende verplichte gegevens van de stagegever. */
export function gegevensFouten(g: Required<ContractGegevens>): Record<string, string> {
  const f: Record<string, string> = {};
  if (!g.ondertekenaar.trim()) f.ondertekenaar = "Vul de naam in van wie ondertekent.";
  if (!g.hoedanigheid.trim()) f.hoedanigheid = "Kies de hoedanigheid.";
  if (!g.mentor.trim()) f.mentor = "Vul de naam van de mentor in.";
  if (g.activiteiten.length < MIN_ACTIVITEITEN) f.activiteiten = `Duid minstens ${MIN_ACTIVITEITEN} activiteiten aan.`;
  return f;
}

// ---------------------------------------------------------------------------
// Contracttekst
// ---------------------------------------------------------------------------
/** Een stukje tekst: gewone tekst, vet, of een ingevuld gegeven (leeg = nog in te vullen). */
export type Deel = string | { b: string } | { v: string | null | undefined; leeg?: string };
export type TekstBlok = { t: "p" | "h4" | "note"; d: Deel[] } | { t: "ul"; items: Deel[][] };
export type Sectie = { id: string; titel: string; inklapbaar?: boolean; blokken: TekstBlok[] };

const datum = (s: string, o: Intl.DateTimeFormatOptions) => new Date(`${s.slice(0, 10)}T12:00:00Z`).toLocaleDateString("nl-BE", { timeZone: "UTC", ...o });
export const datumLang = (s: string) => datum(s, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const datumMidden = (s: string) => datum(s, { day: "numeric", month: "long", year: "numeric" });
const v = (w: string | null | undefined, leeg?: string): Deel => ({ v: w, leeg });
const p = (...d: Deel[]): TekstBlok => ({ t: "p", d });
const h = (s: string): TekstBlok => ({ t: "h4", d: [s] });
const lijst = (...items: string[]): TekstBlok => ({ t: "ul", items: items.map((x) => [x]) });

function vakantieZin(d: ContractData) {
  const vak = d.uitzonderingen.filter((u) => u.soort === "vakantie").map((u) => u.naam);
  if (!vak.length) return "Op vakantie- en feestdagen is er geen stage, tenzij in overleg.";
  const namen = vak.length === 1 ? vak[0] : `${vak.slice(0, -1).join(", ")} en ${vak.at(-1)}`;
  return `Op vakantie- en feestdagen (${namen}) is er geen stage, tenzij in overleg.`;
}

export function contractTekst(d: ContractData): Sectie[] {
  const g = effectief(d);
  const l = d.leerling, b = d.blok, t = d.team, mj = d.contract.meerderjarig;
  const stagiair = `${l.voornaam} ${l.naam}`;
  const ouderP = partij(d, "ouder");
  const ouder = ouderP?.getekend_naam ? `${ouderP.getekend_naam}${ouderP.extra?.relatie ? ` (${ouderP.extra.relatie})` : ""}` : "";
  const begeleiders = t.map((x) => x.naam);
  const begNamen = begeleiders.length <= 1 ? begeleiders.join("") : `${begeleiders.slice(0, -1).join(", ")} en ${begeleiders.at(-1)}`;
  const nood = [d.aanvraag.stagiair?.nood_naam, d.aanvraag.stagiair?.nood_tel].filter(Boolean).join(", ");
  const gsm = d.aanvraag.stagiair?.gsm || l.gsm;
  const ordinaal = b.code === "b2" ? "tweede" : "eerste";

  return [
    { id: "vooraf", titel: "Woord vooraf", blokken: [
      p(`Tijdens dit schooljaar lopen de stagiairs van Onthaal, organisatie en sales stage in twee periodes: één periode `, { b: "sales" }, " en één periode ", { b: "onthaal en organisatie" }, "."),
      p("Alle betrokken partijen zijn de werkgever en de werknemers van de stageplaats dankbaar dat zij de stagiair de kans geven om meer praktijkervaring op te doen."),
      p("Deze overeenkomst beschrijft wat er van de stage wordt verwacht. Duidelijke afspraken vermijden discussie. Als stagegever staat u in voor de begeleiding en de ondersteuning van de stagiair. Het is wettelijk belangrijk dat alle gegevens volledig en correct zijn."),
    ] },
    { id: "begeleiding", titel: "Stagebegeleiding en privacy", blokken: [
      p(`De stagebegeleiding is in handen van ${t.map((x) => `${x.naam}${x.telefoon ? ` (${x.telefoon})` : ""}`).join(" en ")}. U kan bij hen terecht met alle praktische vragen over de stage. E-mail: ${SCHOOL_CONTRACT.stagemail}.`),
      h("Stageplatform"),
      p("Alle communicatie, evaluaties en de registratie van afwezigheden verlopen, naast het rechtstreekse contact met de stagiair en de stagebegeleiding, via het online stageplatform Retail2Sale. Bij de start van de stage krijgen de stagiair en de stagegever daar toegang toe."),
      h("Privacy (GDPR)"),
      p(`${SCHOOL_CONTRACT.naam} verwerkt de persoonsgegevens in dit contract om de stage te organiseren en op te volgen: planning, communicatie, evaluatie en toegang tot het stageplatform. De gegevens worden veilig bewaard en enkel gedeeld met partijen die nodig zijn voor de stage, zoals de verzekeraar van de school, de onderwijsinspectie en de beheerder van het stageplatform. Ze worden niet voor andere doeleinden gebruikt.`),
      p(`Het ondertekende contract wordt bewaard zolang de wettelijke bewaarplicht voor schooldocumenten dat vereist. De overige gegevens worden verwijderd na afloop van de stage. U kan uw gegevens altijd inkijken, laten verbeteren of laten verwijderen voor zover de wet dat toelaat, via ${SCHOOL_CONTRACT.secretariaat}.`),
    ] },
    { id: "gegevens", titel: "Gegevens", blokken: [
      h("Stagiair"),
      p(v(stagiair), ` · klas ${l.klas} · `, v(g.stagiair_adres, "adres: vult de stagiair in bij het ondertekenen")),
      p("Gsm ", v(gsm, "niet gekend"), " · e-mail ", v(l.email, "niet gekend"), " · te verwittigen bij nood ", v(nood, "niet gekend")),
      h("Stageplaats"),
      p(v(g.winkel_naam), " · ", v(g.winkel_adres)),
      p("Telefoon ", v(g.winkel_tel, "niet ingevuld"), " · e-mail ", v(g.winkel_email, "niet ingevuld")),
      p("Mentor ", v(g.mentor), g.mentor_tel ? " · " : "", ...(g.mentor_tel ? [v(g.mentor_tel)] : [])),
      p("Ondernemingsnummer ", v(g.kbo), " · paritair comité ", v(g.pc, "niet ingevuld"), " · RSZ-kengetal ", v(g.rsz, "niet ingevuld")),
      h("School"),
      p(`${SCHOOL_CONTRACT.naam}, ${SCHOOL_CONTRACT.adres} · ondernemingsnummer ${SCHOOL_CONTRACT.ondernemingsnr} · ${SCHOOL_CONTRACT.rpr}`),
    ] },
    { id: "uren", titel: "Stage-uren", blokken: [
      p(`De stage kan, al dan niet variabel, ingepland worden op dinsdag, woensdag, donderdag, vrijdag en zaterdag, steeds in overleg met de stagiair en rekening houdend met diens activiteiten. Er wordt gemiddeld ${b.uren_per_week} uur per week gewerkt. ${vakantieZin(d)}`),
      p({ b: `${b.naam} (${ordinaal} blokstage): van ${datumLang(b.start_datum)} tot en met ${datumLang(b.eind_datum)}.` }),
      p("De stagegever en de stagiair leggen de werkplanning samen vast vóór de eerste stagedag. De stagebegeleiding verwerkt die planning tot een stagekalender en bezorgt die aan alle partijen."),
    ] },
    { id: "overeenkomst", titel: "Stageovereenkomst", blokken: [
      p("a) ", v(g.ondertekenaar), ", handelend in de hoedanigheid van ", v(g.hoedanigheid), " voor ", v(g.winkel_naam), ", met zetel te ", v(g.winkel_adres), ", ondernemingsnummer ", v(g.kbo), ", hierna de ", { b: "stagegever" }, ";"),
      p(`b) ${SCHOOL_CONTRACT.directeur}, handelend in de hoedanigheid van directeur van ${SCHOOL_CONTRACT.naam} (2de en 3de graad), ${SCHOOL_CONTRACT.adres}, hierna de `, { b: "school" }, ";"),
      mj
        ? p("c) ", v(stagiair), ", meerderjarige leerling aan bovengenoemde school, wonende te ", v(g.stagiair_adres, "vult de stagiair in bij het ondertekenen"), ", hierna de ", { b: "stagiair" }, ";")
        : p("c) ", v(stagiair), ", leerling aan bovengenoemde school, hierbij vertegenwoordigd door ", v(ouder, "ouder of voogd: vult dit zelf in bij het ondertekenen"), ", wonende te ", v(g.stagiair_adres, "vult de stagiair in bij het ondertekenen"), ", hierna de ", { b: "stagiair" }, ";"),
      p("komen het volgende overeen:"),
      h("Artikel 1"),
      p(`De stagegever laat de stagiair toe in de onder a) genoemde onderneming om er een stageperiode door te brengen. De stageperiode van klas ${l.klas} begint op `, { b: datumLang(b.start_datum) }, " en eindigt op ", { b: datumLang(b.eind_datum) }, "."),
      p(`Tijdens de blokstage werkt de stagiair gemiddeld ${b.uren_per_week} uur per week, variabel in te plannen op dinsdag tot en met zaterdag in overleg met de stagiair. In totaal worden er `, { b: `${b.uren} uur` }, " gepresteerd. De werkplanning wordt vóór de aanvang van de stage in onderling overleg vastgelegd. De stagegever, de stagiair en de stagebegeleiding ontvangen hiervan een digitaal document."),
      mj
        ? { t: "note", d: ["De stagiair is meerderjarig. De bijzondere regels voor jeugdige werknemers gelden dan niet; de arbeidsduurregels van de sector blijven van toepassing."] }
        : { t: "note", d: ["Regels voor jeugdige werknemers (jonger dan 18): maximum 8 uur per dag en 40 uur per week; nooit meer dan vier en een half uur ononderbroken werken; bij meer dan zes uur werk per dag één uur rust, waarvan een half uur ineens; minstens 12 uur ononderbroken rust tussen twee werkdagen; geen nachtarbeid tussen 20u en 6u. Stages op zon- en feestdagen zijn in principe verboden."] },
      h("Artikel 2"),
      p(`De begeleiding van de stagiair wordt toevertrouwd aan ${begNamen}, stagebegeleiders en leraren van Spes Nostra Heule, en aan `, v(g.mentor), ", contactpersoon en persoonlijke mentor op de werkvloer. Een vervanging van de stagebegeleiders wordt onmiddellijk per e-mail aan de mentor gemeld. De stagebegeleiders mogen de werkpost en de stagiair op elk moment bezoeken, zonder de winkel vooraf te verwittigen."),
      h("Artikel 3"),
      p("De directeur verklaart de nodige verzekeringen te hebben afgesloten tot dekking van de risico's van de stage."),
      h("Artikel 4"),
      p("De directeur, de stagegever en de stagiair verklaren het stagereglement te kennen en na te leven."),
      h("Artikel 5"),
      p("De stagegever volgt de communicatie over de stage op via het stageplatform: afwezigheden en inhaalstage, planning en evaluaties."),
      h("Artikel 6"),
      p("Vóór de stage moet er voor de activiteiten van de stagiair een risicoanalyse beschikbaar zijn, die de risico's voor de veiligheid en de fysieke en psychische gezondheid van de stagiair in kaart brengt. Een werkgever met werknemers heeft een risicoanalyse per werkpost of activiteit; die geldt ook voor de stagiair op die werkpost. De risicoanalyse of werkpostfiche wordt digitaal bezorgd vóór de aanvang van de stage. Een eenmanszaak zonder werknemers ontvangt op vraag van de school een werkpostfiche om in te vullen."),
      p("Keuze van de stagegever: ", v(g.risico === "heb" ? "de stagegever heeft een risicoanalyse of werkpostfiche en bezorgt die vóór de start" : g.risico === "stuur" ? "de stagegever heeft geen werknemers en ontvangt een werkpostfiche van de school" : "", "nog aan te duiden")),
      h("Artikel 7"),
      p("Zaken die niet geregeld zijn, worden opgelost op een manier die het goede verloop en het nut van de stage ten goede komt."),
      h("Artikel 8"),
      p(`Deze overeenkomst wordt digitaal ondertekend door ${mj ? "de stagegever, de stagiair en de directeur" : "de stagegever, de stagiair, de ouder of voogd en de directeur"}. Een digitale handtekening heeft dezelfde waarde als een handtekening op papier. Elke partij ontvangt digitaal een exemplaar van de ondertekende overeenkomst; een papieren versie is niet nodig.`),
      h("Bijzondere voorwaarden"),
      p("De activiteiten die de stagiair tijdens de stage uitvoert, staan in de activiteitenlijst hieronder. Ze houden rekening met de opleiding en met de fysieke en psychische maturiteit van de stagiair, en worden veilig uitgevoerd op basis van de risicoanalyse. Activiteiten met de vermelding ", { b: "onder rechtstreeks toezicht" }, " voert de stagiair enkel uit in aanwezigheid van de mentor of een ervaren collega."),
      p("Niet toegelaten toestellen of taken: ", v(g.toestellen, "geen")),
      p("Andere afspraken: ", v(g.afspraken, "geen")),
    ] },
    { id: "activiteiten", titel: "Activiteitenlijst", blokken: activiteitenBlokken(d, g.activiteiten) },
    { id: "reglement", titel: "Stagereglement", blokken: [
      h("Artikel 1"), p("Dit reglement geldt voor alle leerlingen van het voltijds secundair onderwijs die een stage volbrengen in het kader van hun opleiding, voor de directeurs van deze scholen en voor de stagegevers."),
      h("Artikel 2"), p("De stagiair blijft onder het gezag van de directeur of zijn afgevaardigde."),
      h("Artikel 3"), p("De stagiair voert opdrachten uit onder leiding en toezicht van de stagementor. De stagiair mag taken weigeren die niet in de leerplandoelstellingen voorzien zijn, die zijn of haar fysieke of psychische mogelijkheden te boven gaan of die strijdig zijn met dit reglement. Bij betwisting beslissen de stagebegeleiders. De stagiair mag hen hiervoor altijd contacteren."),
      h("Artikel 4"), p("De leerlingen van Onthaal, organisatie en sales lopen tijdens het schooljaar stage in twee stageplaatsen."),
      h("Artikel 5"), p("De stage wordt niet betaald. Woon-werkverplaatsingen zijn ten laste van de stagiair. Noodzakelijke verplaatsingen tijdens de stage en in opdracht van de stagegever zijn ten laste van de stagegever."),
      h("Artikel 6"), p(`De stagiair komt op de afgesproken dagen en uren en is minstens 10 minuten vóór de start aanwezig. De stage-uren liggen in principe tussen 7u en 19u. ${mj ? "Voor een meerderjarige stagiair gelden de arbeidsduurregels van de sector." : "De regels voor jeugdige werknemers uit artikel 1 van de stageovereenkomst zijn van toepassing."} Geen stage op zon- of feestdag. Afwijkingen gebeuren altijd in overleg met de stagiair en de stagebegeleiding.`),
      p("De stagiair plant tijdens de stage-uren geen dokters- of tandartsbezoek, rijles, uitstap of vervroegde vakantie. Uitzonderingen zijn een sluiting van de winkel (verlof, verbouwing) of een wijziging van de stagedagen op vraag van de winkelier. De stagiair verwittigt de stagebegeleiding tijdig; na overleg wordt een schriftelijke regeling uitgewerkt."),
      h("Artikel 7"), p("Bij ziekte verwittigt de stagiair vóór de start van de stage telefonisch en persoonlijk de winkelier, beide stagebegeleiders en het secretariaat van de school. Na de ziekte bezorgt de stagiair een doktersattest aan het secretariaat, een kopie aan de winkelier en een attest arbeidsongeschiktheid elektronisch aan de stagebegeleiders. Wie één van de drie partijen niet verwittigt, is onwettig afwezig."),
      p("De school kan een inhaalstage opleggen wanneer de stagiair door ziekte of een andere gewettigde reden stage heeft gemist. Die vindt plaats op woensdagnamiddag, op zaterdag, in de schoolvakanties of op lesvrije dagen. De winkelier registreert de inhaalstage via het stageplatform."),
      h("Artikel 8"), p("De stagiair gedraagt zich beleefd en voorkomend tegenover de stagegever en zijn werknemers."),
      h("Artikel 9"), p("§ 1. De stagegever stelt het nodige materiaal ter beschikking. § 2. Toestellen die niet gebruikt mogen worden, staan in de bijzondere voorwaarden. § 3. De stagiair geeft het toevertrouwde materiaal in goede staat terug. Hij of zij is niet verantwoordelijk voor slijtage door normaal gebruik, noch voor gebrekkig werk door onervarenheid of fouten; die schade is ten laste van de stagegever. § 4. Ouders of de meerderjarige stagiair zijn verantwoordelijk voor schade door opzettelijke daden; een overtreding van het stagereglement staat gelijk met opzet. § 5. Voor andere schade door de stagiair sluit de school vóór de stage een verzekering af."),
      h("Artikel 10"), p("De stagiair en de stagebegeleider respecteren het beroepsgeheim van de sector en doen niets wat de goede naam of de werking van de stagegever kan schaden, ook na de stage."),
      h("Artikel 11"), p("§ 1. De stagegever of mentor zorgt voor het onthaal van de stagiair. § 2. De stagiair leeft het arbeidsreglement en de voorschriften van de onderneming na; de stagegever of mentor ziet hierop toe."),
      h("Artikel 12"), p("§ 1. De stagegever is verantwoordelijk voor eigen overtredingen van het stagereglement. § 2. De stagegever respecteert de regels inzake arbeidsduur van de sector."),
      h("Artikel 13"), p("De stagegever aanvaardt het toezicht van de stagebegeleiders en geeft hen de informatie die nodig is voor de evaluatie."),
      h("Artikel 14"), p("De stagegever mag (1) informeren naar de reden van afwezigheid, (2) zelf een mentor aanstellen en (3) de overeenkomst verbreken bij opzettelijke zware schade, herhaalde onwettige afwezigheid, zware inbreuken, wangedrag of overmacht. Een verbreking is enkel geldig als ze gemotiveerd is en na contact met de stagebegeleiding gebeurt."),
      h("Artikel 15"), p("De directeur duidt stagebegeleiders aan voor de voorbereiding, de begeleiding en het toezicht op de stages."),
      h("Artikel 16"), p("De directeur wordt onmiddellijk op de hoogte gebracht van ongevallen overkomen aan of veroorzaakt door de stagiair."),
      h("Artikel 17"), p("§ 1. De directeur kan de overeenkomst opschorten bij zware inbreuken van de stagegever, gevaar voor de gezondheid van de stagiair, een inefficiënte stage of onvoldoende begeleiding. § 2. Daarna beslist de directeur over een verbreking, die enkel geldig is als ze gemotiveerd en schriftelijk gebeurt."),
      h("Artikel 18"), p("De stagiair kan de overeenkomst niet eigenmachtig verbreken. Vinden de ouders de stage inefficiënt of onnuttig, dan kan de stagiair van stageplaats veranderen met akkoord van de stagebegeleiding en de directie. De gevolgen voor de evaluatie staan in het schoolreglement."),
      h("Artikel 19"), p("De stagegever mag alle nuttige inlichtingen over de stagiair vragen aan de stagebegeleiding."),
      h("Artikel 20"), p("Bij staking, technische of economische werkloosheid of overmacht stuurt de stagegever de stagiair terug naar school en verwittigt hij meteen telefonisch de stagebegeleiding."),
    ] },
    { id: "stageplan", titel: "Stageplan en evaluatie", inklapbaar: true, blokken: [
      h("Doelstellingen"),
      lijst(
        "de verschillende vakken integreren en theorie vertalen naar de praktijk;",
        "de leerlingen vanuit de praktijk motiveren voor de theorielessen;",
        "de opleiding bijsturen dankzij de betrokkenheid van bedrijfsleiders en mentors;",
        "de tewerkstellingskansen verhogen: inzicht in de werking van een winkel, werken met apparatuur, gepast gedrag op de werkvloer, kritiek aanvaarden, verantwoordelijkheid dragen en samenwerken.",
      ),
      h("Planning en onthaal"),
      p("De opdrachten worden geleidelijk moeilijker en gevarieerd, zodat alle aspecten aan bod komen, maar ze blijven haalbaar. Seriewerk is enkel aanvaardbaar om een vaardigheid of tempo te verwerven. De stagegever zorgt voor een goed onthaal, licht de stagiair in over de werking, de reglementen en de taken, en schept een klimaat waarin de stagiair zich gesteund voelt."),
      h("Begeleiding"),
      p("De directe werkbegeleiding gebeurt door de stagegever samen met de stagebegeleiders; de methodische begeleiding vooral door de stagebegeleiders."),
      h("Evaluatiemomenten"),
      lijst("evaluatiebezoek(en) door de stagebegeleiding;", "evaluatie door de winkelier op het einde van de stageperiode;", "zelfevaluatie door de stagiair."),
    ] },
    { id: "gedragscode", titel: "Gedragscode stagiair", inklapbaar: true, blokken: [
      lijst(
        "Bespreek vooraf met de stagegever: begin- en einduur, middagpauze, inhaalstage, vereiste kledij en gsm-gebruik.",
        "Kom steeds 10 minuten vóór de start; meld afwezigheden tijdig en altijd met een doktersattest.",
        "Draag verzorgde, aangepaste kleding: geen sportieve kledij, gescheurde jeans of sportschoenen; geen kauwgom.",
        "Spreek duidelijk en spreek mensen aan met mevrouw of mijnheer.",
        "Leg contact met collega's, stel vragen, neem initiatief en voer taken nauwkeurig uit.",
        "Respecteer het beroepsgeheim: horen, zien en zwijgen.",
      ),
    ] },
  ];
}

/** Bijlage: de individuele activiteitenlijst, per groep. */
function activiteitenBlokken(d: ContractData, items: ActItem[]): TekstBlok[] {
  const bevestigd = Array.isArray(d.contract.gegevens.activiteiten) && d.contract.gegevens.activiteiten.length > 0;
  const uit: TekstBlok[] = [
    p("Opgesteld door de stagebegeleiding en de stagegever, voor ", { b: `${d.leerling.voornaam} ${d.leerling.naam}` }, ". Tussen haakjes: de leerplandoelen (LPD) van Onthaal, organisatie en sales waar de activiteit bij aansluit. De stage is gericht op leren, niet op productie."),
  ];
  if (!bevestigd) uit.push({ t: "note", d: [v("", "Voorstel van de school: de stagegever kijkt de lijst na en vult ze aan bij het invullen van de gegevens.")] });
  for (const [groep, lijstItems] of perGroep(items)) {
    uit.push(h(groep));
    uit.push({ t: "ul", items: lijstItems.map((i) => [i.tekst + (i.lpd ? ` (LPD ${i.lpd})` : ""), ...(i.toezicht ? [" — ", { b: "onder rechtstreeks toezicht" }] as Deel[] : [])]) });
  }
  return uit;
}

/** Platte tekst van het contract (voor de vingerafdruk bij het ondertekenen). */
export function contractPlat(d: ContractData): string {
  const deel = (x: Deel) => (typeof x === "string" ? x : "b" in x ? x.b : x.v || x.leeg || "");
  return contractTekst(d)
    .map((s) => [s.titel, ...s.blokken.map((b) => (b.t === "ul" ? b.items.map((i) => `- ${i.map(deel).join("")}`).join("\n") : b.d.map(deel).join("")))].join("\n"))
    .join("\n\n");
}

/** Korte status voor beheer en portaal. */
export function contractStatus(d: Pick<ContractData, "partijen" | "contract">) {
  const nodig = nodigeRollen(d.contract.meerderjarig);
  const klaar = nodig.filter((r) => getekend(d, r)).length;
  const volgende = nodig.find((r) => !getekend(d, r)) ?? null;
  return { nodig, klaar, totaal: nodig.length, afgerond: klaar === nodig.length, volgende };
}

// ---------------------------------------------------------------------------
// Adres in losse velden (straat, nummer, bus, postcode, gemeente)
// ---------------------------------------------------------------------------
export type AdresDelen = { straat: string; nummer: string; bus: string; postcode: string; gemeente: string };
export const LEEG_ADRES: AdresDelen = { straat: "", nummer: "", bus: "", postcode: "", gemeente: "" };

/** "Gullegemsestraat 41 bus 2, 8501 Heule" */
export function adresSamen(a: AdresDelen) {
  const straat = [a.straat.trim(), a.nummer.trim()].filter(Boolean).join(" ");
  const bus = a.bus.trim() ? ` bus ${a.bus.trim().replace(/^bus\s*/i, "")}` : "";
  return `${straat}${bus}, ${a.postcode.trim()} ${a.gemeente.trim()}`.trim();
}

/** Een eerder bewaard adres terug in delen (zo goed mogelijk). */
export function adresSplits(s: string | undefined): AdresDelen {
  const m = (s ?? "").match(/^(.*?)\s+(\d+[a-zA-Z]?)(?:\s*(?:bus|b\.?|\/)\s*([\w-]+))?\s*,\s*(\d{4})\s+(.+)$/);
  return m ? { straat: m[1], nummer: m[2], bus: m[3] ?? "", postcode: m[4], gemeente: m[5] } : { ...LEEG_ADRES };
}

export function adresFouten(a: AdresDelen): Record<string, string> {
  const f: Record<string, string> = {};
  if (a.straat.trim().length < 2) f["adres.straat"] = "Vul je straat in.";
  if (!/^\d+[a-zA-Z]?$/.test(a.nummer.trim())) f["adres.nummer"] = "Enkel het huisnummer, bv. 41 of 41A.";
  if (!/^\d{4}$/.test(a.postcode.trim())) f["adres.postcode"] = "Vier cijfers.";
  if (a.gemeente.trim().length < 2) f["adres.gemeente"] = "Vul je gemeente in.";
  return f;
}
