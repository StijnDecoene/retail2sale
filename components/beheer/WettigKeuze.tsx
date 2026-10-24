"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { afwezigheidWettigen } from "@/app/rooster/tijdens-acties";

/** Keuzelijst gewettigd / niet gewettigd / nog te beoordelen, meteen bewaard. */
export default function WettigKeuze({ dossierId, id, waarde }: { dossierId: string; id: string; waarde: boolean | null }) {
  const router = useRouter();
  const [bezig, start] = useTransition();
  const [fout, setFout] = useState<string | null>(null);
  return (
    <span className="ts-twee">
      <select className="ts-wettig" aria-label="Gewettigd?" disabled={bezig} defaultValue={waarde === null ? "" : waarde ? "ja" : "nee"}
        onChange={(e) => start(async () => {
          const r = await afwezigheidWettigen(dossierId, id, e.target.value as "ja" | "nee" | "");
          setFout(r?.fout ?? null);
          if (r?.ok) router.refresh();
        })}>
        <option value="">Nog te beoordelen</option><option value="ja">Gewettigd</option><option value="nee">Niet gewettigd</option>
      </select>
      {fout && <span className="bh-fout">{fout}</span>}
    </span>
  );
}
