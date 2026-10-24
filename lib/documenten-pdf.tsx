import "server-only";
import type { ReactNode } from "react";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { C, LOGO_R2S, LOGO_SNH, fonts } from "@/lib/bevestiging-pdf";
import { SCHOOL_CONTRACT, datumMidden } from "@/lib/contract";
import { NIVEAUS, type Formulier } from "@/lib/evaluaties";
import { ACT_SOORT_LABEL, type ActSoort, type Activiteit } from "@/lib/activiteiten";

// Pdf's voor de documentenpagina: blanco formulieren, activiteitenlijst en kalender.

const s = StyleSheet.create({
  page: { fontFamily: "Figtree", fontSize: 9.5, color: C.ink, paddingTop: 30, paddingBottom: 48, paddingHorizontal: 40, lineHeight: 1.4 },
  kop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 14 },
  eyebrow: { fontSize: 8, color: C.blue, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" },
  titel: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 20, lineHeight: 1.25, marginTop: 4, marginBottom: 6 },
  intro: { color: C.ink2, marginBottom: 10 },
  h2: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 12.5, lineHeight: 1.3, color: C.blue, marginTop: 12, marginBottom: 5 },
  h3: { fontWeight: 700, fontSize: 10, marginTop: 8, marginBottom: 3 },
  rij: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 4, alignItems: "flex-start" },
  vak: { width: 9, height: 9, borderWidth: 0.8, borderColor: C.ink2, borderRadius: 1.5, marginRight: 4 },
  klein: { fontSize: 7.5, color: C.muted, lineHeight: 1.35 },
  lijn: { borderBottomWidth: 0.5, borderBottomColor: C.muted, height: 16 },
  voet: { position: "absolute", bottom: 20, left: 40, right: 40, fontSize: 7.5, color: C.muted, flexDirection: "row", justifyContent: "space-between" },
  pil: { fontSize: 7, color: "#8a5300", backgroundColor: "#fff4e0", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
});

