import "server-only";
import { Document, Image, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { C, LOGO_R2S, LOGO_SNH, fonts } from "@/lib/bevestiging-pdf";
import { CONTACT, HANDLEIDINGEN, pdfNaamHandleiding, stukken, type Wie } from "@/lib/handleidingen";
import { SCHOOL } from "@/lib/bevestiging";

const s = StyleSheet.create({
  page: { fontFamily: "Figtree", fontSize: 10, color: C.ink, paddingTop: 36, paddingBottom: 54, paddingHorizontal: 48, lineHeight: 1.45 },
  kop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 20 },
  logos: { flexDirection: "row", alignItems: "center", gap: 10 },
  school: { fontSize: 8, color: C.muted, textAlign: "right", lineHeight: 1.4 },
  eyebrow: { fontSize: 8, fontWeight: 700, color: C.blue, letterSpacing: 1.2, textTransform: "uppercase" },
  titel: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 22, lineHeight: 1.25, marginTop: 4, marginBottom: 8 },
  intro: { fontSize: 11, color: C.ink2, marginBottom: 14 },
  kort: { backgroundColor: C.blueSoft, borderRadius: 8, padding: 14, marginBottom: 18 },
  kortT: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 12, marginBottom: 6 },
  kortRij: { flexDirection: "row", marginBottom: 3 },
  kortNr: { width: 14, fontWeight: 700, color: C.blue },
  stap: { flexDirection: "row", gap: 10, marginBottom: 14 },
  nr: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.blue, alignItems: "center", justifyContent: "center" },
  nrT: { color: "#fff", fontSize: 10, fontWeight: 700, lineHeight: 1 },
  h2: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 13, lineHeight: 1.3, marginTop: 2, marginBottom: 2 },
  wanneer: { fontSize: 8.5, fontWeight: 700, color: C.blue, marginBottom: 4 },
  p: { color: C.ink2, marginBottom: 5 },
  bol: { flexDirection: "row", color: C.ink2, marginBottom: 2.5, paddingLeft: 2 },
  bolT: { width: 10, color: C.blue },
  tip: { borderLeftWidth: 3, borderLeftColor: C.ok, backgroundColor: C.okSoft, padding: 8, borderRadius: 4, marginTop: 4, color: C.ink2 },
  sectie: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 15, marginTop: 6, marginBottom: 10 },
  vraag: { marginBottom: 9 },
  vraagV: { fontWeight: 700, marginBottom: 2 },
  contact: { borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 14, marginTop: 10 },
  link: { color: C.blue, textDecoration: "none" },
  voetT: { position: "absolute", bottom: 24, left: 48, right: 48, fontSize: 7.5, color: C.muted, flexDirection: "row", justifyContent: "space-between" },
});

function Rijk({ t, site }: { t: string; site: string }) {
  return (
    <>
      {stukken(t).map((x, i) =>
        x.link ? <Link key={i} src={x.link.startsWith("/") ? site + x.link : x.link} style={s.link}>{x.t}</Link>
        : x.vet ? <Text key={i} style={{ fontWeight: 700, color: C.ink }}>{x.t}</Text>
        : <Text key={i}>{x.t}</Text>,
      )}
    </>
  );
}

function HandleidingPdf({ wie, site }: { wie: Wie; site: string }) {
  const h = HANDLEIDINGEN[wie];
  return (
    <Document title={pdfNaamHandleiding(wie).replace(/\.pdf$/, "")} author={SCHOOL.naam} language="nl">
      <Page size="A4" style={s.page}>
        <View style={s.kop}>
          <View style={s.logos}><Image src={LOGO_SNH} style={{ height: 30 }} /><Image src={LOGO_R2S} style={{ height: 30 }} /></View>
          <Text style={s.school}>{`${SCHOOL.naam}\nOnthaal, organisatie en sales\n${SCHOOL.stagemail}`}</Text>
        </View>
        <Text style={s.eyebrow}>{`Handleiding · ${h.voor}`}</Text>
        <Text style={s.titel}>{h.titel}</Text>
        <Text style={s.intro}>{h.intro}</Text>

        <View style={s.kort} wrap={false}>
          <Text style={s.kortT}>In het kort</Text>
          {h.kort.map((k, i) => (
            <View key={i} style={s.kortRij}><Text style={s.kortNr}>{i + 1}.</Text><Text style={{ flex: 1, color: C.ink2 }}><Rijk t={k} site={site} /></Text></View>
          ))}
        </View>

        {h.stappen.map((st, i) => (
          <View key={st.titel} style={s.stap} wrap={false}>
            <View style={s.nr}><Text style={s.nrT}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.h2}>{st.titel}</Text>
              {st.wanneer ? <Text style={s.wanneer}>{st.wanneer}</Text> : null}
              {st.tekst.map((p, j) => <Text key={j} style={s.p}><Rijk t={p} site={site} /></Text>)}
              {(st.punten ?? []).map((p, j) => (
                <View key={j} style={s.bol}><Text style={s.bolT}>•</Text><Text style={{ flex: 1 }}><Rijk t={p} site={site} /></Text></View>
              ))}
              {st.tip ? <Text style={s.tip}><Text style={{ fontWeight: 700, color: C.ok }}>Tip  </Text><Rijk t={st.tip} site={site} /></Text> : null}
            </View>
          </View>
        ))}

        <Text style={s.sectie} minPresenceAhead={60}>Vaak gestelde vragen</Text>
        {h.vragen.map((q) => (
          <View key={q.v} style={s.vraag} wrap={false}>
            <Text style={s.vraagV}>{q.v}</Text>
            <Text style={{ color: C.ink2 }}><Rijk t={q.a} site={site} /></Text>
          </View>
        ))}

        <View style={s.contact} wrap={false}>
          <Text style={[s.h2, { marginBottom: 4 }]}>Vragen? Neem contact op</Text>
          <Text style={{ color: C.ink2 }}><Rijk t={CONTACT} site={site} /></Text>
          <Text style={{ color: C.muted, fontSize: 8.5, marginTop: 6 }}>{`Altijd de meest recente versie: ${site}/handleiding/${wie}`}</Text>
        </View>

        <View style={s.voetT} fixed>
          <Text>{`${SCHOOL.naam} · Retail2Sale · ${h.voor === "Stagegever" ? "Handleiding voor stagegevers" : "Handleiding voor stagiairs"}`}</Text>
          <Text>{SCHOOL.stagemail}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function handleidingPdf(wie: Wie, site: string): Promise<Buffer> {
  fonts();
  return renderToBuffer(<HandleidingPdf wie={wie} site={site} />);
}

export async function handleidingAntwoord(wie: Wie) {
  const { siteAdres } = await import("@/lib/bevestiging-versturen");
  const pdf = await handleidingPdf(wie, await siteAdres());
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdfNaamHandleiding(wie)}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
