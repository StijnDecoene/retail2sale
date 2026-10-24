import "server-only";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { C, LOGO_R2S, LOGO_SNH, fonts } from "@/lib/bevestiging-pdf";
import { SCHOOL } from "@/lib/bevestiging";
import { antwoordTekst, formulier, type Soort } from "@/lib/evaluaties";
import type { EvalContext } from "@/lib/evaluaties-server";

const s = StyleSheet.create({
  page: { fontFamily: "Figtree", fontSize: 9, color: C.ink, paddingTop: 30, paddingBottom: 46, paddingHorizontal: 40, lineHeight: 1.35 },
  kop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 12 },
  titel: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 18, lineHeight: 1.25, marginBottom: 4 },
  sub: { color: C.muted, marginBottom: 10 },
  band: { flexDirection: "row", gap: 8, marginBottom: 12 },
  vak: { flex: 1, backgroundColor: C.blueSoft, borderRadius: 6, padding: 8 },
  vakL: { fontSize: 7, color: C.blue, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 },
  vakW: { fontSize: 10.5, fontWeight: 700, marginTop: 2 },
  h2: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 13, lineHeight: 1.3, marginTop: 8, marginBottom: 4, color: C.blue },
  deel: { fontWeight: 700, fontSize: 10, marginTop: 6, marginBottom: 2 },
  rij: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 2.5 },
  l: { flex: 1, paddingRight: 8 },
  w: { width: 120, fontWeight: 700 },
  lang: { paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: C.line },
  voet: { position: "absolute", bottom: 20, left: 40, right: 40, fontSize: 7.5, color: C.muted, flexDirection: "row", justifyContent: "space-between" },
});
const KLEUR: Record<string, string> = { Onvoldoende: C.red, Voldoende: "#8a5300", Goed: C.ok, "Zeer goed": C.ok };
const TITEL: Record<Soort, string> = { mentor: "Evaluatie door de stagementor", school: "Evaluatie stagebezoek door de stagebegeleiding", zelf: "Zelfevaluatie" };

function Blok({ c, soort }: { c: EvalContext; soort: Soort }) {
  const e = c.evaluaties.find((x) => x.soort === soort && x.status === "ingediend");
  if (!e) return null;
  const f = formulier(soort, c.stage);
  return (
    <View break={soort !== "mentor"}>
      <Text style={s.h2}>{TITEL[soort]}{e.naam ? ` · ${e.naam}` : ""}</Text>
      {f.delen.map((d, i) => (
        <View key={i}>
          <Text style={s.deel}>{d.titel}</Text>
          {d.vragen.map((v) => {
            const t = antwoordTekst(v, e.antwoorden[v.id]);
            if (v.t === "tekst") return <View key={v.id} style={s.lang} wrap={false}><Text style={{ color: C.muted }}>{v.label}</Text><Text>{t}</Text></View>;
            return <View key={v.id} style={s.rij} wrap={false}><Text style={s.l}>{v.label}</Text><Text style={[s.w, { color: KLEUR[t] ?? C.ink }]}>{t}</Text></View>;
          })}
        </View>
      ))}
    </View>
  );
}

function EvaluatiePdf({ c, soorten }: { c: EvalContext; soorten: Soort[] }) {
  return (
    <Document title={`Evaluatie ${c.leerling.voornaam} ${c.leerling.naam}`} author={SCHOOL.naam} language="nl">
      <Page size="A4" style={s.page}>
        <View style={s.kop}>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}><Image src={LOGO_SNH} style={{ height: 24 }} /><Image src={LOGO_R2S} style={{ height: 24 }} /></View>
          <Text style={{ fontSize: 8, color: C.muted }}>{`${SCHOOL.naam} · Onthaal, organisatie en sales`}</Text>
        </View>
        <Text style={s.titel}>Evaluatie stage</Text>
        <View style={s.band}>
          <View style={s.vak}><Text style={s.vakL}>Stagiair</Text><Text style={s.vakW}>{`${c.leerling.voornaam} ${c.leerling.naam} (${c.leerling.klas})`}</Text></View>
          <View style={s.vak}><Text style={s.vakL}>Stageplaats</Text><Text style={s.vakW}>{c.winkel ?? ""}</Text></View>
          <View style={s.vak}><Text style={s.vakL}>{c.blok.naam}</Text><Text style={s.vakW}>{`${c.blok.start_datum.split("-").reverse().join("/")} – ${c.blok.eind_datum.split("-").reverse().join("/")}`}</Text></View>
          {c.eindpunt !== null && <View style={s.vak}><Text style={s.vakL}>Eindpunt</Text><Text style={s.vakW}>{`${c.eindpunt} / ${c.punten?.op ?? 20}`}</Text></View>}
        </View>
        {c.opmerking ? <Text style={[s.sub, { color: C.ink2 }]}>{c.opmerking}</Text> : null}
        {soorten.map((x) => <Blok key={x} c={c} soort={x} />)}
        <View style={s.voet} fixed>
          <Text>{`${SCHOOL.naam} · Retail2Sale · Evaluatie ${c.leerling.voornaam} ${c.leerling.naam}`}</Text>
          <Text>{SCHOOL.stagemail}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function evaluatiePdf(c: EvalContext, soorten: Soort[] = ["mentor", "school"]) {
  fonts();
  return renderToBuffer(<EvaluatiePdf c={c} soorten={soorten} />);
}
export const evaluatiePdfNaam = (c: EvalContext) => `Evaluatie stage ${c.leerling.voornaam} ${c.leerling.naam}.pdf`.replace(/[\\/:*?"<>|]/g, "");