function Blad({ titel, eyebrow, intro, children, voet }: { titel: string; eyebrow: string; intro?: string; children: ReactNode; voet: string }) {
  return (
    <Document title={titel} author={SCHOOL_CONTRACT.afdeling} language="nl-BE">
      <Page size="A4" style={s.page}>
        <View style={s.kop} fixed>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={LOGO_SNH} style={{ height: 26 }} />
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={LOGO_R2S} style={{ height: 26 }} />
          </View>
          <Text style={{ fontSize: 8, color: C.muted, textAlign: "right" }}>{`${SCHOOL_CONTRACT.afdeling}\n${SCHOOL_CONTRACT.stagemail}`}</Text>
        </View>
        <Text style={s.eyebrow}>{eyebrow}</Text>
        <Text style={s.titel}>{titel}</Text>
        {intro ? <Text style={s.intro}>{intro}</Text> : null}
        {children}
        <View style={s.voet} fixed>
          <Text>{voet}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Blanco evaluatieformulier (ter inzage of om op papier in te vullen)
// ---------------------------------------------------------------------------
function FormulierPdf({ f }: { f: Formulier }) {
  const keuzes = ["O", "V", "G", "ZG", "n.v.t."];
  return (
    <Blad titel={f.titel} eyebrow={`Onthaal, organisatie en sales · in te vullen door: ${f.voor.toLowerCase()}`} voet={`${f.titel} · ingevuld via het stageplatform Retail2Sale`}
      intro={`${f.intro.replace("Klik op een niveau om de omschrijving te zien. ", "").replace(" Je kan tussendoor bewaren.", "")} Dit formulier wordt online ingevuld op het stageplatform; deze pdf dient ter inzage.`}>
      <View style={{ fontSize: 8.5, marginBottom: 6 }}>
        <Text>Naam stagiair: ......................................................   Klas: ...........   Stageplaats: ......................................................</Text>
      </View>
      {f.schaal && (
        <View style={{ backgroundColor: C.blueSoft, borderRadius: 5, padding: 8, marginBottom: 4 }}>
          {f.schaal.map((x) => <Text key={x} style={{ fontSize: 8, marginBottom: 1.5 }}><Text style={{ fontWeight: 700 }}>{x.split(":")[0]}</Text>:{x.split(":").slice(1).join(":")}</Text>)}
        </View>
      )}
      {f.delen.map((d, i) => (
        <View key={d.titel}>
          <Text style={s.h2} minPresenceAhead={50}>{`${i + 1}. ${d.titel}`}</Text>
          {d.uitleg ? <Text style={s.klein}>{d.uitleg}</Text> : null}
          {d.vragen.map((v) => {
            if (v.t === "rubric") {
              return (
                <View key={v.id} style={s.rij} wrap={false}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontWeight: 700 }}>{v.label}</Text>
                    {v.niveaus && (
                      <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
                        {NIVEAUS.map((n) => v.niveaus?.[n.k] ? <Text key={n.k} style={[s.klein, { flex: 1 }]}><Text style={{ fontWeight: 700 }}>{n.l}: </Text>{v.niveaus[n.k]}</Text> : null)}
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", width: 150, justifyContent: "space-between", paddingTop: 1 }}>
                    {keuzes.filter((k) => k !== "n.v.t." || v.nvt).map((k) => (
                      <View key={k} style={{ flexDirection: "row", alignItems: "center" }}><View style={s.vak} /><Text style={{ fontSize: 7.5 }}>{k}</Text></View>
                    ))}
                  </View>
                </View>
              );
            }
            if (v.t === "tekst") {
              return (
                <View key={v.id} style={{ marginTop: 6 }} wrap={false}>
                  <Text style={{ fontWeight: 700 }}>{v.label}{v.optioneel ? " (optioneel)" : ""}</Text>
                  {Array.from({ length: v.lang ? 3 : 1 }, (_, j) => <View key={j} style={s.lijn} />)}
                </View>
              );
            }
            if (v.t === "datum") return <View key={v.id} style={{ marginTop: 6 }}><Text><Text style={{ fontWeight: 700 }}>{v.label}</Text>: ...... / ...... / ............</Text></View>;
            const opties = v.t === "schaal" ? Array.from({ length: v.max }, (_, j) => String(j + 1)) : v.opties;
            return (
              <View key={v.id} style={{ marginTop: 6 }} wrap={false}>
                <Text style={{ fontWeight: 700 }}>{v.label}{v.t === "schaal" ? (v.max === 5 ? " (1 = zwak, 5 = sterk)" : " (op 10)") : ""}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 3 }}>
                  {opties.map((o) => <View key={o} style={{ flexDirection: "row", alignItems: "center" }}><View style={s.vak} /><Text style={{ fontSize: 8.5 }}>{o}</Text></View>)}
                </View>
              </View>
            );
          })}
        </View>
      ))}
      <Text style={[s.klein, { marginTop: 14 }]}>O = onvoldoende · V = voldoende · G = goed · ZG = zeer goed · n.v.t. = niet van toepassing (kwam niet of te weinig aan bod).</Text>
    </Blad>
  );
}

// ---------------------------------------------------------------------------
// Activiteitenlijst (schooleigen voorstel)
// ---------------------------------------------------------------------------
function ActiviteitenPdf({ cat }: { cat: Activiteit[] }) {
  const soorten: ActSoort[] = ["algemeen", "sales", "onthaal"];
  return (
    <Blad titel="Activiteitenlijst" eyebrow="Onthaal, organisatie en sales · voorstel van de school" voet="Activiteitenlijst · bijlage bij de stageovereenkomst"
      intro="De activiteitenlijst is een verplicht onderdeel van de stageovereenkomst: ze vermeldt wat de stagiair tijdens de stage effectief doet. Dit is het voorstel van de school. Bij het contract stelt de stagegever de lijst voor zijn stagiair samen: aanvinken wat van toepassing is, eigen activiteiten toevoegen en aanduiden wat enkel onder rechtstreeks toezicht mag. Tussen haakjes: de leerplandoelen (LPD).">
      {soorten.map((so) => {
        const lijst = cat.filter((a) => a.soort === so && a.actief).sort((a, b) => a.volgorde - b.volgorde);
        if (!lijst.length) return null;
        const groepen = [...new Set(lijst.map((a) => a.groep))];
        return (
          <View key={so}>
            <Text style={s.h2} minPresenceAhead={40}>{ACT_SOORT_LABEL[so]}</Text>
            {groepen.map((g) => (
              <View key={g} wrap={false}>
                <Text style={s.h3}>{g}</Text>
                {lijst.filter((a) => a.groep === g).map((a) => (
                  <View key={a.id} style={[s.rij, { paddingVertical: 3 }]}>
                    <View style={s.vak} />
                    <Text style={{ flex: 1 }}>{a.tekst}{a.lpd ? <Text style={{ color: C.muted }}>{` (LPD ${a.lpd})`}</Text> : null}</Text>
                    {a.toezicht ? <Text style={s.pil}>onder rechtstreeks toezicht</Text> : null}
                  </View>
                ))}
              </View>
            ))}
          </View>
        );
      })}
    </Blad>
  );
}

