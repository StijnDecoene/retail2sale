import Link from "next/link";
import type { Taak } from "@/lib/stagegever";

/** Korte lijst met wat de stagegever nu moet doen. */
export default function NuTeDoen({ taken, leeg, compact }: { taken: Taak[]; leeg?: string; compact?: boolean }) {
  if (!taken.length) return leeg ? <p className="sg-leeg">{leeg}</p> : null;
  return (
    <div className={`sg-todo${compact ? " compact" : ""}`}>
      {!compact && <b className="sg-todo-kop">Nu te doen</b>}
      <ul>
        {taken.map((t) => (
          <li key={t.tekst} className={t.dringend ? "dringend" : undefined}>
            <Link href={t.href}>
              <span className="sg-pijl" aria-hidden="true">→</span>
              <span><b>{t.tekst}</b><small>{t.uitleg}</small></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
