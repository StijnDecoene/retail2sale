"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Handtekening from "./Handtekening";
import { contractTekenenDirectie } from "@/app/beheer/contract-acties";

/** Tekenen voor de school, als laatste partij. */
export default function DirectieTekenen({ dossierId, naam, directeur, isDirectie }: { dossierId: string; naam: string; directeur: string; isDirectie: boolean }) {
  const router = useRouter();
  const [n, setN] = useState(naam);
  const [plaats, setPlaats] = useState("Heule");
  const [namens, setNamens] = useState(!isDirectie);
  const [png, setPng] = useState("");
  const [res, setRes] = useState<{ ok?: string; fout?: string } | null>(null);
  const [bezig, run] = useTransition();
  return (
    <div className="bh-form">
      <p className="hint">Alle andere partijen hebben getekend. Teken nu voor de school; daarna is het contract volledig{" "}en gaat het naar alle partijen.</p>
      <div className="bh-fg">
        <label className="f">Naam<input value={n} onChange={(e) => setN(e.target.value)} /></label>
        <label className="f">Opgemaakt te<input value={plaats} onChange={(e) => setPlaats(e.target.value)} /></label>
      </div>
      <label className="bh-vink">
        <input type="checkbox" checked={namens} onChange={(e) => setNamens(e.target.checked)} />
        <span>Ik teken namens de directeur ({directeur})</span>
      </label>
      <Handtekening onChange={setPng} />
      <div className="bh-form-voet">
        <button
          type="button"
          className="bh-btn pri"
          disabled={bezig || !png}
          onClick={() => run(async () => {
            const r = await contractTekenenDirectie(dossierId, { naam: n, plaats, handtekening: png, namens });
            setRes(r);
            if (r?.ok) router.refresh();
          })}
        >
          {bezig ? "Bezig…" : "Ondertekenen voor de school"}
        </button>
        {res?.ok && <span className="bh-ok">{res.ok}</span>}
        {res?.fout && <span className="bh-fout">{res.fout}</span>}
      </div>
    </div>
  );
}
