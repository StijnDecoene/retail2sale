"use client";

import { useState } from "react";
import { MIN_ACTIVITEITEN, catalogusVoor, naarItem, type ActItem, type Activiteit } from "@/lib/activiteiten";

const sleutel = (i: { code?: string | null; tekst: string }) => i.code || `t:${i.tekst}`;

/** Activiteitenlijst samenstellen: aanvinken uit de schooleigen lijst, toezicht aanduiden, eigen activiteiten toevoegen. */
export default function ActiviteitenKiezer({ catalogus, stage, waarde, zet, fout }: {
  catalogus: Activiteit[];
  stage: string | null | undefined;
  waarde: ActItem[];
  zet: (x: ActItem[]) => void;
  fout?: string;
}) {
  const [nieuw, setNieuw] = useState("");
  const eigenSoort = catalogusVoor(catalogus, stage);
  const andere = stage ? catalogus.filter((a) => a.actief && a.soort !== "algemeen" && a.soort !== stage).sort((a, b) => a.volgorde - b.volgorde) : [];
  const gekozen = new Map(waarde.map((i) => [sleutel(i), i]));
  const inCat = new Set(catalogus.map((a) => sleutel(a)));
  const eigen = waarde.filter((i) => !inCat.has(sleutel(i)));

  const wissel = (a: Activiteit) => {
    const k = sleutel(a);
    zet(gekozen.has(k) ? waarde.filter((i) => sleutel(i) !== k) : [...waarde, naarItem(a)]);
  };
  const toezicht = (k: string) => zet(waarde.map((i) => (sleutel(i) === k ? { ...i, toezicht: !i.toezicht } : i)));
  const voegToe = () => {
    const t = nieuw.trim();
    if (t.length < 3 || gekozen.has(`t:${t}`)) return;
    zet([...waarde, { code: null, groep: "Andere activiteiten", tekst: t, lpd: null, toezicht: false }]);
    setNieuw("");
  };

  const rij = (a: Activiteit) => {
    const k = sleutel(a), item = gekozen.get(k);
    return (
      <li key={k} className={item ? "on" : undefined}>
        <label className="act-vink">
          <input type="checkbox" checked={!!item} onChange={() => wissel(a)} />
          <span>{a.tekst}{a.lpd ? <small> LPD {a.lpd}</small> : null}</span>
        </label>
        {item && (
          <button type="button" className={`act-tz${item.toezicht ? " on" : ""}`} aria-pressed={item.toezicht} onClick={() => toezicht(k)} title="Enkel in aanwezigheid van de mentor of een ervaren collega">
            {item.toezicht ? "Onder rechtstreeks toezicht" : "Zelfstandig"}
          </button>
        )}
      </li>
    );
  };
  const groepen = (lijst: Activiteit[]) => {
    const m = new Map<string, Activiteit[]>();
    for (const a of lijst) m.set(a.groep, [...(m.get(a.groep) ?? []), a]);
    return [...m.entries()];
  };

  return (
    <div className="act">
      <p className="pt-hint">
        Vink aan wat de stagiair bij u effectief zal doen en vul aan met eigen activiteiten. Duid aan wat enkel <b>onder rechtstreeks toezicht</b> mag
        (klik op &lsquo;Zelfstandig&rsquo; om te wisselen). Deze lijst komt als bijlage bij het contract.
      </p>
      {groepen(eigenSoort).map(([g, lijst]) => (
        <div key={g} className="act-groep">
          <h4>{g}</h4>
          <ul>{lijst.map(rij)}</ul>
        </div>
      ))}
      {andere.length > 0 && (
        <details className="act-andere">
          <summary>Ook activiteiten uit de andere stage tonen ({stage === "sales" ? "onthaal en organisatie" : "sales"})</summary>
          {groepen(andere).map(([g, lijst]) => (
            <div key={g} className="act-groep"><h4>{g}</h4><ul>{lijst.map(rij)}</ul></div>
          ))}
        </details>
      )}
      <div className="act-groep">
        <h4>Eigen activiteiten</h4>
        {eigen.length > 0 && (
          <ul>
            {eigen.map((i) => (
              <li key={sleutel(i)} className="on">
                <span className="act-vink"><span>{i.tekst}</span></span>
                <button type="button" className={`act-tz${i.toezicht ? " on" : ""}`} aria-pressed={i.toezicht} onClick={() => toezicht(sleutel(i))}>{i.toezicht ? "Onder rechtstreeks toezicht" : "Zelfstandig"}</button>
                <button type="button" className="act-weg" aria-label={`${i.tekst} verwijderen`} onClick={() => zet(waarde.filter((x) => sleutel(x) !== sleutel(i)))}>×</button>
              </li>
            ))}
          </ul>
        )}
        <div className="act-nieuw">
          <input value={nieuw} onChange={(e) => setNieuw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); voegToe(); } }} placeholder="bv. Bestellingen voor click & collect klaarmaken" maxLength={300} />
          <button type="button" className="btn btn-line ct-klein" onClick={voegToe} disabled={nieuw.trim().length < 3}>Toevoegen</button>
        </div>
      </div>
      <p className={`act-teller${waarde.length < MIN_ACTIVITEITEN ? " te-weinig" : ""}`}>
        {waarde.length} {waarde.length === 1 ? "activiteit" : "activiteiten"} aangeduid{waarde.length < MIN_ACTIVITEITEN ? ` · minstens ${MIN_ACTIVITEITEN} nodig` : ""}
        {waarde.some((i) => i.toezicht) ? ` · ${waarde.filter((i) => i.toezicht).length} onder rechtstreeks toezicht` : ""}
      </p>
      {fout && <p className="bh-fout" role="alert">{fout}</p>}
    </div>
  );
}
