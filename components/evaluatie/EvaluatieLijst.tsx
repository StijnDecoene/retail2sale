"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { evaluatiesOpenstellen, puntenBewaren } from "@/app/beheer/evaluatie-acties";
import type { Puntenschema } from "@/lib/evaluaties";

export type EvRij = {
  dossier_id: string; naam: string; klas: string; plaats: string;
  mentor: "concept" | "ingediend" | null; school: "concept" | "ingediend" | null; zelf: "concept" | "ingediend" | null;
  voorstel: number | null; eindpunt: number | null; vrijgegeven: boolean;
};
const ST = (s: EvRij["mentor"]) => (s === "ingediend" ? <span className="pill ok">✓</span> : s === "concept" ? <span className="pill warn">concept</span> : <span className="sm">–</span>);

export default function EvaluatieLijst({ blokId, rijen, punten }: { blokId: string; rijen: EvRij[]; punten: Puntenschema }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"" | "klaar" | "open" | "vrij">("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [mailen, setMailen] = useState(true);
  const [p, setP] = useState(punten);
  const [msg, setMsg] = useState<{ ok?: string; fout?: string } | null>(null);
  const [bezig, run] = useTransition();
  const klaar = (r: EvRij) => !r.vrijgegeven && r.mentor === "ingediend" && r.school === "ingediend";
  const lijst = rijen.filter((r) => (filter === "klaar" ? klaar(r) : filter === "open" ? !r.vrijgegeven && (r.mentor !== "ingediend" || r.school !== "ingediend") : filter === "vrij" ? r.vrijgegeven : true));
  const tel = { mentor: rijen.filter((r) => r.mentor === "ingediend").length, school: rijen.filter((r) => r.school === "ingediend").length, zelf: rijen.filter((r) => r.zelf === "ingediend").length, klaar: rijen.filter(klaar).length, vrij: rijen.filter((r) => r.vrijgegeven).length };
  const doe = (f: () => Promise<{ ok?: string; fout?: string } | null>) => run(async () => { const r = await f(); setMsg(r); setSel(new Set()); router.refresh(); });
  const wissel = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <>
      <div className="bh-kpis">
        <button type="button" className="bh-kpi" onClick={() => setFilter("")}><span className="l">Mentor ingediend</span><span className="v">{tel.mentor}<small> / {rijen.length}</small></span></button>
        <button type="button" className="bh-kpi" onClick={() => setFilter("open")}><span className="l">Bezoekformulier ingevuld</span><span className="v">{tel.school}<small> / {rijen.length}</small></span></button>
        <button type="button" className="bh-kpi" onClick={() => setFilter("")}><span className="l">Zelfevaluatie ingediend</span><span className="v">{tel.zelf}<small> / {rijen.length}</small></span></button>
        <button type="button" className={`bh-kpi${tel.klaar ? " hot" : ""}`} onClick={() => setFilter("klaar")}><span className="l">Klaar om open te stellen</span><span className="v">{tel.klaar}</span></button>
        <button type="button" className="bh-kpi" onClick={() => setFilter("vrij")}><span className="l">Opengesteld</span><span className="v">{tel.vrij}</span></button>
      </div>
      <div className="bh-toolbar">
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter">
          <option value="">Iedereen</option><option value="klaar">Klaar om open te stellen</option><option value="open">Nog niet volledig</option><option value="vrij">Opengesteld</option>
        </select>
        <button type="button" className="bh-btn" onClick={() => setSel(new Set(lijst.filter(klaar).map((r) => r.dossier_id)))}>Selecteer wie klaar is</button>
        <label className="pt-vink" style={{ flexDirection: "row" }}><input type="checkbox" checked={mailen} onChange={(e) => setMailen(e.target.checked)} /><span>Mailen naar stagiair en mentor</span></label>
        <button type="button" className="bh-btn pri" disabled={!sel.size || bezig} onClick={() => doe(() => evaluatiesOpenstellen([...sel], mailen))}>{bezig ? "Bezig…" : `Openstellen (${sel.size})`}</button>
        {msg?.ok && <span className="bh-ok" role="status">{msg.ok}</span>}
        {msg?.fout && <span className="bh-fout" role="alert">{msg.fout}</span>}
      </div>
      <div className="bh-tw">
        <table className="bh-tabel">
          <thead><tr><th></th><th>Leerling</th><th>Klas</th><th>Stageplaats</th><th>Mentor</th><th>Bezoek</th><th>Zelf</th><th className="r">Voorstel</th><th className="r">Eindpunt</th><th>Opengesteld</th></tr></thead>
          <tbody>
            {lijst.map((r) => (
              <tr key={r.dossier_id}>
                <td><input type="checkbox" aria-label={`Selecteer ${r.naam}`} checked={sel.has(r.dossier_id)} disabled={r.vrijgegeven} onChange={() => wissel(r.dossier_id)} /></td>
                <td><Link prefetch={false} className="nm" href={`/beheer/dossiers/${r.dossier_id}`}>{r.naam}</Link></td>
                <td>{r.klas}</td>
                <td className="sm">{r.plaats || "–"}</td>
                <td>{ST(r.mentor)}</td>
                <td>{r.school ? ST(r.school) : <Link className="bh-btn sm" href={`/beheer/dossiers/${r.dossier_id}/evaluatie?soort=school&terug=/beheer/evaluaties`}>Invullen</Link>}</td>
                <td>{ST(r.zelf)}</td>
                <td className="r">{r.voorstel ?? "–"}</td>
                <td className="r"><b>{r.eindpunt ?? "–"}</b></td>
                <td>{r.vrijgegeven ? <span className="pill ok">ja</span> : <span className="sm">nee</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="bh-card">
        <div className="hd"><h2>Puntenschema</h2><small className="sm">elke beoordeling geeft punten op 10; &lsquo;niet van toepassing&rsquo; telt niet mee</small></div>
        <div className="bd ev-punt">
          {(["O", "V", "G", "ZG"] as const).map((k) => (
            <label key={k}>{{ O: "Onvoldoende", V: "Voldoende", G: "Goed", ZG: "Zeer goed" }[k]}<input type="number" min={0} max={10} step={0.5} value={p[k]} onChange={(e) => setP({ ...p, [k]: Number(e.target.value) })} /></label>
          ))}
          <label>Eindpunt op<input type="number" min={1} max={100} value={p.op} onChange={(e) => setP({ ...p, op: Number(e.target.value) })} /></label>
          <label>Aandeel mentor (%)<input type="number" min={0} max={100} value={p.aandeel_mentor} onChange={(e) => setP({ ...p, aandeel_mentor: Number(e.target.value) })} /></label>
          <button type="button" className="bh-btn" disabled={bezig} onClick={() => doe(() => puntenBewaren(blokId, p))}>Bewaren</button>
          <small className="sm" style={{ flexBasis: "100%" }}>Voorstel = gemiddelde van de mentor × {p.aandeel_mentor}% + gemiddelde van het bezoek × {100 - p.aandeel_mentor}%, omgerekend naar {p.op}. Het eindpunt pas je per leerling aan in het dossier.</small>
        </div>
      </section>
    </>
  );
}
