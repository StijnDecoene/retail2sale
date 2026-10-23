import "server-only";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { C, LOGO_R2S, LOGO_SNH, fonts } from "@/lib/bevestiging-pdf";
import {
  ROL_LABEL, SCHOOL_CONTRACT, contractTekst, datumMidden, effectief, nodigeRollen, partij,
  type ContractData, type Deel, type TekstBlok,
} from "@/lib/contract";

const s = StyleSheet.create({
  page: { fontFamily: "Figtree", fontSize: 9.5, color: C.ink, paddingTop: 36, paddingBottom: 54, paddingHorizontal: 48, lineHeight: 1.45 },
  kop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 16 },
  school: { fontSize: 8, color: C.muted, textAlign: "right", lineHeight: 1.4 },
  eyebrow: { fontSize: 8, fontWeight: 700, color: C.blue, letterSpacing: 1.2, textTransform: "uppercase" },
  titel: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 22, lineHeight: 1.25, marginTop: 4, marginBottom: 2 },
  sub: { color: C.muted, fontSize: 10, marginBottom: 10 },
  sectie: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 13, color: C.blue, marginTop: 12, marginBottom: 4 },
  h4: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 10, marginTop: 6, marginBottom: 1 },
  p: { marginBottom: 4 },
  note: { marginBottom: 4, backgroundColor: "#f3f5f8", padding: 6, borderRadius: 4, fontSize: 8.5, color: C.ink2 },
  fill: { color: C.blue, fontWeight: 600 },
  leeg: { color: "#8a5300", backgroundColor: "#fff3c4" },
  tekenen: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  vak: { width: "48%", borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 9 },
  vakT: { fontSize: 7.5, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: 0.6 },
  vakN: { fontWeight: 700, fontSize: 10, marginTop: 2 },
  vakK: { fontSize: 8, color: C.muted },
  sig: { height: 52, objectFit: "contain", marginVertical: 4 },
  sigLeeg: { height: 52, marginVertical: 4, borderBottomWidth: 1, borderBottomColor: C.line },
  voetL: { position: "absolute", bottom: 24, left: 48, fontSize: 7.5, color: C.muted },
  voetR: { position: "absolute", bottom: 24, right: 48, fontSize: 7.5, color: C.muted, textAlign: "right" },
});

function Delen({ d }: { d: Deel[] }) {
  return (
    <>
      {d.map((x, i) =>
        typeof x === "string" ? x
          : "b" in x ? <Text key={i} style={{ fontWeight: 700 }}>{x.b}</Text>
          : x.v ? <Text key={i} style={s.fill}>{x.v}</Text>
          : <Text key={i} style={s.leeg}>{x.leeg ?? "nog in te vullen"}</Text>,
      )}
    </>
  );
}

function Blokken({ blokken }: { blokken: TekstBlok[] }) {
  return (
    <>
      {blokken.map((b, i) =>
        b.t === "ul" ? (
          <View key={i} style={{ marginBottom: 4 }}>
            {b.items.map((it, j) => (
              <View key={j} style={{ flexDirection: "row" }}><Text style={{ width: 10 }}>•</Text><Text style={{ flex: 1 }}><Delen d={it} /></Text></View>
            ))}
          </View>
        ) : (
          <Text key={i} style={b.t === "h4" ? s.h4 : b.t === "note" ? s.note : s.p} minPresenceAhead={b.t === "h4" ? 60 : 0}>
            <Delen d={b.d} />
          </Text>
        ),
      )}
    </>
  );
}

const tijd = (iso: string) =>
  new Date(iso).toLocaleString("nl-BE", { timeZone: "Europe/Brussels", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

function ContractPdf({ d, hash }: { d: ContractData; hash?: string }) {
  const g = effectief(d);
  const naam = `${d.leerling.voornaam} ${d.leerling.naam}`;
  const rollen = nodigeRollen(d.contract.meerderjarig);
  return (
    <Document title={`Stagecontract ${naam}`} author={SCHOOL_CONTRACT.naam} language="nl-BE">
      <Page size="A4" style={s.page}>
        <View style={s.kop} fixed>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={LOGO_SNH} style={{ height: 34 }} />
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={LOGO_R2S} style={{ height: 34 }} />
          </View>
          <Text style={s.school}>{`${SCHOOL_CONTRACT.afdeling}\n${SCHOOL_CONTRACT.adres}\n${SCHOOL_CONTRACT.telefoon} · ${SCHOOL_CONTRACT.stagemail}`}</Text>
        </View>
        <Text style={s.eyebrow}>{`Onthaal, organisatie en sales · schooljaar ${d.blok.schooljaar}`}</Text>
        <Text style={s.titel}>Stagecontract</Text>
        <Text style={s.sub}>{`${naam} (${d.leerling.klas}) · ${g.winkel_naam} · ${d.blok.naam}, ${datumMidden(d.blok.start_datum)} tot en met ${datumMidden(d.blok.eind_datum)}`}</Text>

        {contractTekst(d).map((sec) => (
          <View key={sec.id}>
            <Text style={s.sectie} minPresenceAhead={40}>{sec.titel}</Text>
            <Blokken blokken={sec.blokken} />
          </View>
        ))}

        <View wrap={false}>
          <Text style={s.sectie}>Ondertekening</Text>
          <Text style={s.p}>{`Digitaal ondertekend door ${rollen.length} partijen. Elke partij ontvangt dit document als pdf.`}</Text>
          <View style={s.tekenen}>
            {rollen.map((r) => {
              const p = partij(d, r);
              const sub =
                r === "stagegever" ? `${g.hoedanigheid || "hoedanigheid"} · ${g.winkel_naam}`
                : r === "ouder" ? (p?.extra?.relatie ? `${p.extra.relatie} van ${naam}` : `ouder of voogd van ${naam}`)
                : r === "directie" ? (p?.extra?.namens ? `namens ${SCHOOL_CONTRACT.directeur}, directeur` : `directeur, ${SCHOOL_CONTRACT.naam}`)
                : `stagiair, ${d.leerling.klas}`;
              return (
                <View key={r} style={s.vak}>
                  <Text style={s.vakT}>{ROL_LABEL[r]}</Text>
                  <Text style={s.vakN}>{p?.getekend_naam || (r === "directie" ? SCHOOL_CONTRACT.directeur : r === "stagiair" ? naam : r === "stagegever" ? g.ondertekenaar : "—")}</Text>
                  <Text style={s.vakK}>{sub}</Text>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  {p?.handtekening ? <Image src={p.handtekening} style={s.sig} /> : <View style={s.sigLeeg} />}
                  <Text style={s.vakK}>{p?.getekend_op ? `Opgemaakt te ${p.plaats ?? ""} op ${tijd(p.getekend_op)}` : "Nog niet ondertekend"}</Text>
                </View>
              );
            })}
          </View>
          {hash ? <Text style={[s.vakK, { marginTop: 8 }]}>{`Vingerafdruk van de contracttekst: ${hash.slice(0, 16)}`}</Text> : null}
        </View>

        <Text style={s.voetL} fixed>{`Stagecontract ${naam} · ${d.blok.naam} ${d.blok.schooljaar}`}</Text>
        <Text style={s.voetR} fixed>{`${SCHOOL_CONTRACT.naam} · ${SCHOOL_CONTRACT.stagemail}`}</Text>
      </Page>
    </Document>
  );
}

export async function contractPdf(d: ContractData, hash?: string): Promise<Buffer> {
  fonts();
  return renderToBuffer(<ContractPdf d={d} hash={hash} />);
}
