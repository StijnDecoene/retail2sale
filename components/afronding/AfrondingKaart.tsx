import Link from "next/link";
import type { serverClient } from "@/lib/supabase/server";
import { vandaagIso } from "@/lib/beheer";
import { klaar } from "@/lib/afronding";
import { afrondingVoorDossiers, attestBasis } from "@/lib/afronding-server";
import { datumMidden } from "@/lib/contract";
import AfrondingKnoppen from "./AfrondingKnoppen";

/** Afronding in het dossier: controlelijst, verslag, feedback, attest en afronden. */
export default async function AfrondingKaart({ sb, dossierId }: { sb: Awaited<ReturnType<typeof serverClient>>; dossierId: string }) {
  const b = await attestBasis(sb, dossierId);
  if (!b) return null;
  const { per, fout } = await afrondingVoorDossiers(sb, [dossierId], b.blok, vandaagIso());
  const st = per.get(dossierId);
  if (!st) return null;
  const af = st.afronding;
  const isKlaar = klaar(st.checks);
  return (
    <section className="bh-card">
      <div className="hd">
        <h2>Afronding</h2>
        <span className={`pill ${af ? "ok" : isKlaar ? "warn" : "mut"}`}>{af ? `Afgerond op ${datumMidden(af.afgerond_op.slice(0, 10))}` : isKlaar ? "Klaar om af te ronden" : "Nog niet klaar"}</span>
      </div>
      <div className="bd bh-stack">
        {fout && <p className="bh-melding">De databank mist nog de tabellen voor de afronding. Voer de migratie 20261031090000_afronding.sql uit.</p>}
        <ul className="af-checks">
          {st.checks.map((c) => (
            <li key={c.k} className={c.ok ? "ok" : c.nodig ? "nok" : "let"}>
              <span className="af-ic" aria-hidden="true">{c.ok ? "✓" : c.nodig ? "!" : "·"}</span>
              <b>{c.label}</b>
              {c.detail && <small>{c.detail}</small>}
              {c.k === "verslag" && <Link className="bh-link" href={`/beheer/dossiers/${dossierId}/evaluatie?soort=verslag`}>{c.ok ? "Lezen" : "Bekijken"}</Link>}
              {c.k === "feedback" && c.ok && <Link className="bh-link" href={`/beheer/dossiers/${dossierId}/evaluatie?soort=feedback`}>Lezen</Link>}
            </li>
          ))}
        </ul>
        {af && (
          <p className="sm">
            Attest {af.attest_code} · {Math.round(af.uren_min / 60 * 10) / 10} uur{af.gemaild_op ? ` · gemaild op ${datumMidden(af.gemaild_op.slice(0, 10))}` : " · niet gemaild"}
          </p>
        )}
        <div className="bh-acties">
          <a className="bh-btn" href={`/beheer/dossiers/${dossierId}/attest`} target="_blank" rel="noreferrer">{af ? "Stageattest (pdf)" : "Voorbeeld attest"}</a>
        </div>
        <AfrondingKnoppen dossierId={dossierId} afgerond={!!af} klaar={isKlaar} />
      </div>
    </section>
  );
}
