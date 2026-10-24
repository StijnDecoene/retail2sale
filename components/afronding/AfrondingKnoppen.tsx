"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { afrondingIntrekken, stagesAfronden } from "@/app/beheer/afronding-acties";

/** Afronden (met of zonder mail) of de afronding intrekken. */
export default function AfrondingKnoppen({ dossierId, afgerond, klaar }: { dossierId: string; afgerond: boolean; klaar: boolean }) {
  const router = useRouter();
  const [mailen, setMailen] = useState(true);
  const [zeker, setZeker] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; fout?: string } | null>(null);
  const [bezig, run] = useTransition();
  const doe = (f: () => Promise<{ ok?: string; fout?: string } | null>) => run(async () => { const r = await f(); setMsg(r); setZeker(false); router.refresh(); });
  return (
    <div className="bh-acties af-knoppen">
      {afgerond ? (
        zeker ? (
          <>
            <span className="sm">Het attest vervalt. Zeker?</span>
            <button type="button" className="bh-btn" disabled={bezig} onClick={() => doe(() => afrondingIntrekken(dossierId))}>Ja, intrekken</button>
            <button type="button" className="bh-btn" onClick={() => setZeker(false)}>Annuleren</button>
          </>
        ) : (
          <button type="button" className="bh-btn" onClick={() => setZeker(true)}>Afronding intrekken</button>
        )
      ) : (
        <>
          <label className="ev-mailvink"><input type="checkbox" checked={mailen} onChange={(e) => setMailen(e.target.checked)} /><span>Attest mailen naar de stagiair en bedankmail naar de stagegever</span></label>
          {klaar || zeker ? (
            <button type="button" className="bh-btn pri" disabled={bezig} onClick={() => doe(() => stagesAfronden([dossierId], mailen))}>{bezig ? "Bezig…" : klaar ? "Stage afronden" : "Toch afronden"}</button>
          ) : (
            <button type="button" className="bh-btn" onClick={() => setZeker(true)}>Afronden…</button>
          )}
          {!klaar && zeker && <span className="sm">Niet alles is in orde (zie hierboven). Het attest vermeldt de uren zoals ze nu zijn.</span>}
        </>
      )}
      {msg?.ok && <span className="bh-ok" role="status">{msg.ok}</span>}
      {msg?.fout && <span className="bh-fout" role="alert">{msg.fout}</span>}
    </div>
  );
}
