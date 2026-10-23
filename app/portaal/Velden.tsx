"use client";

import { useState, type ReactNode } from "react";

/** Eén invulveld met label, optionele uitleg en foutmelding. */
export function Veld({ label, fout, hint, full, children }: { label: string; fout?: string; hint?: string; full?: boolean; children: ReactNode }) {
  return (
    <label className={`f${full ? " full" : ""}${fout ? " pt-fout" : ""}`}>
      <span>{label}</span>
      {children}
      {hint && !fout && <small className="pt-hint">{hint}</small>}
      {fout && <small className="pt-foutmelding">{fout}</small>}
    </label>
  );
}

/** Vinkje met tekst. */
export function Vink({ checked, onChange, fout, children }: { checked: boolean; onChange: (v: boolean) => void; fout?: boolean; children: ReactNode }) {
  return (
    <label className={`pt-vink${fout && !checked ? " pt-fout" : ""}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

/** Knoppen onderaan: concept bewaren en indienen, met melding. */
export function Voet({
  bezig,
  bewaar,
  dien,
  dienLabel,
  ok,
  fout,
}: {
  bezig: boolean;
  bewaar: () => void;
  dien: () => void;
  dienLabel: string;
  ok?: string;
  fout?: string;
}) {
  return (
    <div className="pt-voet">
      <button type="button" className="btn btn-line" disabled={bezig} onClick={bewaar}>
        Bewaar als concept
      </button>
      <button type="button" className="btn btn-blue" disabled={bezig} onClick={dien}>
        {bezig ? "Bezig…" : dienLabel}
      </button>
      {ok && <span className="bh-ok" role="status">{ok}</span>}
      {fout && <span className="bh-fout" role="alert">{fout}</span>}
    </div>
  );
}

const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

/**
 * Geboortedatum met drie keuzelijsten (dag, maand, jaar): het jaartal typen in een datumveld lukt slecht.
 * Geeft "jjjj-mm-dd" door zodra alle drie gekozen zijn, anders "".
 */
export function Datumkeuze({ label, waarde, onChange, fout, hint, vanJaar, totJaar }: {
  label: string; waarde: string; onChange: (iso: string) => void; fout?: string; hint?: string; vanJaar: number; totJaar: number;
}) {
  const [j0, m0, d0] = /^\d{4}-\d{2}-\d{2}$/.test(waarde) ? waarde.split("-") : ["", "", ""];
  const [dag, setDag] = useState(d0 ? String(Number(d0)) : "");
  const [maand, setMaand] = useState(m0 ? String(Number(m0)) : "");
  const [jaar, setJaar] = useState(j0);
  const zet = (d: string, m: string, j: string) => {
    setDag(d); setMaand(m); setJaar(j);
    onChange(d && m && j ? `${j}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : "");
  };
  const jaren: number[] = [];
  for (let j = totJaar; j >= vanJaar; j--) jaren.push(j);
  return (
    <div className={`f${fout ? " pt-fout" : ""}`} role="group" aria-label={label}>
      <span>{label}</span>
      <div className="pt-datum">
        <select aria-label="Dag" value={dag} onChange={(e) => zet(e.target.value, maand, jaar)}>
          <option value="">Dag</option>
          {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </select>
        <select aria-label="Maand" value={maand} onChange={(e) => zet(dag, e.target.value, jaar)}>
          <option value="">Maand</option>
          {MAANDEN.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
        </select>
        <select aria-label="Jaar" value={jaar} onChange={(e) => zet(dag, maand, e.target.value)}>
          <option value="">Jaar</option>
          {jaren.map((j) => <option key={j} value={j}>{j}</option>)}
        </select>
      </div>
      {hint && !fout && <small className="pt-hint">{hint}</small>}
      {fout && <small className="pt-foutmelding">{fout}</small>}
    </div>
  );
}
