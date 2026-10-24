import "server-only";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { C, LOGO_R2S, LOGO_SNH, fonts } from "@/lib/bevestiging-pdf";
import { SCHOOL_CONTRACT, datumMidden } from "@/lib/contract";
import { uren } from "@/lib/werkrooster";
import type { AttestGegevens } from "@/lib/afronding-server";

const s = StyleSheet.create({
  page: { fontFamily: "Figtree", fontSize: 10.5, color: C.ink, paddingTop: 36, paddingBottom: 56, paddingHorizontal: 56, lineHeight: 1.5 },
  kop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.line },
  eyebrow: { marginTop: 40, fontSize: 8.5, color: C.blue, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase" },
  titel: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 30, lineHeight: 1.2, marginTop: 6, marginBottom: 22 },
  p: { marginBottom: 10, color: C.ink2 },
  naam: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 20, lineHeight: 1.25, color: C.ink, marginBottom: 2 },
  tabel: { marginTop: 14, marginBottom: 18, borderTopWidth: 1, borderTopColor: C.line },
  rij: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.line },
  l: { width: 150, color: C.muted, fontSize: 9.5 },
  w: { flex: 1, fontWeight: 700 },
  wsub: { fontWeight: 400, color: C.muted, fontSize: 9 },
  teken: { flexDirection: "row", gap: 24, marginTop: 26 },
  tvak: { flex: 1, borderTopWidth: 1, borderTopColor: C.ink, paddingTop: 6 },
  tl: { fontSize: 8.5, color: C.muted },
  tn: { fontWeight: 700, fontSize: 10 },
  voet: { position: "absolute", bottom: 26, left: 56, right: 56, fontSize: 7.5, color: C.muted, flexDirection: "row", justifyContent: "space-between" },
});

function Attest({ a }: { a: AttestGegevens }) {
  const naam = `${a.leerling.voornaam} ${a.leerling.naam}`;
  const soort = a.stage === "sales" ? "sales (winkel)" : a.stage === "onthaal" ? "onthaal en organisatie" : "onthaal, organisatie en sales";
  const extra = [a.u.gewettigd ? `${uren(a.u.gewettigd)} gewettigd afwezig` : "", a.u.ingehaald ? `waarvan ${uren(a.u.ingehaald)} ingehaald` : ""].filter(Boolean).join(" · ");
  return (
    <Document title={`Stageattest ${naam}`} author={SCHOOL_CONTRACT.afdeling} language="nl">
      <Page size="A4" style={s.page}>
        <View style={s.kop}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}><Image src={LOGO_SNH} style={{ height: 30 }} /><Image src={LOGO_R2S} style={{ height: 30 }} /></View>
          <Text style={{ fontSize: 8.5, color: C.muted, textAlign: "right" }}>{SCHOOL_CONTRACT.afdeling}{"\n"}{SCHOOL_CONTRACT.adres}</Text>
        </View>

        <Text style={s.eyebrow}>Onthaal, organisatie en sales · schooljaar {a.blok.schooljaar}</Text>
        <Text style={s.titel}>Stageattest</Text>

        <Text style={s.p}>De directie en de stagebegeleiding van {SCHOOL_CONTRACT.afdeling} verklaren dat</Text>
        <Text style={s.naam}>{naam}</Text>
        <Text style={[s.p, { marginBottom: 4 }]}>leerling van klas {a.leerling.klas}, studierichting Onthaal, organisatie en sales,</Text>
        <Text style={s.p}>stage heeft gelopen in het kader van de opleiding, met de volgende gegevens:</Text>

        <View style={s.tabel}>
          <View style={s.rij}><Text style={s.l}>Stageplaats</Text><Text style={s.w}>{a.winkel || "–"}{a.adres ? <Text style={s.wsub}>{"\n"}{a.adres}</Text> : null}</Text></View>
          <View style={s.rij}><Text style={s.l}>Soort stage</Text><Text style={s.w}>{soort}</Text></View>
          <View style={s.rij}><Text style={s.l}>Periode</Text><Text style={s.w}>{a.blok.naam}: {datumMidden(a.blok.start_datum)} tot en met {datumMidden(a.blok.eind_datum)}</Text></View>
          <View style={s.rij}><Text style={s.l}>Gepresteerde uren</Text><Text style={s.w}>{uren(a.u.gepresteerd)} van de {uren(a.u.vereist)} voorziene uren{extra ? <Text style={s.wsub}>{"\n"}{extra}</Text> : null}</Text></View>
          {a.mentor ? <View style={s.rij}><Text style={s.l}>Stagementor</Text><Text style={s.w}>{a.mentor}</Text></View> : null}
        </View>

        <Text style={s.p}>
          Tijdens de stage werkte {a.leerling.voornaam} mee in de dagelijkse werking van de stageplaats en paste de competenties uit de opleiding toe op de werkvloer.
          De evaluatie van de stage werd met {a.leerling.voornaam} besproken.
        </Text>
        <Text style={s.p}>Opgemaakt te {SCHOOL_CONTRACT.gemeente} op {datumMidden(a.datum)}.</Text>

        <View style={s.teken}>
          <View style={s.tvak}><Text style={s.tl}>Voor de directie</Text><Text style={s.tn}>{a.directeur}</Text><Text style={s.tl}>directeur</Text></View>
          <View style={s.tvak}><Text style={s.tl}>Voor de stagebegeleiding</Text><Text style={s.tn}>{a.team.join(" en ") || "De stagebegeleiders"}</Text><Text style={s.tl}>stagebegeleiders Onthaal, organisatie en sales</Text></View>
        </View>

        <View style={s.voet} fixed>
          <Text>{SCHOOL_CONTRACT.afdeling} · {SCHOOL_CONTRACT.stagemail} · {SCHOOL_CONTRACT.telefoon}</Text>
          <Text>Documentcode {a.code}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function attestPdf(a: AttestGegevens) {
  fonts();
  return renderToBuffer(<Attest a={a} />);
}
export const attestPdfNaam = (a: AttestGegevens) => `Stageattest ${a.leerling.voornaam} ${a.leerling.naam}.pdf`.replace(/[\\/:*?"<>|]/g, "");

/** Pdf als download-antwoord. */
export async function attestAntwoord(a: AttestGegevens | null) {
  if (!a) return new Response("Nog geen attest: de stage is nog niet afgerond.", { status: 404 });
  const pdf = await attestPdf(a);
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${encodeURIComponent(attestPdfNaam(a))}"`, "Cache-Control": "private, no-store" },
  });
}
