import "server-only";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { C, LOGO_R2S, LOGO_SNH, fonts } from "@/lib/bevestiging-pdf";
import { SCHOOL } from "@/lib/bevestiging";
import { dagLang, kalender, tijdKort, uren, werkMin, type Dagen, type RoosterContext } from "@/lib/werkrooster";

const s = StyleSheet.create({
  page: { fontFamily: "Figtree", fontSize: 9.5, color: C.ink, paddingTop: 32, paddingBottom: 50, paddingHorizontal: 44, lineHeight: 1.4 },
  kop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 14 },
  logos: { flexDirection: "row", alignItems: "center", gap: 10 },
  school: { fontSize: 8, color: C.muted, textAlign: "right", lineHeight: 1.4 },
  eyebrow: { fontSize: 8, fontWeight: 700, color: C.blue, letterSpacing: 1.2, textTransform: "uppercase" },
  titel: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 20, lineHeight: 1.25, marginTop: 3, marginBottom: 8 },
  band: { flexDirection: "row", gap: 8, marginBottom: 12 },
  vak: { flex: 1, backgroundColor: C.blueSoft, borderRadius: 6, padding: 8 },
  vakL: { fontSize: 7, color: C.blue, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 },
  vakW: { fontSize: 10, fontWeight: 700, marginTop: 2 },
  weken: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  week: { width: "48.8%", borderWidth: 1, borderColor: C.line, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6 },
  weekKop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  weekT: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 9.5, color: C.blue },
  rij: { flexDirection: "row", paddingVertical: 1.5, borderTopWidth: 0.5, borderTopColor: C.line },
  c1: { flex: 1 }, c2: { width: 62 }, c3: { width: 44, color: C.muted }, c4: { width: 30, textAlign: "right", fontWeight: 700 },
  leeg: { color: C.muted, fontSize: 8.5, paddingVertical: 2 },
  p: { color: C.ink2, marginTop: 10 },
  voet: { marginTop: 12, flexDirection: "row", gap: 10 },
  kaart: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 8 },
  kaartT: { fontSize: 7.5, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  stempel: { position: "absolute", top: 40, right: 44, color: C.red, fontSize: 10, fontWeight: 700, borderWidth: 1.5, borderColor: C.red, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  voetT: { position: "absolute", bottom: 22, left: 44, right: 44, fontSize: 7.5, color: C.muted, flexDirection: "row", justifyContent: "space-between" },
});

