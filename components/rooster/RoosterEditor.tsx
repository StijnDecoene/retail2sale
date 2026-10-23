"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { roosterActie, type RoosterResultaat } from "@/app/rooster/acties";
import {
  controle, dagKort, dagTekst, indienFouten, inOverleg, kalender, kanStage, standaardDag, uren, verschillen, weekKopieren, werkMin,
  roosterStand, type Dagen, type RDag, type RoosterContext,
} from "@/lib/werkrooster";
import type { Sleutel } from "@/lib/werkrooster-server";

const PAUZES = [0, 15, 30, 45, 60, 75, 90, 120];
const SOORT_LABEL: Record<string, string> = { vakantie: "Vakantie of feestdag", vm: "Geen stage in de voormiddag", zondag: "Zondag", school: "School", geen: "Geen stage" };

/** Werkrooster plannen: per week de stagedagen aanvinken en de uren invullen. Gebruikt door stagegever (link), stagiair (portaal) en school. */
export default function RoosterEditor({ ctx, sleutel, pdfUrl }: { ctx: RoosterContext; sleutel: Sleutel; pdfUrl?: string }) {
  const router = useRouter();
  const r = ctx.rooster;
  const stand = roosterStand(r);
  const bewerkbaar = !r || r.status === "concept" || r.status === "terug";
  const [dagen, setDagen] = useState<Dagen>(r?.dagen ?? {});
  const [opm, setOpm] = useState(r?.opmerkingen ?? "");
  const [naam, setNaam] = useState(ctx.wie === "stagegever" ? (ctx.stagegever.naam ?? "") : "");
  const [gever, setGever] = useState(false);
  const [vak, setVak] = useState(false);
  const [zeker, setZeker] = useState(false);
  const [msg, setMsg] = useState<RoosterResultaat>(null);
  const [bezig, start] = useTransition();
  const [gewijzigd, setGewijzigd] = useState(false);

  const kal = useMemo(() => kalender(ctx.blok, ctx.uitzonderingen), [ctx.blok, ctx.uitzonderingen]);
  const toon = bewerkbaar ? dagen : (r?.dagen ?? {});
  const c = useMemo(() => controle(toon, ctx.blok, ctx.uitzonderingen, ctx.meerderjarig), [toon, ctx]);
  const vorige = r?.vorige?.dagen ?? null;
  const diff = useMemo(() => (vorige ? new Map(verschillen(vorige, toon).map((v) => [v.iso, v])) : null), [vorige, toon]);
  const fouten = indienFouten(c);

  const zet = (iso: string, d: RDag | null) => {
    setGewijzigd(true);
    setMsg(null);
    setDagen((x) => {
      const n = { ...x };
      if (d) n[iso] = d;
      else delete n[iso];
      return n;
    });
  };
  const doe = (actie: Parameters<typeof roosterActie>[1], extra?: { naam?: string; vakAkkoord?: boolean }) =>
    start(async () => {
      const res = await roosterActie(sleutel, actie, { dagen, opmerkingen: opm, ...extra });
      setMsg(res);
      if (res?.ok) {
        setGewijzigd(false);
        setZeker(false);
        router.refresh();
      }
    });
  const indienen = () => {
    if (!naam.trim()) return setMsg({ fout: "Vul de naam van de stagegever in." });
    if (!gever) return setMsg({ fout: ctx.wie === "stagegever" ? "Vink aan dat je het rooster bevestigt." : "Vink aan dat de stagegever akkoord gaat." });
    doe("indienen", { naam, vakAkkoord: vak });
  };

  const pct = Math.min(100, Math.round((c.totaal / Math.max(1, c.doel)) * 100));
  const rest = c.doel - c.totaal;

  return (
    <div className="wr">
      {r?.status === "terug" && (
        <div className="pt-feedback"><b>{r.vorige ? "Wijziging teruggestuurd" : "Aanpassing gevraagd"}</b>{r.feedback && <p>{r.feedback}</p>}<small>Pas het rooster aan en dien het opnieuw in.</small></div>
      )}
      {r?.status === "ingediend" && (
        <div className="pt-feedback">
          <b>{stand.label}</b>
          <small>Ingediend door {r.bevestiging?.naam ?? "de stagegever"}. De stagebegeleiding keurt het rooster goed of stuurt het terug met uitleg.</small>
        </div>
      )}
      {r?.status === "goedgekeurd" && (
        <div className="pt-feedback ok">
          <b>Het werkrooster is goedgekeurd</b>
          {r.feedback && <p>{r.feedback}</p>}
          <small>Moet er toch iets wijzigen? Kies Rooster aanpassen. Het goedgekeurde rooster blijft gelden tot de wijziging is goedgekeurd.</small>
        </div>
      )}
      {r?.vorige && bewerkbaar && (
        <p className="bh-melding">Je past een goedgekeurd rooster aan. Tot de wijziging is goedgekeurd, geldt het vorige rooster. Gewijzigde dagen zijn gemarkeerd.</p>
      )}

      <div className="wr-totaal" role="status">
        <div className="wr-totaal-t">
          <b>{uren(c.totaal)}</b> <span>van {uren(c.doel)}</span>
          <small>{rest > 0 ? `nog ${uren(rest)} te plannen` : rest < 0 ? `${uren(-rest)} te veel` : "precies goed"}</small>
        </div>
        <div className={`wr-balk${rest < 0 ? " te-veel" : rest === 0 ? " ok" : ""}`}><span style={{ width: `${pct}%` }} /></div>
        <small className="wr-regels">
          Dinsdag tot zaterdag · gemiddeld {ctx.blok.uren_per_week} uur per week
          {ctx.meerderjarig ? "" : " · jonger dan 18: max. 8 uur per dag en 40 per week, niet na 20u, 12 uur rust"}
        </small>
      </div>

      {kal.map((w, wi) => {
        const zichtbaar = w.dagen.filter((d) => d.soort !== "buiten");
        const wf = c.week[w.maandag];
        return (
          <section key={w.maandag} className="bh-card wr-week">
            <div className="hd">
              <h2>Week {w.nr} <small>{dagKort(zichtbaar[0].iso)} – {dagKort(zichtbaar.at(-1)!.iso)}</small></h2>
              <span className="wr-weektot">{uren(c.weekMin[w.maandag] ?? 0)}</span>
              {bewerkbaar && wi < kal.length - 1 && (
                <button type="button" className="ct-link wr-kopie" onClick={() => { setDagen((x) => weekKopieren(x, kal, w.maandag)); setGewijzigd(true); }}>
                  Overnemen in de volgende weken
                </button>
              )}
            </div>
            <div className="wr-dagen">
              {zichtbaar.map((d) => {
                const dag = toon[d.iso];
                const mogelijk = kanStage(d.soort);
                const f = c.dag[d.iso] ?? [];
                const wl = c.dagW[d.iso] ?? [];
                const v = diff?.get(d.iso);
                return (
                  <div key={d.iso} className={`wr-dag${dag ? " aan" : ""}${mogelijk ? "" : " dicht"}${f.length ? " fout" : ""}${v ? " gewijzigd" : ""}`}>
                    <label className="wr-wie">
                      {mogelijk || dag ? (
                        <input
                          type="checkbox"
                          disabled={!bewerkbaar}
                          checked={!!dag}
                          onChange={(e) => zet(d.iso, e.target.checked ? standaardDag(d.soort, ctx.startuur) : null)}
                          aria-label={`Stage op ${dagKort(d.iso)}`}
                        />
                      ) : <span className="wr-leeg" />}
                      <span>
                        <b>{dagKort(d.iso)}</b>
                        {d.soort !== "stage" && <small className={`wr-soort ${d.soort}`}>{d.label && d.soort !== "zondag" && d.soort !== "school" ? d.label : SOORT_LABEL[d.soort]}</small>}
                      </span>
                    </label>
                    {dag ? (
                      <div className="wr-uren">
                        <label><span>Van</span><input type="time" step={900} value={dag.aan} disabled={!bewerkbaar} onChange={(e) => zet(d.iso, { ...dag, aan: e.target.value })} /></label>
                        <label><span>Tot</span><input type="time" step={900} value={dag.ver} disabled={!bewerkbaar} onChange={(e) => zet(d.iso, { ...dag, ver: e.target.value })} /></label>
                        <label><span>Pauze</span>
                          <select value={dag.pau} disabled={!bewerkbaar} onChange={(e) => zet(d.iso, { ...dag, pau: Number(e.target.value) })}>
                            {[...new Set([...PAUZES, dag.pau])].sort((a, b) => a - b).map((p) => <option key={p} value={p}>{p ? `${p} min` : "geen"}</option>)}
                          </select>
                        </label>
                        <b className="wr-som">{uren(werkMin(dag))}</b>
                      </div>
                    ) : (
                      <span className="wr-geen">{mogelijk ? (inOverleg(d.soort) ? "Enkel in overleg" : "Geen stage") : ""}</span>
                    )}
                    {(f.length > 0 || wl.length > 0 || v) && (
                      <ul className="wr-meld">
                        {f.map((t) => <li key={t} className="f">{t}</li>)}
                        {wl.map((t) => <li key={t} className="w">{t}</li>)}
                        {v && <li className="w">Was: {dagTekst(v.oud)}</li>}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            {wf && <p className="wr-weekfout">{wf.join(" ")}</p>}
          </section>
        );
      })}

      <section className="bh-card">
        <div className="bd wr-slot">
          <label className="f full">
            <span>Opmerkingen bij het rooster</span>
            <textarea value={opm} disabled={!bewerkbaar} onChange={(e) => { setOpm(e.target.value); setGewijzigd(true); }} rows={3}
              placeholder="Bijvoorbeeld: op zaterdag om 8u30 aan de personeelsingang melden." />
          </label>

          {bewerkbaar && (
            <>
              <div className="wr-bevestig">
                <h3>Indienen</h3>
                {fouten.length > 0 ? <ul className="wr-nog">{fouten.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="bh-melding ok">Het rooster is volledig en klopt met de regels.</p>}
                <label className="f">
                  <span>Naam van de stagegever die het rooster bevestigt</span>
                  <input value={naam} onChange={(e) => setNaam(e.target.value)} autoComplete="name" />
                </label>
                <label className="pt-vink">
                  <input type="checkbox" checked={gever} onChange={(e) => setGever(e.target.checked)} />
                  <span>{ctx.wie === "stagegever" ? "Ik bevestig dit werkrooster als stagegever." : "De stagegever heeft dit rooster nagekeken en gaat akkoord."}</span>
                </label>
                {c.overleg.length > 0 && (
                  <label className="pt-vink">
                    <input type="checkbox" checked={vak} onChange={(e) => setVak(e.target.checked)} />
                    <span>Stage op {c.overleg.map(dagKort).join(", ")} (vakantie, feestdag of zondag) is in overleg afgesproken.</span>
                  </label>
                )}
              </div>
              <div className="pt-voet">
                <button type="button" className="btn btn-line" disabled={bezig} onClick={() => doe("bewaren")}>Bewaar als concept</button>
                <button type="button" className="btn btn-blue" disabled={bezig || fouten.length > 0} onClick={indienen}>{bezig ? "Bezig…" : r?.vorige ? "Wijziging indienen" : "Rooster indienen"}</button>
                {r?.vorige && <button type="button" className="btn btn-line" disabled={bezig} onClick={() => doe("annuleren")}>Wijziging annuleren</button>}
                {gewijzigd && !msg && <span className="pt-hint">Niet bewaarde wijzigingen</span>}
                {msg?.ok && <span className="bh-ok" role="status">{msg.ok}</span>}
                {msg?.fout && <span className="bh-fout" role="alert">{msg.fout}</span>}
              </div>
            </>
          )}

          {!bewerkbaar && (
            <div className="pt-voet">
              {r?.status === "ingediend" && <button type="button" className="btn btn-line" disabled={bezig} onClick={() => doe("intrekken")}>Indiening intrekken</button>}
              {r?.status === "goedgekeurd" && (zeker ? (
                <>
                  <span className="pt-hint">Het rooster moet daarna opnieuw goedgekeurd worden.</span>
                  <button type="button" className="btn btn-blue" disabled={bezig} onClick={() => doe("aanpassen")}>Ja, rooster aanpassen</button>
                  <button type="button" className="btn btn-line" onClick={() => setZeker(false)}>Toch niet</button>
                </>
              ) : (
                <button type="button" className="btn btn-line" onClick={() => setZeker(true)}>Rooster aanpassen</button>
              ))}
              {r?.status === "goedgekeurd" && pdfUrl && <a className="btn btn-blue" href={pdfUrl} target="_blank" rel="noreferrer">Rooster als pdf</a>}
              {msg?.ok && <span className="bh-ok" role="status">{msg.ok}</span>}
              {msg?.fout && <span className="bh-fout" role="alert">{msg.fout}</span>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
