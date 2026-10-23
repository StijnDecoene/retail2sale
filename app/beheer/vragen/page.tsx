import Link from "next/link";
import { ActieKnop } from "@/components/beheer/Formulier";
import { vraagBijwerken } from "../acties";
import { serverClient } from "@/lib/supabase/server";
import { tijdstip, type Vraag } from "@/lib/beheer";

export const metadata = { title: "Vragen" };

const STATUS: Record<Vraag["status"], string> = { nieuw: "Nieuw", "in behandeling": "In behandeling", beantwoord: "Beantwoord" };
const TOON: Record<Vraag["status"], string> = { nieuw: "bad", "in behandeling": "in", beantwoord: "ok" };
const ROL: Record<string, string> = { stagegever: "Stagegever", ouder: "Ouder", leerling: "Leerling", andere: "Andere" };

export default async function Vragen({ searchParams }: { searchParams: Promise<{ toon?: string }> }) {
  const { toon = "open" } = await searchParams;
  const sb = await serverClient("public");
  let query = sb.from("vragen").select("*").order("aangemaakt_op", { ascending: false }).limit(200);
  if (toon === "open") query = query.neq("status", "beantwoord");
  const { data, error } = await query;
  const vragen = (data ?? []) as Vraag[];

  return (
    <>
      <header className="bh-top">
        <div>
          <h1>Vragen</h1>
          <p className="sub">Uit het formulier &ldquo;Stel ons een vraag&rdquo; op de website</p>
        </div>
        <div className="bh-seg" role="group" aria-label="Toon">
          <Link href="/beheer/vragen" className={toon === "open" ? "on" : undefined}>Open</Link>
          <Link href="/beheer/vragen?toon=alle" className={toon === "alle" ? "on" : undefined}>Alle</Link>
        </div>
      </header>

      {error && <p className="bh-melding">De vragen konden niet geladen worden.</p>}
      {!error && vragen.length === 0 && (
        <div className="bh-tw"><div className="bh-leeg"><b>Geen {toon === "open" ? "open " : ""}vragen</b>Nieuwe vragen van de website verschijnen hier.</div></div>
      )}

      <div className="bh-stack">
        {vragen.map((v) => (
          <article className="bh-card bh-vraag" key={v.id}>
            <div className="hd">
              <div>
                <h2>{v.onderwerp ?? "Vraag"}</h2>
                <span className="sm">
                  {ROL[v.rol] ?? v.rol} · {tijdstip(v.aangemaakt_op)}
                  {v.behandeld_door ? ` · opgevolgd door ${v.behandeld_door}` : ""}
                </span>
              </div>
              <span className={`pill ${TOON[v.status]}`}>{STATUS[v.status]}</span>
            </div>
            <div className="bd">
              <p className="bh-vraagtekst">{v.vraag}</p>
              <dl className="bh-meta">
                <dt>Van</dt><dd>{v.naam}{v.organisatie ? ` · ${v.organisatie}` : ""}</dd>
                <dt>E-mail</dt><dd><a href={`mailto:${v.email}?subject=${encodeURIComponent(`Re: ${v.onderwerp ?? "je vraag"}`)}`}>{v.email}</a></dd>
                {v.telefoon && (<><dt>Telefoon</dt><dd><a href={`tel:${v.telefoon}`}>{v.telefoon}</a></dd></>)}
                {(v.leerling || v.klas) && (<><dt>Leerling / klas</dt><dd>{[v.leerling, v.klas].filter(Boolean).join(" · ")}</dd></>)}
                <dt>Antwoord via</dt><dd>{v.antwoord_via}</dd>
              </dl>
              <form action={vraagBijwerken} className="bh-vraagform">
                <input type="hidden" name="id" value={v.id} />
                <label className="f">Notitie
                  <input name="notitie" defaultValue={v.notitie ?? ""} placeholder="bv. teruggebeld op 24/10" />
                </label>
                <label className="f">Status
                  <select name="status" defaultValue={v.status}>
                    {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </label>
                <ActieKnop className="bh-btn pri">Bewaren</ActieKnop>
              </form>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
