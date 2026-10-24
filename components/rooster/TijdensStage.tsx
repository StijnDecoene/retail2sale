"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  afwezigheidMelden, afwezigheidVerwijderen, afwezigheidWettigen, inhaalAnnuleren, inhaalBevestigen, inhaalKoppelen, inhaalPlannen, type TijdensResultaat,
} from "@/app/rooster/tijdens-acties";
import { REDENEN, afwLabel, gemistUitRooster, inhaalControle, stand, type Inhaal, type TijdensData } from "@/lib/tijdens";
import { dagKort, dagLang, geldendRooster, naarMin, tijdKort, uren, type RoosterContext } from "@/lib/werkrooster";
import type { Sleutel } from "@/lib/werkrooster-server";

const PAUZES = [0, 15, 30, 45, 60, 75, 90, 120];
const datumNl = (iso: string) => iso.split("-").reverse().join("/");

function Melding({ r }: { r: TijdensResultaat }) {
  if (!r) return null;
  if (r.ok) return <span className="bh-ok" role="status">{r.ok}</span>;
  if (r.vraag) return <span className="bh-fout" role="alert">{r.vraag}</span>;
  return <span className="bh-fout" role="alert">{r.fout}</span>;
}

/** Tijdens de stage: afwezigheden melden, inhaalstage plannen en (stagegever) bevestigen. */
export default function TijdensStage({
  ctx, t, sleutel, vandaag, naamStart,
}: { ctx: RoosterContext; t: TijdensData; sleutel: Sleutel; vandaag: string; naamStart: string }) {
  const router = useRouter();
  const [bezig, start] = useTransition();
  const [res, setRes] = useState<{ waar: string; r: TijdensResultaat } | null>(null);
  const [open, setOpen] = useState<"afw" | "inhaal" | null>(null);
  const st = useMemo(() => stand(t, ctx.blok, vandaag), [t, ctx.blok, vandaag]);
  const rooster = geldendRooster(ctx.rooster);
  const isGever = t.wie !== "stagiair";

  const doe = (waar: string, f: () => Promise<TijdensResultaat>, na?: () => void) =>
    start(async () => {
      const r = await f();
      setRes({ waar, r });
      if (r?.ok) { na?.(); router.refresh(); }
    });
  const melding = (waar: string) => (res?.waar === waar ? <Melding r={res.r} /> : null);

  return (
    <div className="ts">
      <div className="ts-tegels">
        <div><small>In te halen</small><b>{uren(st.nodig)}</b></div>
        <div><small>Ingehaald</small><b className="ok">{uren(st.ingehaald)}</b></div>
        <div><small>Gepland</small><b>{uren(st.gepland)}</b></div>
        <div className={st.open ? "hot" : ""}><small>Nog in te plannen</small><b>{uren(st.open)}</b></div>
      </div>
      <p className="pt-hint">Gemiste uren worden ingehaald op woensdagnamiddag, op zaterdag, in de vakantie of na de blokstage, uiterlijk tot <b>{datumNl(st.termijn)}</b>. Een afwezigheid die de school als gewettigd aanduidt, moet niet worden ingehaald.</p>
      {st.verstreken && <p className="bh-melding">De termijn om in te halen is verstreken en er staat nog {uren(st.rest)} open. Neem contact op met de stagebegeleiding.</p>}
      {st.nietGekoppeld.length > 0 && <p className="bh-melding">Let op: {st.nietGekoppeld.length === 1 ? "een inhaalstage is" : `${st.nietGekoppeld.length} inhaalstages zijn`} niet gekoppeld aan een afwezigheid. Koppel ze hieronder, anders tellen de uren niet mee.</p>}
      {st.nietNodig.length > 0 && <p className="bh-melding">{st.nietNodig.map((i) => dagKort(i.datum)).join(", ")}: deze inhaalstage is niet meer nodig, want de afwezigheid is gewettigd. Je kan ze annuleren.</p>}
      {isGever && st.teBevestigen.length > 0 && <p className="bh-melding">Bevestig na afloop dat de inhaalstage is doorgegaan: {st.teBevestigen.map((i) => dagKort(i.datum)).join(", ")}.</p>}

      {/* Afwezigheden */}
      <section className="bh-card">
        <div className="hd">
          <h2>Afwezigheden</h2>
          {open !== "afw" && <button type="button" className="bh-btn pri" onClick={() => { setOpen("afw"); setRes(null); }}>Afwezigheid melden</button>}
        </div>
        {open === "afw" && (
          <AfwForm ctx={ctx} rooster={rooster} naamStart={naamStart} bezig={bezig} wie={t.wie} melding={melding("afw")}
            annuleer={() => setOpen(null)}
            bewaar={(x) => doe("afw", () => afwezigheidMelden(sleutel, x), () => setOpen(null))} />
        )}
        {t.afwezigheden.length === 0 ? <p className="bh-leeg">Nog geen afwezigheden gemeld.</p> : (
          <ul className="ts-lijst">
            {t.afwezigheden.map((a) => {
              const s = st.per.get(a.id)!;
              const kanWeg = a.gewettigd === null && !t.inhaal.some((i) => i.status === "ingehaald" && i.afw.includes(a.id));
              return (
                <li key={a.id}>
                  <div className="ts-r1">
                    <b>{dagLang(a.datum)}</b>
                    <span>{a.soort === "hele" ? "hele dag" : `te laat of vroeger weg${a.aan || a.ver ? ` (aanwezig ${a.aan ? tijdKort(a.aan) : "…"}–${a.ver ? tijdKort(a.ver) : "…"})` : ""}`}</span>
                    <b className="ts-uren">{uren(a.gemist_min)} gemist</b>
                  </div>
                  <div className="ts-r2">
                    <span>{a.reden}{a.opm ? ` · ${a.opm}` : ""}</span>
                    <span className="mut">gemeld door {a.naam || a.door} ({a.door})</span>
                  </div>
                  <div className="ts-r3">
                    <span className={`pill ${a.gewettigd === null ? "mut" : a.gewettigd ? "ok" : "warn"}`}>{a.gewettigd === null ? "Wordt beoordeeld" : a.gewettigd ? "Gewettigd" : "Niet gewettigd"}</span>
                    <span className={`pill ${s.open ? "warn" : "ok"}`}>{afwLabel(s)}</span>
                    {t.wie === "school" && (
                      <select className="ts-wettig" aria-label="Gewettigd?" disabled={bezig} value={a.gewettigd === null ? "" : a.gewettigd ? "ja" : "nee"}
                        onChange={(e) => doe(`afw-${a.id}`, () => afwezigheidWettigen(a.dossier_id, a.id, e.target.value as "ja" | "nee" | ""))}>
                        <option value="">Nog te beoordelen</option><option value="ja">Gewettigd</option><option value="nee">Niet gewettigd</option>
                      </select>
                    )}
                    {kanWeg && <Twee label="Verwijderen" bevestig="Ja, verwijderen" bezig={bezig} doe={() => doe(`afw-${a.id}`, () => afwezigheidVerwijderen(sleutel, a.id))} />}
                    {melding(`afw-${a.id}`)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Inhaalstage */}
      <section className="bh-card">
        <div className="hd">
          <h2>Inhaalstage</h2>
          {open !== "inhaal" && <button type="button" className="bh-btn pri" onClick={() => { setOpen("inhaal"); setRes(null); }}>Inhaalstage plannen</button>}
        </div>
        {open === "inhaal" && (
          <InhaalForm ctx={ctx} t={t} st={st} rooster={rooster} naamStart={naamStart} bezig={bezig} melding={melding("inhaal")} vraag={res?.waar === "inhaal" && !!res.r?.vraag}
            annuleer={() => setOpen(null)}
            bewaar={(x) => doe("inhaal", () => inhaalPlannen(sleutel, x), () => setOpen(null))} />
        )}
        {t.inhaal.length === 0 ? <p className="bh-leeg">Nog geen inhaalstage gepland.</p> : (
          <ul className="ts-lijst">
            {t.inhaal.map((i) => (
              <InhaalRij key={i.id} i={i} t={t} st={st} vandaag={vandaag} isGever={isGever} naamStart={naamStart} bezig={bezig} melding={melding(`i-${i.id}`)}
                bevestig={(x) => doe(`i-${i.id}`, () => inhaalBevestigen(sleutel, i.id, x))}
                annuleer={(n) => doe(`i-${i.id}`, () => inhaalAnnuleren(sleutel, i.id, n))}
                koppel={(afw) => doe(`i-${i.id}`, () => inhaalKoppelen(sleutel, i.id, afw))} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Twee({ label, bevestig, bezig, doe }: { label: string; bevestig: string; bezig: boolean; doe: () => void }) {
  const [z, setZ] = useState(false);
  return z ? (
    <span className="ts-twee"><button type="button" className="bh-btn sm" disabled={bezig} onClick={doe}>{bevestig}</button><button type="button" className="ct-link" onClick={() => setZ(false)}>Toch niet</button></span>
  ) : <button type="button" className="ct-link" onClick={() => setZ(true)}>{label}</button>;
}

function UrenKeuze({ min, zet }: { min: number; zet: (m: number) => void }) {
  const u = Math.floor(min / 60), m = min % 60;
  return (
    <span className="ts-urenkeuze">
      <select value={u} onChange={(e) => zet(Number(e.target.value) * 60 + m)} aria-label="Uren">{Array.from({ length: 13 }, (_, x) => <option key={x} value={x}>{x} u</option>)}</select>
      <select value={m - (m % 15)} onChange={(e) => zet(u * 60 + Number(e.target.value))} aria-label="Minuten">{[0, 15, 30, 45].map((x) => <option key={x} value={x}>{x} min</option>)}</select>
    </span>
  );
}

function AfwForm({ ctx, rooster, naamStart, bezig, wie, melding, annuleer, bewaar }: {
  ctx: RoosterContext; rooster: ReturnType<typeof geldendRooster>; naamStart: string; bezig: boolean; wie: string; melding: ReactNode;
  annuleer: () => void; bewaar: (x: Parameters<typeof afwezigheidMelden>[1]) => void;
}) {
  const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
  const startDatum = vandaag < ctx.blok.start_datum ? ctx.blok.start_datum : vandaag > ctx.blok.eind_datum ? ctx.blok.eind_datum : vandaag;
  const [datum, setDatum] = useState(startDatum);
  const [soort, setSoort] = useState<"hele" | "deel">("hele");
  const [aan, setAan] = useState("");
  const [ver, setVer] = useState("");
  const [reden, setReden] = useState("");
  const [opm, setOpm] = useState("");
  const [naam, setNaam] = useState(naamStart);
  const [eigen, setEigen] = useState<number | null>(null);
  const dag = rooster?.[datum];
  const berekend = gemistUitRooster(dag, soort, aan, ver);
  const gemist = eigen ?? berekend ?? 0;
  return (
    <div className="bd ts-form">
      <div className="ts-rij">
        <label className="f"><span>Datum</span><input type="date" value={datum} min={ctx.blok.start_datum} max={ctx.blok.eind_datum} onChange={(e) => { setDatum(e.target.value); setEigen(null); }} /></label>
        <div className="f"><span>Afwezig</span>
          <div className="bh-seg" role="radiogroup">
            <button type="button" className={soort === "hele" ? "on" : ""} onClick={() => { setSoort("hele"); setEigen(null); }}>Hele dag</button>
            <button type="button" className={soort === "deel" ? "on" : ""} onClick={() => { setSoort("deel"); setEigen(null); }}>Te laat of vroeger weg</button>
          </div>
        </div>
      </div>
      <p className="pt-hint">{dag ? `Volgens het werkrooster: ${tijdKort(dag.aan)}–${tijdKort(dag.ver)} (${uren(gemistUitRooster(dag, "hele") ?? 0)}).` : rooster ? "Op deze dag staat geen stage in het werkrooster. Vul de gemiste uren zelf in." : "Er is nog geen goedgekeurd werkrooster. Vul de gemiste uren zelf in."}</p>
      {soort === "deel" && (
        <div className="ts-rij">
          <label className="f"><span>Aangekomen om</span><input type="time" step={900} value={aan} onChange={(e) => { setAan(e.target.value); setEigen(null); }} /></label>
          <label className="f"><span>Vertrokken om</span><input type="time" step={900} value={ver} onChange={(e) => { setVer(e.target.value); setEigen(null); }} /></label>
        </div>
      )}
      <div className="ts-rij">
        <div className="f"><span>Gemiste uren</span><UrenKeuze min={gemist} zet={setEigen} />
          {eigen !== null && berekend !== null && eigen !== berekend && <button type="button" className="ct-link" onClick={() => setEigen(null)}>Terug naar {uren(berekend)} uit het rooster</button>}
        </div>
        <label className="f"><span>Reden</span>
          <select value={reden} onChange={(e) => setReden(e.target.value)}><option value="">Kies…</option>{REDENEN.map((r) => <option key={r}>{r}</option>)}</select>
        </label>
      </div>
      <label className="f"><span>Toelichting (optioneel)</span><input value={opm} onChange={(e) => setOpm(e.target.value)} placeholder="Bijvoorbeeld: doktersattest volgt" /></label>
      <label className="f"><span>{wie === "stagiair" ? "Je naam" : "Uw naam"}</span><input value={naam} onChange={(e) => setNaam(e.target.value)} autoComplete="name" /></label>
      {wie === "stagiair" && <p className="pt-hint">Deze melding vervangt het telefoontje niet: verwittig vóór de start ook de winkel, beide stagebegeleiders en het secretariaat. Bezorg een doktersattest aan het secretariaat.</p>}
      <div className="bh-form-voet">
        <button type="button" className="bh-btn pri" disabled={bezig} onClick={() => bewaar({ datum, soort, aan, ver, gemist_min: gemist, reden, opm, naam })}>{bezig ? "Bezig…" : "Afwezigheid melden"}</button>
        <button type="button" className="bh-btn" onClick={annuleer}>Annuleren</button>
        {melding}
      </div>
    </div>
  );
}

function InhaalForm({ ctx, t, st, rooster, naamStart, bezig, melding, vraag, annuleer, bewaar }: {
  ctx: RoosterContext; t: TijdensData; st: ReturnType<typeof stand>; rooster: ReturnType<typeof geldendRooster>; naamStart: string; bezig: boolean;
  melding: ReactNode; vraag: boolean; annuleer: () => void; bewaar: (x: Parameters<typeof inhaalPlannen>[1]) => void;
}) {
  const kandidaten = [...st.per.values()].filter((s) => s.open > 0);
  const [datum, setDatum] = useState("");
  const [aan, setAan] = useState("13:00");
  const [ver, setVer] = useState("17:00");
  const [pau, setPau] = useState(0);
  const [afw, setAfw] = useState<string[]>(kandidaten.length === 1 ? [kandidaten[0].afw.id] : []);
  const [opm, setOpm] = useState("");
  const [naam, setNaam] = useState(naamStart);
  const c = datum ? inhaalControle({ datum, aan, ver, pau, afw }, { blok: ctx.blok, uitz: ctx.uitzonderingen, meerderjarig: ctx.meerderjarig, rooster, inhaal: t.inhaal, st }) : null;
  const werk = (naarMin(ver) ?? 0) - (naarMin(aan) ?? 0) - pau;
  return (
    <div className="bd ts-form">
      <div className="ts-rij">
        <label className="f"><span>Datum</span><input type="date" value={datum} min={ctx.blok.start_datum} max={st.termijn} onChange={(e) => setDatum(e.target.value)} /></label>
        <label className="f"><span>Van</span><input type="time" step={900} value={aan} onChange={(e) => setAan(e.target.value)} /></label>
        <label className="f"><span>Tot</span><input type="time" step={900} value={ver} onChange={(e) => setVer(e.target.value)} /></label>
        <label className="f"><span>Pauze</span><select value={pau} onChange={(e) => setPau(Number(e.target.value))}>{PAUZES.map((p) => <option key={p} value={p}>{p ? `${p} min` : "geen"}</option>)}</select></label>
        <div className="f"><span>Uren</span><b className="ts-uren">{werk > 0 ? uren(werk) : "–"}</b></div>
      </div>
      <fieldset className="ts-koppel">
        <legend>Welke afwezigheid haal je in?</legend>
        {kandidaten.length === 0 ? <p className="pt-hint">Er staat geen afwezigheid open om in te halen.</p> : kandidaten.map((s) => (
          <label key={s.afw.id} className="pt-vink">
            <input type="checkbox" checked={afw.includes(s.afw.id)} onChange={(e) => setAfw((x) => (e.target.checked ? [...x, s.afw.id] : x.filter((y) => y !== s.afw.id)))} />
            <span>{dagLang(s.afw.datum)} · {s.afw.reden} · nog {uren(s.open)} in te plannen</span>
          </label>
        ))}
      </fieldset>
      {c && (c.fouten.length > 0 || c.waarsch.length > 0) && (
        <ul className="wr-meld ts-meld">{c.fouten.map((x) => <li key={x} className="f">{x}</li>)}{c.waarsch.map((x) => <li key={x} className="w">{x}</li>)}</ul>
      )}
      <label className="f"><span>Opmerking (optioneel)</span><input value={opm} onChange={(e) => setOpm(e.target.value)} /></label>
      <label className="f"><span>Naam</span><input value={naam} onChange={(e) => setNaam(e.target.value)} autoComplete="name" /></label>
      <div className="bh-form-voet">
        <button type="button" className="bh-btn pri" disabled={bezig || !datum || !!c?.fouten.length} onClick={() => bewaar({ datum, aan, ver, pau, afw, opm, naam, zeker: vraag })}>
          {bezig ? "Bezig…" : vraag ? "Toch bewaren zonder koppeling" : "Inhaalstage plannen"}
        </button>
        <button type="button" className="bh-btn" onClick={annuleer}>Annuleren</button>
        {melding}
      </div>
    </div>
  );
}

function InhaalRij({ i, t, st, vandaag, isGever, naamStart, bezig, melding, bevestig, annuleer, koppel }: {
  i: Inhaal; t: TijdensData; st: ReturnType<typeof stand>; vandaag: string; isGever: boolean; naamStart: string; bezig: boolean; melding: ReactNode;
  bevestig: (x: { naam: string; aan: string; ver: string; pau: number }) => void; annuleer: (naam: string) => void; koppel: (afw: string[]) => void;
}) {
  const [bev, setBev] = useState(false);
  const [aan, setAan] = useState(i.aan), [ver, setVer] = useState(i.ver), [pau, setPau] = useState(i.pau), [naam, setNaam] = useState(naamStart);
  const [kop, setKop] = useState<string[]>(i.afw);
  const gekoppeld = i.afw.map((id) => t.afwezigheden.find((a) => a.id === id)).filter(Boolean);
  const losstaand = i.status === "gepland" && gekoppeld.length === 0;
  const nietNodig = st.nietNodig.some((x) => x.id === i.id);
  const status = i.status === "ingehaald" ? { c: "ok", t: "Ingehaald" } : i.status === "geannuleerd" ? { c: "mut", t: "Niet doorgegaan" }
    : losstaand ? { c: "warn", t: "Niet gekoppeld" } : nietNodig ? { c: "warn", t: "Niet meer nodig" } : i.datum <= vandaag ? { c: "in", t: "Wacht op bevestiging" } : { c: "in", t: "Gepland" };
  const kies = t.afwezigheden.filter((a) => !a.gewettigd);
  return (
    <li className={losstaand ? "ts-let" : undefined}>
      <div className="ts-r1">
        <b>{dagLang(i.datum)}</b>
        <span>{i.status === "ingehaald" && i.bev ? `${tijdKort(i.bev.aan)}–${tijdKort(i.bev.ver)}${i.bev.pau ? ` (pauze ${i.bev.pau} min)` : ""}` : `${tijdKort(i.aan)}–${tijdKort(i.ver)}${i.pau ? ` (pauze ${i.pau} min)` : ""}`}</span>
        <b className="ts-uren">{uren(i.status === "ingehaald" && i.bev ? i.bev.min : i.min)}</b>
      </div>
      <div className="ts-r2">
        <span>{gekoppeld.length ? `Haalt in: ${gekoppeld.map((a) => dagKort(a!.datum)).join(", ")}` : "Niet gekoppeld aan een afwezigheid"}{i.opm ? ` · ${i.opm}` : ""}</span>
        <span className="mut">
          gepland door {i.naam || i.door}
          {i.bev ? ` · bevestigd door ${i.bev.naam}` : ""}
          {i.annul ? ` · geannuleerd door ${i.annul.naam || i.annul.door}` : ""}
        </span>
      </div>
      <div className="ts-r3">
        <span className={`pill ${status.c}`}>{status.t}</span>
        {i.status === "gepland" && isGever && i.datum <= vandaag && !bev && <button type="button" className="bh-btn sm pri" onClick={() => setBev(true)}>Bevestigen</button>}
        {i.status === "gepland" && !isGever && i.datum <= vandaag && <span className="pt-hint">De stagegever bevestigt na afloop.</span>}
        {i.status === "gepland" && <Twee label="Niet doorgegaan" bevestig="Ja, annuleren" bezig={bezig} doe={() => annuleer(naamStart)} />}
        {melding}
      </div>
      {bev && (
        <div className="ts-bev">
          <label className="f"><span>Van</span><input type="time" step={900} value={aan} onChange={(e) => setAan(e.target.value)} /></label>
          <label className="f"><span>Tot</span><input type="time" step={900} value={ver} onChange={(e) => setVer(e.target.value)} /></label>
          <label className="f"><span>Pauze</span><select value={pau} onChange={(e) => setPau(Number(e.target.value))}>{[...new Set([...PAUZES, pau])].map((p) => <option key={p} value={p}>{p ? `${p} min` : "geen"}</option>)}</select></label>
          <label className="f"><span>Uw naam</span><input value={naam} onChange={(e) => setNaam(e.target.value)} /></label>
          <button type="button" className="bh-btn pri" disabled={bezig} onClick={() => bevestig({ naam, aan, ver, pau })}>Uren bevestigen</button>
          <button type="button" className="ct-link" onClick={() => setBev(false)}>Annuleren</button>
        </div>
      )}
      {i.status !== "geannuleerd" && (losstaand || nietNodig) && kies.length > 0 && (
        <div className="ts-bev">
          <span className="pt-hint">Koppelen aan:</span>
          {kies.map((a) => (
            <label key={a.id} className="pt-vink"><input type="checkbox" checked={kop.includes(a.id)} onChange={(e) => setKop((x) => (e.target.checked ? [...x, a.id] : x.filter((y) => y !== a.id)))} /><span>{dagKort(a.datum)}</span></label>
          ))}
          <button type="button" className="bh-btn sm" disabled={bezig} onClick={() => koppel(kop)}>Koppeling bewaren</button>
        </div>
      )}
    </li>
  );
}