// ---------------------------------------------------------------------------
// Kalender van het schooljaar
// ---------------------------------------------------------------------------
export type Kalender = {
  blokken: { id: string; naam: string; start_datum: string; eind_datum: string; uren: number; uren_per_week: number }[];
  uitzonderingen: { blok_id: string; van: string; tot: string; naam: string; soort: string }[];
};
const SOORT: Record<string, string> = { vakantie: "vakantie: geen stage, tenzij in overleg", vm: "geen stage in de voormiddag", geen: "geen stage" };

function KalenderPdf({ k, schooljaar }: { k: Kalender; schooljaar: string }) {
  return (
    <Blad titel={`Stagekalender ${schooljaar}`} eyebrow="Onthaal, organisatie en sales" voet={`Stagekalender ${schooljaar}`}
      intro="De periodes van de blokstages, met het aantal uren en de dagen waarop er geen of beperkt stage is. De stage loopt op dinsdag tot en met zaterdag; op maandag is de stagiair op school. Gemiste uren worden ingehaald op woensdagnamiddag, zaterdag of in de vakantie, tot 14 dagen na de stage.">
      {k.blokken.length === 0 && <Text>De data van de blokstages zijn nog niet bekend.</Text>}
      {k.blokken.map((b) => {
        const u = k.uitzonderingen.filter((x) => x.blok_id === b.id);
        return (
          <View key={b.id} wrap={false} style={{ marginBottom: 6 }}>
            <Text style={s.h2}>{b.naam}</Text>
            <Text style={{ fontWeight: 700, fontSize: 11 }}>{`${datumMidden(b.start_datum)} tot en met ${datumMidden(b.eind_datum)}`}</Text>
            <Text style={{ color: C.ink2, marginBottom: 4 }}>{`${b.uren} uur, gemiddeld ${b.uren_per_week} uur per week · inhaalstage tot 14 dagen na het einde`}</Text>
            {u.length > 0 ? u.map((x) => (
              <View key={`${x.van}${x.naam}`} style={s.rij}>
                <Text style={{ width: 170, fontWeight: 700 }}>{x.van === x.tot ? datumMidden(x.van) : `${datumMidden(x.van)} – ${datumMidden(x.tot)}`}</Text>
                <Text style={{ width: 140 }}>{x.naam}</Text>
                <Text style={{ flex: 1, color: C.muted }}>{SOORT[x.soort] ?? x.soort}</Text>
              </View>
            )) : <Text style={s.klein}>Geen vakantie- of feestdagen in deze periode.</Text>}
          </View>
        );
      })}
    </Blad>
  );
}

const pdfAntwoord = (buf: Buffer, naam: string) =>
  new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${encodeURIComponent(naam)}"`, "Cache-Control": "public, max-age=300" } });

export async function formulierAntwoord(f: Formulier, naam: string) {
  fonts();
  return pdfAntwoord(await renderToBuffer(<FormulierPdf f={f} />), naam);
}
export async function activiteitenAntwoord(cat: Activiteit[]) {
  fonts();
  return pdfAntwoord(await renderToBuffer(<ActiviteitenPdf cat={cat} />), "Activiteitenlijst.pdf");
}
export async function kalenderAntwoord(k: Kalender, schooljaar: string) {
  fonts();
  return pdfAntwoord(await renderToBuffer(<KalenderPdf k={k} schooljaar={schooljaar} />), `Stagekalender ${schooljaar}.pdf`);
}
export { pdfAntwoord };
