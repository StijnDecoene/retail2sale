"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logoVerwijderen, partnerZetten } from "@/app/beheer/partner-acties";

/** Stageplaats als partner op de homepagina, met logo. */
export default function PartnerKaart({ id, naam, partner, logoOp, website }: { id: string; naam: string; partner: boolean; logoOp: string | null; website: string | null }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok?: string; fout?: string } | null>(null);
  const [bezig, run] = useTransition();
  const [laden, setLaden] = useState(false);
  const bestand = useRef<HTMLInputElement>(null);
  const doe = (f: () => Promise<{ ok?: string; fout?: string }>) => run(async () => { setMsg(await f()); router.refresh(); });
  async function opladen() {
    const f = bestand.current?.files?.[0];
    if (!f) return;
    setLaden(true); setMsg(null);
    const fd = new FormData(); fd.set("logo", f);
    const r = await fetch(`/beheer/stageplaatsen/${id}/logo`, { method: "POST", body: fd }).then((x) => x.json()).catch(() => ({ fout: "Opladen lukte niet." }));
    setMsg(r); setLaden(false);
    if (r.ok) { if (bestand.current) bestand.current.value = ""; router.refresh(); }
  }
  return (
    <section className="bh-card">
      <div className="hd"><h2>Op de website</h2><span className={`pill ${partner ? "ok" : "mut"}`}>{partner ? "Partner op de homepagina" : "Niet zichtbaar"}</span></div>
      <div className="bd bh-stack">
        <label className="ev-mailvink">
          <input type="checkbox" checked={partner} disabled={bezig} onChange={(e) => doe(() => partnerZetten(id, e.target.checked))} />
          <span>Tonen bij de partners op de homepagina (met akkoord van de stageplaats)</span>
        </label>
        <div className="pk-logo">
          <div className="pk-voorbeeld">
            {logoOp
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={`/beheer/stageplaatsen/${id}/logo?v=${encodeURIComponent(logoOp)}`} alt={`Logo ${naam}`} />
              : <span>{naam}</span>}
          </div>
          <div className="bh-stack" style={{ gap: 6 }}>
            <input ref={bestand} type="file" accept="image/png,image/jpeg,image/webp" onChange={opladen} disabled={laden} aria-label="Logo kiezen" />
            <small className="sm">Png, jpg of webp, max. 1 MB. Liefst een liggend logo op een witte of transparante achtergrond. Zonder logo staat de naam er.</small>
            {logoOp && <button type="button" className="bh-btn sm" disabled={bezig} onClick={() => doe(() => logoVerwijderen(id))}>Logo verwijderen</button>}
          </div>
        </div>
        {!website && partner && <small className="sm">Tip: vul de website in bij Gegevens, dan linkt het logo ernaar.</small>}
        {msg?.ok && <span className="bh-ok" role="status">{msg.ok}</span>}
        {msg?.fout && <span className="bh-fout" role="alert">{msg.fout}</span>}
      </div>
    </section>
  );
}
