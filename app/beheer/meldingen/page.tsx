import Link from "next/link";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import { gezienTot } from "@/lib/meldingen-server";
import { SOORTEN, type Melding } from "@/lib/meldingen";
import { meldingenGelezen } from "../meldingen-acties";

export const metadata = { title: "Meldingen" };

const LABEL: Record<string, string> = { afwezigheid: "Afwezigheid", inhaal: "Inhaalstage", rooster: "Werkrooster", contract: "Contract", top3: "Top 3", aanvraag: "Aanvraag", evaluatie: "Evaluatie", afronding: "Afronding" };
const TOON: Record<string, string> = { afwezigheid: "warn", inhaal: "in", rooster: "in", contract: "ok", top3: "mut", aanvraag: "mut", evaluatie: "ok", afronding: "ok" };
const dag = (iso: string) => new Date(iso).toLocaleDateString("nl-BE", { timeZone: "Europe/Brussels", weekday: "long", day: "numeric", month: "long" });
const uur = (iso: string) => new Date(iso).toLocaleTimeString("nl-BE", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit" });

export default async function Meldingen({ searchParams }: { searchParams: Promise<{ soort?: string }> }) {
  const { soort = "" } = await searchParams;
  const { begeleider } = await huidigeGebruiker();
  const sb = await serverClient();
  const tot = begeleider ? await gezienTot(sb, begeleider.id) : null;
  let q = sb.from("meldingen").select("*").order("op", { ascending: false }).limit(300);
  if (soort) q = q.eq("soort", soort);
  const { data, error } = await q;
  const lijst = (data ?? []) as Melding[];
  const nieuw = lijst.filter((m) => tot && m.op > tot).length;
  const perDag = new Map<string, Melding[]>();
  for (const m of lijst) { const k = dag(m.op); perDag.set(k, [...(perDag.get(k) ?? []), m]); }

  return (
    <>
      <header className="bh-top">
        <div>
          <h1>Meldingen</h1>
          <p className="sub">Wat stagiairs en stagegevers deden: afwezigheden, inhaalstage, werkroosters, handtekeningen, top 3 en aanvragen.</p>
        </div>
        {nieuw > 0 && <form action={meldingenGelezen}><button type="submit" className="bh-btn pri">Alles als gelezen markeren ({nieuw})</button></form>}
      </header>
      {error && <p className="bh-melding">De meldingen zijn nog niet ingesteld. Voer de migratie <code>20261028090000_meldingen.sql</code> uit in Supabase.</p>}
      <nav className="bh-seg" aria-label="Soort">
        <Link href="/beheer/meldingen" className={!soort ? "on" : undefined}>Alles</Link>
        {Object.keys(SOORTEN).map((s) => <Link key={s} href={`/beheer/meldingen?soort=${s}`} className={soort === s ? "on" : undefined}>{LABEL[s]}</Link>)}
      </nav>
      {lijst.length === 0 ? (
        <div className="bh-leeg"><b>Nog geen meldingen</b>Zodra een stagiair of stagegever iets meldt, indient of tekent, verschijnt het hier.</div>
      ) : (
        [...perDag.entries()].map(([d, ms]) => (
          <section className="bh-card" key={d}>
            <div className="hd"><h2>{d.charAt(0).toUpperCase() + d.slice(1)}</h2></div>
            <ul className="bh-meldlijst">
              {ms.map((m) => {
                const isNieuw = !!tot && m.op > tot;
                return (
                  <li key={m.id} className={isNieuw ? "nieuw" : undefined}>
                    <span className="u">{uur(m.op)}</span>
                    <span className={`pill ${TOON[m.soort] ?? "mut"}`}>{LABEL[m.soort] ?? m.soort}</span>
                    <span className="t">{m.tekst}{m.door ? <small> · {m.door}</small> : null}</span>
                    {isNieuw && <span className="pill bad">Nieuw</span>}
                    {m.dossier_id && <Link prefetch={false} className="bh-btn sm" href={`/beheer/dossiers/${m.dossier_id}`}>Dossier</Link>}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
