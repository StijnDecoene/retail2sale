import "server-only";
import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import {
  KALENDER_UITLEG, SCHOOL, adresBedrijf, datumKortZonderJaar, datumMid, kledijTekst, naamBedrijf, naamLeerling,
  ondertekenaar, soortStage, stagekalender, teamNamen, teksten, aanspreking, blokVolgnummer, type BevestigingData, type KalenderDag,
} from "@/lib/bevestiging";

const ROOT = process.cwd();
const font = (p: string, f: string) => path.join(ROOT, "node_modules", "@fontsource", p, "files", f);
let fontsKlaar = false;
export function fonts() {
  if (fontsKlaar) return;
  Font.register({ family: "Figtree", fonts: [
    { src: font("figtree", "figtree-latin-400-normal.woff"), fontWeight: 400 },
    { src: font("figtree", "figtree-latin-600-normal.woff"), fontWeight: 600 },
    { src: font("figtree", "figtree-latin-700-normal.woff"), fontWeight: 700 },
  ] });
  Font.register({ family: "Schibsted", fonts: [
    { src: font("schibsted-grotesk", "schibsted-grotesk-latin-600-normal.woff"), fontWeight: 600 },
    { src: font("schibsted-grotesk", "schibsted-grotesk-latin-700-normal.woff"), fontWeight: 700 },
  ] });
  Font.registerHyphenationCallback((w) => [w]);
  fontsKlaar = true;
}
export const LOGO_SNH = path.join(ROOT, "public", "img", "logo-spes-nostra.png");
export const LOGO_R2S = path.join(ROOT, "public", "img", "logo-retail2sale.png");

export const C = { ink: "#0e1a2b", ink2: "#3e4a5c", muted: "#5a6578", line: "#e3e7ee", blue: "#1d5baa", blueSoft: "#eaf1fb", red: "#c21f2e", ok: "#1e7a4f", okSoft: "#e5f3ec" };
const s = StyleSheet.create({
  page: { fontFamily: "Figtree", fontSize: 10, color: C.ink, paddingTop: 36, paddingBottom: 54, paddingHorizontal: 44, lineHeight: 1.45 },
  kop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 18 },
  logos: { flexDirection: "row", alignItems: "center", gap: 10 },
  school: { fontSize: 8, color: C.muted, textAlign: "right", lineHeight: 1.4 },
  eyebrow: { fontSize: 8, fontWeight: 700, color: C.blue, letterSpacing: 1.2, textTransform: "uppercase" },
  titel: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 22, lineHeight: 1.25, marginTop: 4, marginBottom: 4 },
  sub: { color: C.muted, fontSize: 10 },
  band: { flexDirection: "row", gap: 8, marginTop: 14, marginBottom: 16 },
  vak: { flex: 1, backgroundColor: C.blueSoft, borderRadius: 6, padding: 9 },
  vakL: { fontSize: 7.5, color: C.blue, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 },
  vakW: { fontSize: 10.5, fontWeight: 700, marginTop: 2 },
  p: { marginBottom: 7, color: C.ink2 },
  bol: { flexDirection: "row", marginBottom: 2, color: C.ink2 },
  bevestigd: { borderLeftWidth: 3, borderLeftColor: C.ok, backgroundColor: C.okSoft, padding: 9, borderRadius: 4, marginVertical: 8, fontWeight: 600 },
  h2: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 12.5, marginTop: 10, marginBottom: 6 },
  stap: { flexDirection: "row", gap: 8, marginBottom: 6 },
  nr: { width: 17, height: 17, borderRadius: 9, backgroundColor: C.blue, alignItems: "center", justifyContent: "center", marginTop: 1 },
  nrT: { color: "#fff", fontSize: 8.5, fontWeight: 700, lineHeight: 1 },
  grid: { flexDirection: "row", gap: 10 },
  kaart: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 10 },
  kaartT: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 10.5, color: C.blue, marginBottom: 4 },
  rij: { flexDirection: "row", marginBottom: 1.5 },
  rijL: { width: 78, color: C.muted, fontSize: 8.5 },
  rijW: { flex: 1, fontSize: 9 },
  ondert: { marginTop: 14, flexDirection: "row", gap: 24 },
  voetT: { position: "absolute", bottom: 24, fontSize: 7.5, color: C.muted },
  // kalender
  kalRij: { flexDirection: "row" },
  kalKop: { flex: 1, fontSize: 8, fontWeight: 700, color: C.muted, textAlign: "center", paddingVertical: 4 },
  kalWeek: { width: 46, fontSize: 8, color: C.muted, paddingTop: 10 },
  kalDag: { flex: 1, height: 46, margin: 1.5, borderRadius: 5, padding: 4 },
  kalNr: { fontSize: 11, fontWeight: 700 },
  kalLab: { fontSize: 6.5, marginTop: 2, lineHeight: 1.2 },
  legende: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  blokje: { width: 12, height: 12, borderRadius: 3 },
});

