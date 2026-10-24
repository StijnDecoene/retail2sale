"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { activiteitenBewaren } from "@/app/beheer/activiteiten-acties";
import { ACT_SOORT_LABEL, type ActSoort, type Activiteit } from "@/lib/activiteiten";

const SOORTEN: ActSoort[] = ["algemeen", "sales", "onthaal"];
let teller = 0;

/** Schooleigen activiteitenlijst bewerken, per soort stage. */
export default function ActiviteitenEditor({ start }: { start: Activiteit[] }) {
  const router = useRouter();
  const [rijen, setRijen] = useState(start);
  const [weg, setWeg] = useState<string[]>([]);
  const [gewijzigd, setGewijzigd] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; fout?: string } | null>(null);
  const [bezig, run] = useTransition();
  const zet = (id: string, k: keyof Activiteit, v: unknown) => { setRijen((r) => r.map((x) => (x.id === id ? { ...x, [k]: v } : x))); setGewijzigd(true); setMsg(null); };
  const schuif = (id: string, d: -1 | 1) => setRijen((r) => {
    const i = r.findIndex((x) => x.id === id), j = i + d;
    if (j < 0 || j >= r.length || r[j].soort !== r[i].soort) return r;
    const n = [...r]; [n[i], n[j]] = [n[j], n[i]]; setGewijzigd(true); return n;
  });
  const nieuw = (soort: ActSoort) => {
    const laatste = [...rijen].reverse().find((x) => x.soort === soort);
    const rij: Activiteit = { id: `nieuw-${++teller}`, code: null, soort, groep: laatste?.groep ?? "Andere", tekst: "", lpd: null, toezicht: false, standaard: true, actief: true, volgorde: 0 };
    const i = laatste ? rijen.indexOf(laatste) + 1 : rijen.length;
    setRijen([...rijen.slice(0, i), rij, ...rijen.slice(i)]); setGewijzigd(true);
  };
  const verwijder = (id: string) => { setRijen((r) => r.filter((x) => x.id !== id)); setWeg((w) => [...w, id]); setGewijzigd(true); };
  const geordend = SOORTEN.flatMap((s) => rijen.filter((r) => r.soort === s));

  return (
    <>
      {SOORTEN.map((s) => (
        <section key={s} className="bh-card">
          <div className="hd"><h2>{ACT_SOORT_LABEL[s]}</h2><span className="sm">{rijen.filter((r) => r.soort === s && r.actief).length} actief</span></div>
          <div className="bh-tw">
            <table className="bh-tabel act-tabel">
              <thead><tr><th></th><th>Groep</th><th>Activiteit</th><th>LPD</th><th title="Enkel onder rechtstreeks toezicht">Toezicht</th><th title="Standaard aangevinkt in het voorstel">Standaard</th><th>Actief</th><th></th></tr></thead>
              <tbody>
                {rijen.filter((r) => r.soort === s).map((r) => (
                  <tr key={r.id} className={r.actief ? undefined : "uit"}>
                    <td className="act-pijlen">
                      <button type="button" aria-label="Omhoog" onClick={() => schuif(r.id, -1)}>↑</button>
                      <button type="button" aria-label="Omlaag" onClick={() => schuif(r.id, 1)}>↓</button>
                    </td>
                    <td><input className="act-groep-in" value={r.groep} onChange={(e) => zet(r.id, "groep", e.target.value)} aria-label="Groep" /></td>
                    <td><input className="act-tekst-in" value={r.tekst} onChange={(e) => zet(r.id, "tekst", e.target.value)} aria-label="Activiteit" placeholder="Nieuwe activiteit…" /></td>
                    <td><input className="act-lpd-in" value={r.lpd ?? ""} onChange={(e) => zet(r.id, "lpd", e.target.value)} aria-label="Leerplandoelen" /></td>
                    <td className="c"><input type="checkbox" checked={r.toezicht} onChange={(e) => zet(r.id, "toezicht", e.target.checked)} aria-label="Onder rechtstreeks toezicht" /></td>
                    <td className="c"><input type="checkbox" checked={r.standaard} onChange={(e) => zet(r.id, "standaard", e.target.checked)} aria-label="Standaard aangevinkt" /></td>
                    <td className="c"><input type="checkbox" checked={r.actief} onChange={(e) => zet(r.id, "actief", e.target.checked)} aria-label="Actief" /></td>
                    <td>{!r.code && <button type="button" className="act-weg" aria-label="Verwijderen" onClick={() => verwijder(r.id)}>×</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bd"><button type="button" className="bh-btn" onClick={() => nieuw(s)}>+ Activiteit toevoegen</button></div>
        </section>
      ))}
      <div className="bh-toolbar act-bewaar">
        <button type="button" className="bh-btn pri" disabled={bezig || !gewijzigd} onClick={() => run(async () => { const r = await activiteitenBewaren(geordend, weg); setMsg(r); if (r?.ok) { setGewijzigd(false); setWeg([]); router.refresh(); } })}>
          {bezig ? "Bezig…" : "Wijzigingen bewaren"}
        </button>
        {gewijzigd && !msg && <span className="sm">Niet bewaarde wijzigingen</span>}
        {msg?.ok && <span className="bh-ok" role="status">{msg.ok}</span>}
        {msg?.fout && <span className="bh-fout" role="alert">{msg.fout}</span>}
        <span className="sm">Activiteiten uit het startvoorstel kan je niet verwijderen, wel uitzetten (Actief).</span>
      </div>
    </>
  );
}
