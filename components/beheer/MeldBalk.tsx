import Link from "next/link";
import { meldingenGelezen } from "@/app/beheer/meldingen-acties";
import { SOORTEN, soortTekst } from "@/lib/meldingen";

/** Opvallende balk bovenaan elke beheerpagina zolang er nieuwe meldingen zijn. */
export default function MeldBalk({ totaal, perSoort }: { totaal: number; perSoort: Record<string, number> }) {
  if (!totaal) return null;
  const delen = Object.keys(SOORTEN).filter((s) => perSoort[s]).map((s) => soortTekst(s, perSoort[s]));
  return (
    <div className="bh-meldbalk" role="status">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0" /></svg>
      <div className="t">
        <b>{totaal === 1 ? "1 nieuwe melding" : `${totaal} nieuwe meldingen`}</b>
        <span>{delen.join(" · ")}</span>
      </div>
      <Link href="/beheer/meldingen" className="bh-btn pri">Bekijken</Link>
      <form action={meldingenGelezen}><button type="submit" className="bh-btn">Gelezen</button></form>
    </div>
  );
}