const KLEUR: Record<KalenderDag["soort"], { bg: string; fg: string; rand?: string }> = {
  buiten: { bg: "#ffffff", fg: "#c9d2df" },
  stage: { bg: "#eaf1fb", fg: C.ink },
  school: { bg: "#f3f4f6", fg: C.muted },
  zondag: { bg: "#ffffff", fg: "#9aa4b2", rand: C.line },
  vakantie: { bg: "#fbe8ea", fg: "#a11a27" },
  vm: { bg: "#fbf0dc", fg: "#8a5300" },
  geen: { bg: "#fbe8ea", fg: "#a11a27" },
};

function Rij({ l, w }: { l: string; w?: string | null }) {
  if (!w) return null;
  return <View style={s.rij}><Text style={s.rijL}>{l}</Text><Text style={s.rijW}>{w}</Text></View>;
}

function Kop({ b, titel }: { b: BevestigingData; titel: string }) {
  return (
    <>
      <View style={s.kop}>
        <View style={s.logos}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={LOGO_SNH} style={{ height: 38 }} />
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={LOGO_R2S} style={{ height: 38 }} />
        </View>
        <Text style={s.school}>{`${SCHOOL.afdeling}\n${SCHOOL.straat}\n${SCHOOL.gemeente}\n${SCHOOL.telefoon} · ${SCHOOL.stagemail}`}</Text>
      </View>
      <Text style={s.eyebrow}>{`Onthaal, organisatie en sales · schooljaar ${b.schooljaar}`}</Text>
      <Text style={s.titel}>{titel}</Text>
    </>
  );
}

function Voet({ b }: { b: BevestigingData }) {
  return (
    <>
      <Text style={[s.voetT, { left: 44 }]} fixed>{`${naamLeerling(b)} · ${naamBedrijf(b)} · ${b.blok.naam}`}</Text>
      <Text style={[s.voetT, { right: 44, textAlign: "right" }]} fixed>{`${SCHOOL.naam} · ${SCHOOL.stagemail}`}</Text>
    </>
  );
}

