"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { evaluatieBewaren } from "@/app/rooster/evaluatie-acties";
import { schoolEvaluatieBewaren } from "@/app/beheer/evaluatie-acties";
import { NIVEAUS, NIVEAU_LABEL, ontbreekt, type Antwoorden, type Formulier, type Niveau, type Vraag } from "@/lib/evaluaties";
import type { Sleutel } from "@/lib/werkrooster-server";

/** Evaluatie invullen: per criterium een niveau (met omschrijving), open vragen, schalen en keuzes. */
export default function EvaluatieForm({
  f, start, ingediend, naamStart, sleutel, schoolDossier, naamVraag,
}: {
  f: Formulier;
  start: Antwoorden;
  ingediend: boolean;
  naamStart: string;
  sleutel?: Sleutel;
  /** school vult in vanuit het beheer (ook de mentorevaluatie op papier) */
  schoolDossier?: string;
  naamVraag?: string;
}) {
  const router = useRouter();
  const [a, setA] = useState<Antwoorden>(start);
  const [naam, setNaam] = useState(naamStart);
  const [msg, setMsg] = useState<{ ok?: string; fout?: string } | null>(null);
  const [bezig, run] = useTransition();
  const [gewijzigd, setGewijzigd] = useState(false);
  const zet = (id: string, v: string) => { setA((x) => ({ ...x, [id]: v })); setGewijzigd(true); setMsg(null); };
  const mis = ontbreekt(f, a);
  const totaal = f.delen.reduce((s, d) => s + d.vragen.filter((v) => !(v.t === "tekst" && v.optioneel)).length, 0);
  const bewaar = (indienen: boolean) =>
    run(async () => {
      const r = schoolDossier
        ? await schoolEvaluatieBewaren(schoolDossier, f.soort, a, indienen, naam)
        : await evaluatieBewaren(sleutel!, f.soort, a, indienen, naam);
      setMsg(r);
      if (r?.ok) { setGewijzigd(false); router.refresh(); }
    });
  const alleenLezen = ingediend && !schoolDossier;

  return (
    <div className="ev">
      <div className="bh-card"><div className="bd">
        <p>{f.intro}</p>
        {f.schaal && <ul className="ev-schaal">{f.schaal.map((x) => <li key={x}><b>{x.split(":")[0]}</b>:{x.split(":").slice(1).join(":")}</li>)}</ul>}
        {ingediend && <p className="bh-melding ok">{schoolDossier ? "Deze evaluatie is afgewerkt. Je kan ze nog aanpassen." : "Ingediend. Bedankt!"}</p>}
      </div></div>

      {f.delen.map((d, i) => (
        <section key={d.titel} className="bh-card">
          <div className="hd"><h2>{i + 1}. {d.titel}</h2>{d.uitleg && <small className="sm">{d.uitleg}</small>}</div>
          <div className="ev-vragen">
            {d.vragen.map((v) => <VraagVeld key={v.id} v={v} waarde={a[v.id] ?? ""} zet={(x) => zet(v.id, x)} lezen={alleenLezen} />)}
          </div>
        </section>
      ))}

      {!alleenLezen && (
        <div className="pt-voet ev-voet">
          {naamVraag && <label className="ev-naam"><span>{naamVraag}</span><input value={naam} onChange={(e) => setNaam(e.target.value)} autoComplete="name" /></label>}
          <span className="pt-hint">{totaal - mis.length} van {totaal} ingevuld</span>
          <button type="button" className="btn btn-line" disabled={bezig} onClick={() => bewaar(false)}>Bewaar en later verder</button>
          <button type="button" className="btn btn-blue" disabled={bezig || mis.length > 0} title={mis.length ? `Nog in te vullen: ${mis.length}` : undefined} onClick={() => bewaar(true)}>
            {bezig ? "Bezig…" : schoolDossier ? "Afwerken" : "Indienen"}
          </button>
          {gewijzigd && !msg && <span className="pt-hint">Niet bewaarde wijzigingen</span>}
          {msg?.ok && <span className="bh-ok" role="status">{msg.ok}</span>}
          {msg?.fout && <span className="bh-fout" role="alert">{msg.fout}</span>}
        </div>
      )}
    </div>
  );
}

function VraagVeld({ v, waarde, zet, lezen }: { v: Vraag; waarde: string; zet: (x: string) => void; lezen: boolean }) {
  const [uitleg, setUitleg] = useState(false);
  if (v.t === "rubric") {
    const keuzes = [...NIVEAUS.map((n) => n.k as Niveau), ...(v.nvt ? (["NVT"] as Niveau[]) : [])];
    const oms = waarde && waarde !== "NVT" ? v.niveaus?.[waarde as Exclude<Niveau, "NVT">] : undefined;
    return (
      <div className={`ev-v ev-rubric${waarde ? " ok" : ""}`}>
        <div className="ev-l">
          <b>{v.label}</b>
          {v.niveaus && <button type="button" className="ct-link" onClick={() => setUitleg(!uitleg)}>{uitleg ? "Omschrijvingen verbergen" : "Omschrijvingen"}</button>}
        </div>
        <div className="ev-niveaus" role="radiogroup" aria-label={v.label}>
          {keuzes.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={waarde === k} disabled={lezen} className={`ev-n n-${k}${waarde === k ? " on" : ""}`} onClick={() => zet(k)}>
              {k === "NVT" ? "n.v.t." : NIVEAU_LABEL[k]}
            </button>
          ))}
        </div>
        {oms && !uitleg && <small className="ev-oms">{oms}</small>}
        {uitleg && v.niveaus && (
          <ul className="ev-alle">{NIVEAUS.map((n) => v.niveaus?.[n.k] && <li key={n.k}><b>{n.l}</b>: {v.niveaus[n.k]}</li>)}</ul>
        )}
      </div>
    );
  }
  if (v.t === "tekst") {
    return (
      <label className="ev-v">
        <b>{v.label}{v.optioneel ? <small> (optioneel)</small> : null}</b>
        {v.lang ? <textarea rows={3} value={waarde} disabled={lezen} onChange={(e) => zet(e.target.value)} /> : <input value={waarde} disabled={lezen} onChange={(e) => zet(e.target.value)} />}
      </label>
    );
  }
  if (v.t === "datum") {
    return <label className="ev-v"><b>{v.label}</b><input type="date" value={waarde} disabled={lezen} onChange={(e) => zet(e.target.value)} /></label>;
  }
  const opties = v.t === "schaal" ? Array.from({ length: v.max }, (_, i) => String(i + 1)) : v.opties;
  return (
    <div className={`ev-v${waarde ? " ok" : ""}`}>
      <b>{v.label}{v.t === "schaal" ? <small> ({v.max === 5 ? "1 = zwak, 5 = sterk" : "op 10"})</small> : null}</b>
      <div className={`ev-niveaus${v.t === "schaal" ? " schaal" : ""}`} role="radiogroup" aria-label={v.label}>
        {opties.map((o) => <button key={o} type="button" role="radio" aria-checked={waarde === o} disabled={lezen} className={`ev-n${waarde === o ? " on" : ""}`} onClick={() => zet(o)}>{o}</button>)}
      </div>
    </div>
  );
}
