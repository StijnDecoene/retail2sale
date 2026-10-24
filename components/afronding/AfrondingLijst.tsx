"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { stagesAfronden } from "@/app/beheer/afronding-acties";

export type AfRij = {
  dossier_id: string; naam: string; klas: string; plaats: string;
  uren: string; urenOk: boolean; rooster: boolean; afw: boolean; eval: boolean; verslag: boolean; feedback: boolean;
  klaar: boolean; afgerond: string | null; code: string | null;
};
const V = (ok: boolean, nodig = false) => (ok ? <span className="pill ok">✓</span> : <span className={nodig ? "pill bad" : "sm"}>{nodig ? "!" : "–"}</span>);

export default function AfrondingLijst({ rijen }: { rijen: AfRij[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"" | "klaar" | "open" | "af">("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [mailen, setMailen] = useState(true);
  const [msg, setMsg] = useState<{ ok?: string; fout?: string } | null>(null);
  const [bezig, run] = useTransition();
  const kan = (r: AfRij) => !r.afgerond && r.klaar;
  const lijst = rijen.filter((r) => (filter === "klaar" ? kan(r) : filter === "open" ? !r.afgerond && !r.klaar : filter === "af" ? !!r.afgerond : true));
  const tel = { klaar: rijen.filter(kan).length, open: rijen.filter((r) => !r.afgerond && !r.klaar).length, af: rijen.filter((r) => r.afgerond).length, verslag: rijen.filter((r) => r.verslag).length, feedback: rijen.filter((r) => r.feedback).length };
  const wissel = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <>
      <div className="bh-kpis">
        <button type="button" className={`bh-kpi${tel.klaar ? " hot" : ""}`} onClick={() => setFilter("klaar")}><span className="l">Klaar om af te ronden</span><span className="v">{tel.klaar}</span></button>
        <button type="button" className="bh-kpi" onClick={() => setFilter("open")}><span className="l">Nog niet klaar</span><span className="v">{tel.open}</span></button>
        <button type="button" className="bh-kpi" onClick={() => setFilter("")}><span className="l">Stageverslag ingediend</span><span className="v">{tel.verslag}<small> / {rijen.length}</small></span></button>
        <button type="button" className="bh-kpi" onClick={() => setFilter("")}><span className="l">Feedback stagegever</span><span className="v">{tel.feedback}<small> / {rijen.length}</small></span></button>
        <button type="button" className="bh-kpi" onClick={() => setFilter("af")}><span className="l">Afgerond</span><span className="v">{tel.af}<small> / {rijen.length}</small></span></button>
      </div>
      <div className="bh-toolbar">
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter">
          <option value="">Iedereen</option><option value="klaar">Klaar om af te ronden</option><option value="open">Nog niet klaar</option><option value="af">Afgerond</option>
        </select>
        <button type="button" className="bh-btn" onClick={() => setSel(new Set(lijst.filter(kan).map((r) => r.dossier_id)))}>Selecteer wie klaar is</button>
        <label className="ev-mailvink"><input type="checkbox" checked={mailen} onChange={(e) => setMailen(e.target.checked)} /><span>Attest en bedankmail versturen</span></label>
        <button type="button" className="bh-btn pri" disabled={!sel.size || bezig} onClick={() => run(async () => { const r = await stagesAfronden([...sel], mailen); setMsg(r); setSel(new Set()); router.refresh(); })}>
          {bezig ? "Bezig…" : `Afronden (${sel.size})`}
        </button>
        {msg?.ok && <span className="bh-ok" role="status">{msg.ok}</span>}
        {msg?.fout && <span className="bh-fout" role="alert">{msg.fout}</span>}
      </div>
      <div className="bh-tw">
        <table className="bh-tabel">
          <thead><tr><th></th><th>Leerling</th><th>Klas</th><th>Stageplaats</th><th>Rooster</th><th>Afwezig</th><th className="r">Uren</th><th>Evaluatie</th><th>Verslag</th><th>Feedback</th><th>Afgerond</th></tr></thead>
          <tbody>
            {lijst.map((r) => (
              <tr key={r.dossier_id}>
                <td><input type="checkbox" aria-label={`Selecteer ${r.naam}`} checked={sel.has(r.dossier_id)} disabled={!!r.afgerond} onChange={() => wissel(r.dossier_id)} /></td>
                <td><Link prefetch={false} className="nm" href={`/beheer/dossiers/${r.dossier_id}`}>{r.naam}</Link></td>
                <td>{r.klas}</td>
                <td className="sm">{r.plaats || "–"}</td>
                <td>{V(r.rooster, true)}</td>
                <td>{V(r.afw, true)}</td>
                <td className={`r${r.urenOk ? "" : " af-tekort"}`}>{r.uren}</td>
                <td>{V(r.eval, true)}</td>
                <td>{V(r.verslag)}</td>
                <td>{V(r.feedback)}</td>
                <td>{r.afgerond ? <a className="pill ok" href={`/beheer/dossiers/${r.dossier_id}/attest`} target="_blank" rel="noreferrer" title={r.code ?? undefined}>{r.afgerond} · attest</a> : r.klaar ? <span className="pill warn">klaar</span> : <span className="sm">nee</span>}</td>
              </tr>
            ))}
            {!lijst.length && <tr><td colSpan={11} className="bh-leeg">Geen leerlingen in deze selectie.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="sm">Rooster, afwezigheden en evaluatie moeten in orde zijn om af te ronden; verslag en feedback zijn een aandachtspunt. Een stage die niet helemaal in orde is, rond je af vanuit het dossier.</p>
    </>
  );
}