function BevestigingPdf({ b }: { b: BevestigingData }) {
  const t = teksten(b);
  const m = b.aanvraag.mentor ?? {}, w = b.aanvraag.werkvloer ?? {}, bd = b.aanvraag.bedrijf ?? {};
  const o = ondertekenaar(b);
  const weken = stagekalender(b);
  return (
    <Document title={`Bevestiging stage ${naamLeerling(b)}`} author={SCHOOL.naam} language="nl-BE">
      <Page size="A4" style={s.page}>
        <Kop b={b} titel="Bevestiging stageplaats" />
        <Text style={s.sub}>{`${b.blok.naam} · ${datumMid(b.blok.start_datum)} tot en met ${datumMid(b.blok.eind_datum)}`}</Text>

        <View style={s.band}>
          <View style={s.vak}><Text style={s.vakL}>Stagiair</Text><Text style={s.vakW}>{`${naamLeerling(b)} · ${b.leerling.klas}`}</Text></View>
          <View style={s.vak}><Text style={s.vakL}>Stagebedrijf</Text><Text style={s.vakW}>{naamBedrijf(b)}</Text></View>
          <View style={s.vak}><Text style={s.vakL}>Stagementor</Text><Text style={s.vakW}>{m.naam || "–"}</Text></View>
          <View style={s.vak}><Text style={s.vakL}>Stagebegeleiding</Text><Text style={s.vakW}>{teamNamen(b)}</Text></View>
        </View>

        <Text style={[s.p, { color: C.ink }]}>{aanspreking(b)},</Text>
        <Text style={s.p}>{t.intro}</Text>
        <Text style={s.p}>{t.richting}</Text>
        <Text style={s.p}>{t.periode} De planning:</Text>
        {t.planning.map((x) => <View key={x} style={s.bol}><Text style={{ width: 12 }}>•</Text><Text style={{ flex: 1 }}>{x}</Text></View>)}
        <Text style={s.bevestigd}>{t.toestemming}</Text>

        <Text style={s.h2}>Wat volgt</Text>
        {t.stappen.map((x, i) => (
          <View key={x.t} style={s.stap} wrap={false}>
            <View style={s.nr}><Text style={s.nrT}>{String(i + 1)}</Text></View>
            <View style={{ flex: 1 }}><Text style={{ fontWeight: 700 }}>{x.t}</Text><Text style={{ color: C.ink2 }}>{x.x}</Text></View>
          </View>
        ))}

        <Text style={[s.p, { marginTop: 10 }]}>{t.vragen}</Text>
        <Text style={[s.p, { color: C.ink }]}>Met vriendelijke groeten,</Text>
        <View style={s.ondert} wrap={false}>
          {b.team.map((g) => (
            <View key={g.naam}>
              <Text style={{ fontWeight: 700 }}>{g.naam}</Text>
              {g.telefoon ? <Text style={{ color: C.muted, fontSize: 9 }}>{g.telefoon}</Text> : null}
            </View>
          ))}
        </View>
        <Text style={{ color: C.blue, fontWeight: 700, marginTop: 2 }}>Stagebegeleiders</Text>
        <Voet b={b} />
      </Page>

      <Page size="A4" style={s.page}>
        <Kop b={b} titel="Gegevens van de stage" />
        <Text style={[s.sub, { marginBottom: 14 }]}>{`${b.blok.naam} · ${datumMid(b.blok.start_datum)} tot en met ${datumMid(b.blok.eind_datum)}`}</Text>
        <View style={s.grid} wrap={false}>
          <View style={s.kaart}>
            <Text style={s.kaartT}>Stagiair</Text>
            <Rij l="Naam" w={naamLeerling(b)} />
            <Rij l="Klas" w={b.leerling.klas} />
            <Rij l="E-mail" w={b.leerling.email} />
            <Rij l="Gsm" w={b.leerling.gsm} />
            <Rij l="Bij nood" w={[b.aanvraag.stagiair?.nood_naam, b.aanvraag.stagiair?.nood_tel].filter(Boolean).join(" · ")} />
            <Text style={[s.kaartT, { marginTop: 8 }]}>Eerste stagedag</Text>
            <Rij l="Datum" w={datumMid(b.blok.start_datum)} />
            <Rij l="Startuur" w={w.startuur} />
            <Rij l="Melden bij" w={w.melden} />
            <Rij l="Kledij" w={kledijTekst(b)} />
          </View>
          <View style={s.kaart}>
            <Text style={s.kaartT}>Stagebedrijf</Text>
            <Rij l="Naam" w={naamBedrijf(b)} />
            <Rij l="Officieel" w={bd.juridisch} />
            <Rij l="Adres" w={adresBedrijf(b)} />
            <Rij l="Telefoon" w={bd.tel} />
            <Rij l="Soort stage" w={soortStage(b)} />
            <Text style={[s.kaartT, { marginTop: 8 }]}>Stagementor</Text>
            <Rij l="Naam" w={m.naam} />
            <Rij l="Functie" w={m.functie} />
            <Rij l="E-mail" w={m.email} />
            <Rij l="Telefoon" w={m.tel} />
            {b.aanvraag.verantwoordelijke?.zelfde === false && (
              <>
                <Text style={[s.kaartT, { marginTop: 8 }]}>Tekent het contract</Text>
                <Rij l="Naam" w={o.naam} />
                <Rij l="Functie" w={o.functie} />
                <Rij l="E-mail" w={o.email} />
              </>
            )}
          </View>
        </View>

        <Voet b={b} />
      </Page>

      <Page size="A4" style={s.page}>
        <Kop b={b} titel="Stagekalender" />
        <Text style={[s.sub, { marginBottom: 12 }]}>{`${b.blok.naam} · ${datumKortZonderJaar(b.blok.start_datum)} – ${datumMid(b.blok.eind_datum)} · ${b.blok.uren} uur`}</Text>
        <View style={s.kalRij}>
          <Text style={{ width: 46 }} />
          {["ma", "di", "wo", "do", "vr", "za", "zo"].map((x) => <Text key={x} style={s.kalKop}>{x}</Text>)}
        </View>
        {weken.map((wk) => {
          const eerste = wk.dagen.find((x) => x.soort !== "buiten") ?? wk.dagen[0];
          return (
            <View key={wk.nr} style={s.kalRij} wrap={false}>
              <Text style={s.kalWeek}>{`Week ${wk.nr}\n${datumKortZonderJaar(eerste.iso)}`}</Text>
              {wk.dagen.map((x) => {
                const k = KLEUR[x.soort];
                return (
                  <View key={x.iso} style={[s.kalDag, { backgroundColor: k.bg, borderWidth: k.rand ? 1 : 0, borderColor: k.rand ?? k.bg }]}>
                    <Text style={[s.kalNr, { color: k.fg }]}>{String(x.dag)}</Text>
                    {x.label && x.soort !== "buiten" ? <Text style={[s.kalLab, { color: k.fg }]}>{x.label}</Text> : null}
                  </View>
                );
              })}
            </View>
          );
        })}
        <View style={{ marginTop: 16 }}>
          {KALENDER_UITLEG.filter((u) => u.soort === "stage" || u.soort === "school" || weken.some((wk) => wk.dagen.some((x) => x.soort === u.soort))).map((u) => (
            <View key={u.soort} style={s.legende}>
              <View style={[s.blokje, { backgroundColor: KLEUR[u.soort].bg }]} />
              <Text style={{ fontSize: 9, color: C.ink2 }}>{u.tekst}</Text>
            </View>
          ))}
        </View>
        {b.uitzonderingen.length > 0 && (
          <>
            <Text style={s.h2}>Vakanties en uitzonderingen</Text>
            {b.uitzonderingen.map((u) => (
              <Text key={u.van + u.naam} style={{ color: C.ink2, marginBottom: 2 }}>
                {`${u.van === u.tot ? datumMid(u.van) : `${datumKortZonderJaar(u.van)} – ${datumMid(u.tot)}`}: ${u.naam}`}
              </Text>
            ))}
          </>
        )}
        <Text style={[s.p, { marginTop: 14 }]}>
          {`De stagiair en de stagegever leggen samen het werkrooster vast: ${b.blok.uren} uur in totaal, maximaal 8 uur per dag en ${b.blok.uren_per_week} uur per week gemiddeld. Op zondag is er geen stage.`}
        </Text>
        <Voet b={b} />
      </Page>
    </Document>
  );
}

export async function bevestigingPdf(b: BevestigingData): Promise<Buffer> {
  fonts();
  return renderToBuffer(<BevestigingPdf b={b} />);
}