const datum = (x?: string | null) => (x ? new Date(x).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Brussels" }) : "");

function RoosterPdf({ c, dagen, goedgekeurd }: { c: RoosterContext; dagen: Dagen; goedgekeurd: boolean }) {
  const r = c.rooster;
  const geldend = r?.status === "goedgekeurd" ? r : r?.vorige ? { ...r, ...r.vorige } : r;
  const kal = kalender(c.blok, c.uitzonderingen);
  const totaal = Object.values(dagen).reduce((t, d) => t + werkMin(d), 0);
  const aantal = Object.keys(dagen).length;
  return (
    <Document title={`Werkrooster ${c.leerling.voornaam} ${c.leerling.naam}`} author={SCHOOL.naam} language="nl">
      <Page size="A4" style={s.page}>
        <View style={s.kop}>
          <View style={s.logos}><Image src={LOGO_SNH} style={{ height: 28 }} /><Image src={LOGO_R2S} style={{ height: 28 }} /></View>
          <Text style={s.school}>{`${SCHOOL.naam}\nOnthaal, organisatie en sales\n${SCHOOL.stagemail}`}</Text>
        </View>
        {!goedgekeurd && <Text style={s.stempel}>NOG NIET GOEDGEKEURD</Text>}
        <Text style={s.eyebrow}>{`${c.blok.naam} · schooljaar ${c.blok.schooljaar}`}</Text>
        <Text style={s.titel}>Werkrooster</Text>
        <View style={s.band}>
          <View style={s.vak}><Text style={s.vakL}>Stagiair</Text><Text style={s.vakW}>{`${c.leerling.voornaam} ${c.leerling.naam} (${c.leerling.klas})`}</Text></View>
          <View style={s.vak}><Text style={s.vakL}>Stageplaats</Text><Text style={s.vakW}>{c.stagegever.winkel ?? ""}</Text></View>
          <View style={s.vak}><Text style={s.vakL}>Totaal</Text><Text style={s.vakW}>{`${uren(totaal)} op ${aantal} ${aantal === 1 ? "dag" : "dagen"}`}</Text></View>
        </View>
        <View style={s.weken}>
          {kal.map((w) => {
            const dd = w.dagen.filter((d) => dagen[d.iso]);
            const som = dd.reduce((t, d) => t + werkMin(dagen[d.iso]), 0);
            const zicht = w.dagen.filter((d) => d.soort !== "buiten");
            return (
              <View key={w.maandag} style={s.week} wrap={false}>
                <View style={s.weekKop}>
                  <Text style={s.weekT}>{`Week ${w.nr} · ${zicht[0].dag}/${Number(zicht[0].iso.slice(5, 7))} – ${zicht.at(-1)!.dag}/${Number(zicht.at(-1)!.iso.slice(5, 7))}`}</Text>
                  <Text style={{ fontWeight: 700 }}>{uren(som)}</Text>
                </View>
                {dd.length === 0 ? <Text style={s.leeg}>Geen stage</Text> : dd.map((d) => {
                  const x = dagen[d.iso];
                  return (
                    <View key={d.iso} style={s.rij}>
                      <Text style={s.c1}>{dagLang(d.iso)}</Text>
                      <Text style={s.c2}>{`${tijdKort(x.aan)} – ${tijdKort(x.ver)}`}</Text>
                      <Text style={s.c3}>{x.pau ? `${x.pau}' pauze` : ""}</Text>
                      <Text style={s.c4}>{uren(werkMin(x))}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
        {geldend?.opmerkingen ? <Text style={s.p}>{`Opmerkingen: ${geldend.opmerkingen}`}</Text> : null}
        <View style={s.voet} wrap={false}>
          <View style={s.kaart}>
            <Text style={s.kaartT}>Bevestigd door de stagegever</Text>
            <Text>{geldend?.bevestiging ? `${geldend.bevestiging.naam}, ${datum(geldend.bevestiging.at)}` : "Nog niet bevestigd"}</Text>
          </View>
          <View style={s.kaart}>
            <Text style={s.kaartT}>Goedgekeurd door de school</Text>
            <Text>{goedgekeurd && geldend?.goedgekeurd_op ? `Stagebegeleiding, ${datum(geldend.goedgekeurd_op)}` : "Nog niet goedgekeurd"}</Text>
          </View>
        </View>
        <Text style={s.p}>
          {`Afwezig? Verwittig vóór de start de stagegever en de stagebegeleiding. Gemiste uren worden ingehaald. Een wijziging van het rooster gebeurt via het stageplatform en wordt opnieuw goedgekeurd.`}
        </Text>
        <View style={s.voetT} fixed>
          <Text>{`${SCHOOL.naam} · Retail2Sale · Werkrooster ${c.leerling.voornaam} ${c.leerling.naam}`}</Text>
          <Text>{SCHOOL.stagemail}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Pdf van het geldende (goedgekeurde) rooster; voor de school ook van een rooster dat nog niet is goedgekeurd. */
export async function roosterPdf(c: RoosterContext): Promise<Buffer | null> {
  const r = c.rooster;
  if (!r) return null;
  const goed = r.status === "goedgekeurd" ? r.dagen : r.vorige?.dagen ?? null;
  if (!goed && c.wie !== "school") return null;
  fonts();
  return renderToBuffer(<RoosterPdf c={c} dagen={goed ?? r.dagen} goedgekeurd={!!goed} />);
}

export const roosterPdfNaam = (c: RoosterContext) => `Werkrooster ${c.leerling.voornaam} ${c.leerling.naam}.pdf`.replace(/[\\/:*?"<>|]/g, "");

export async function roosterPdfAntwoord(c: RoosterContext | null) {
  const pdf = c ? await roosterPdf(c) : null;
  if (!c || !pdf) return new Response("Er is (nog) geen goedgekeurd werkrooster.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${roosterPdfNaam(c)}"`, "Cache-Control": "no-store" },
  });
}
