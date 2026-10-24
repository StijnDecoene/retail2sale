"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { eindpuntBewaren, evaluatiesOpenstellen, openstellenIntrekken } from "@/app/beheer/evaluatie-acties";

/** Eindpunt (voorstel uit de beoordelingen, aanpasbaar) en openstellen voor de stagiair. */
export default function EvaluatieBeslissing({ dossierId, voorstel, eindpunt, opmerking, op, vrijgegeven, heeftEvaluatie }: {
  dossierId: string; voorstel: number | null; eindpunt: number | null; opmerking: string; op: number; vrijgegeven: boolean; heeftEvaluatie: boolean;
}) {
  const router = useRouter();
  const [punt, setPunt] = useState(eindpunt !== null ? String(eindpunt) : "");
  const [opm, setOpm] = useState(opmerking);
  const [mailen, setMailen] = useState(true);
  const [msg, setMsg] = useState<{ ok?: string; fout?: string } | null>(null);
  const [bezig, run] = useTransition();
  const doe = (f: () => Promise<{ ok?: string; fout?: string } | null>) => run(async () => { const r = await f(); setMsg(r); router.refresh(); });
  return (
    <div className="ev-punt">
      <label>Voorstel<input value={voorstel !== null ? `${voorstel} / ${op}` : "–"} readOnly aria-readonly /></label>
      <label>Eindpunt (op {op})<input inputMode="decimal" value={punt} placeholder={voorstel !== null ? String(voorstel) : ""} onChange={(e) => setPunt(e.target.value.replace(",", "."))} /></label>
      <label style={{ flex: 1, minWidth: 220 }}>Opmerking voor de stagiair (optioneel)<textarea rows={2} value={opm} onChange={(e) => setOpm(e.target.value)} /></label>
      <button type="button" className="bh-btn" disabled={bezig} onClick={() => doe(() => eindpuntBewaren(dossierId, punt === "" ? null : Number(punt), opm))}>Bewaren</button>
      {vrijgegeven ? (
        <button type="button" className="bh-btn" disabled={bezig} onClick={() => doe(() => openstellenIntrekken(dossierId))}>Openstellen intrekken</button>
      ) : (
        <>
          <label className="ev-mailvink"><input type="checkbox" checked={mailen} onChange={(e) => setMailen(e.target.checked)} /><span>Ook mailen naar stagiair en mentor</span></label>
          <button type="button" className="bh-btn pri" disabled={bezig || !heeftEvaluatie} title={heeftEvaluatie ? undefined : "Er is nog geen ingediende evaluatie van de mentor of van het bezoek"}
            onClick={() => doe(async () => { await eindpuntBewaren(dossierId, punt === "" ? null : Number(punt), opm); return evaluatiesOpenstellen([dossierId], mailen); })}>
            Evaluatie openstellen
          </button>
        </>
      )}
      {msg?.ok && <span className="bh-ok" role="status">{msg.ok}</span>}
      {msg?.fout && <span className="bh-fout" role="alert">{msg.fout}</span>}
    </div>
  );
}
