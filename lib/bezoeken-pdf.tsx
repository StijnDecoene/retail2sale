import "server-only";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { C, LOGO_R2S, LOGO_SNH, fonts } from "@/lib/bevestiging-pdf";
import { SCHOOL } from "@/lib/bevestiging";
import { DEEL, datumTekst, minTekst, naamVan, plaatsAdres, punt, routeStats, urenOpDag, werkt, type BezoekData, type BLln, type Route } from "@/lib/bezoeken";

const s = StyleSheet.create({
  page: { fontFamily: "Figtree", fontSize: 9.5, color: C.ink, paddingTop: 30, paddingBottom: 46, paddingHorizontal: 40, lineHeight: 1.4 },
  kop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 12 },
  logos: { flexDirection: "row", alignItems: "center", gap: 10 },
  titel: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 18, lineHeight: 1.25, marginBottom: 4 },
  sub: { color: C.muted, marginBottom: 10 },
  stop: { flexDirection: "row", gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 8, marginBottom: 6 },
  nr: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  nrT: { color: "#fff", fontWeight: 700, fontSize: 9, lineHeight: 1 },
  naam: { fontWeight: 700, fontSize: 11 },
  klein: { color: C.muted, fontSize: 8.5 },
  vak: { width: 11, height: 11, borderWidth: 1, borderColor: C.muted, borderRadius: 2, marginRight: 4 },
  vinkRij: { flexDirection: "row", gap: 12, marginTop: 4, alignItems: "center" },
  lijn: { borderBottomWidth: 0.5, borderBottomColor: C.line, marginTop: 10 },
  voet: { position: "absolute", bottom: 20, left: 40, right: 40, fontSize: 7.5, color: C.muted, flexDirection: "row", justifyContent: "space-between" },
});

function RoutePdf({ d, r, kleur }: { d: BezoekData; r: Route; kleur: string }) {
  const lln = new Map(d.leerlingen.map((l) => [l.dossier_id, l]));
  const stops = r.volgorde.map((id) => lln.get(id)).filter((l): l is BLln => !!l);
  const st = routeStats(r.volgorde, lln, d.instellingen.vertrek);
  const g = d.begeleiders.find((x) => x.id === r.begeleider_id);
  return (
    <Document title={`Route ${r.nr} ${r.naam}`} author={SCHOOL.naam} language="nl">
      <Page size="A4" style={s.page}>
        <View style={s.kop}>
          <View style={s.logos}><Image src={LOGO_SNH} style={{ height: 24 }} /><Image src={LOGO_R2S} style={{ height: 24 }} /></View>
          <Text style={{ fontSize: 8, color: C.muted }}>{`Stagebezoeken · ${d.blok.naam}`}</Text>
        </View>
        <Text style={s.titel}>{`Route ${r.nr} · ${r.naam}`}</Text>
        <Text style={s.sub}>
          {`${g?.naam ?? "Geen begeleider"} · ${r.datum ? `${datumTekst(r.datum)} (${DEEL[r.dagdeel]})` : "nog geen datum"} · ${stops.length} bezoeken · ± ${Math.round(st.km)} km · reistijd ${minTekst(st.min)} · dagduur ${minTekst(st.dagMin)}–${minTekst(st.dagMax)}`}
        </Text>
        <Text style={[s.klein, { marginBottom: 6 }]}>{`Vertrek en terugkeer: ${d.instellingen.vertrek.label}, ${d.instellingen.vertrek.adres}`}</Text>
        {stops.map((l, i) => {
          const w = r.datum ? werkt(l, r.datum, r.dagdeel) : null;
          return (
            <View key={l.dossier_id} style={s.stop} wrap={false}>
              <View style={[s.nr, { backgroundColor: kleur }]}><Text style={s.nrT}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.naam}>{`${naamVan(l)}  `}<Text style={s.klein}>{l.klas}</Text></Text>
                <Text>{`${l.plaats?.naam ?? ""} · ${plaatsAdres(l) || "geen adres"}${punt(l) ? "" : " (niet op de kaart)"}`}</Text>
                <Text style={s.klein}>
                  {[l.mentor.naam ? `Mentor ${l.mentor.naam}` : "", l.mentor.tel || l.plaats?.telefoon || "", l.gsm ? `stagiair ${l.gsm}` : "",
                    r.datum ? (w === true ? `werkt ${urenOpDag(l, r.datum)}` : w === false ? "werkt niet volgens rooster" : "rooster onbekend") : ""].filter(Boolean).join(" · ")}
                </Text>
                {l.bezoek?.opmerking ? <Text style={[s.klein, { color: C.ink2 }]}>{`Opmerking: ${l.bezoek.opmerking}`}</Text> : null}
                <View style={s.vinkRij}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}><View style={s.vak} /><Text>Bezocht</Text></View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}><View style={s.vak} /><Text>Evaluatie besproken</Text></View>
                  <Text style={s.klein}>Notities: ..................................................................................</Text>
                </View>
              </View>
            </View>
          );
        })}
        <View style={s.voet} fixed>
          <Text>{`${SCHOOL.naam} · Retail2Sale · Route ${r.nr}`}</Text>
          <Text>{SCHOOL.stagemail}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function routePdf(d: BezoekData, r: Route, kleur: string) {
  fonts();
  return renderToBuffer(<RoutePdf d={d} r={r} kleur={kleur} />);
}
