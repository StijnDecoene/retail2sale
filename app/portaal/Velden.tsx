"use client";

import type { ReactNode } from "react";

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
