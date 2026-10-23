"use client";

import { useEffect, useRef, useState } from "react";

/** Handtekeningveld voor muis, vinger of pen. Geeft een png (data-URL) door, of "" na wissen. */
export default function Handtekening({ onChange, fout, uit }: { onChange: (png: string) => void; fout?: string; uit?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [leeg, setLeeg] = useState(true);
  const tekent = useRef(false);
  const vorige = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = ref.current!;
    const schaal = () => {
      const r = c.getBoundingClientRect();
      c.width = Math.round(r.width * 2);
      c.height = Math.round(r.height * 2);
      const ctx = c.getContext("2d")!;
      ctx.lineWidth = 4.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0e1a2b";
    };
    schaal();
  }, []);

  const punt = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) * 2, y: (e.clientY - r.top) * 2 };
  };
  const start = (e: React.PointerEvent) => {
    if (uit) return;
    ref.current!.setPointerCapture(e.pointerId);
    tekent.current = true;
    vorige.current = punt(e);
  };
  const beweeg = (e: React.PointerEvent) => {
    if (!tekent.current || !vorige.current) return;
    const ctx = ref.current!.getContext("2d")!;
    const p = punt(e);
    ctx.beginPath();
    ctx.moveTo(vorige.current.x, vorige.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    vorige.current = p;
    if (leeg) setLeeg(false);
  };
  const stop = () => {
    if (!tekent.current) return;
    tekent.current = false;
    vorige.current = null;
    onChange(ref.current!.toDataURL("image/png"));
  };
  const wis = () => {
    const c = ref.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setLeeg(true);
    onChange("");
  };

  return (
    <div className={`ct-pad-wrap${fout ? " pt-fout" : ""}`}>
      <div className={`ct-pad${uit ? " uit" : ""}`}>
        {leeg && <span className="ct-pad-ph">Teken hier met je muis, vinger of pen</span>}
        <span className="ct-pad-lijn" aria-hidden="true" />
        <canvas
          ref={ref}
          aria-label="Handtekeningveld"
          onPointerDown={start}
          onPointerMove={beweeg}
          onPointerUp={stop}
          onPointerCancel={stop}
          onPointerLeave={stop}
        />
      </div>
      <div className="ct-pad-voet">
        <button type="button" className="btn btn-line ct-klein" onClick={wis} disabled={leeg}>Wissen</button>
        {fout && <small className="pt-foutmelding">{fout}</small>}
      </div>
    </div>
  );
}
