"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ActiviteitenKiezer from "./ActiviteitenKiezer";
import { contractActiviteitenBewaren } from "@/app/beheer/contract-acties";
import type { ActItem, Activiteit } from "@/lib/activiteiten";

/** Activiteitenlijst in het dossier: aanpassen door de stagebegeleiding (samen met de stagegever opgesteld). */
export default function ActiviteitenBeheer({ dossierId, catalogus, stage, start, bevestigd, getekend }: {
  dossierId: string; catalogus: Activiteit[]; stage: string | null | undefined; start: ActItem[]; bevestigd: boolean; getekend: boolean;
}) {
  const router = useRouter();
  const [lijst, setLijst] = useState(start);
  const [msg, setMsg] = useState<{ ok?: string; fout?: string } | null>(null);
  const [bezig, run] = useTransition();
  return (
    <div className="bd">
      {!bevestigd && <p className="bh-melding">De stagegever heeft de lijst nog niet bevestigd. Hieronder staat het voorstel van de school; de stagegever past het aan bij het invullen van het contract.</p>}
      {getekend && <p className="bh-melding">Er is al getekend. Een wijziging komt in het logboek; de partijen hoeven niet opnieuw te tekenen.</p>}
      <ActiviteitenKiezer catalogus={catalogus} stage={stage} waarde={lijst} zet={(x) => { setLijst(x); setMsg(null); }} />
      <div className="bh-acties">
        <button type="button" className="bh-btn pri" disabled={bezig} onClick={() => run(async () => { const r = await contractActiviteitenBewaren(dossierId, lijst); setMsg(r); if (r?.ok) router.refresh(); })}>
          {bezig ? "Bezig…" : "Activiteitenlijst bewaren"}
        </button>
        {msg?.ok && <span className="bh-ok" role="status">{msg.ok}</span>}
        {msg?.fout && <span className="bh-fout" role="alert">{msg.fout}</span>}
      </div>
    </div>
  );
}
