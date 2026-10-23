import Link from "next/link";
import { serverClient, type Begeleider } from "@/lib/supabase/server";
import { doetMee, schooljaarVan, vandaagIso, volledigeNaam, type Blok, type Dossier, type Leerling } from "@/lib/beheer";
import { schoolActie, stapStatus, type AanvraagRij, type Beoordeling, type StapStatus, type Top3Rij } from "@/lib/portaal";

export const metadata = { title: "Stagedossiers" };

type Zoek = { blok?: string; filter?: string; klas?: string; q?: string };
const TOON: Record<StapStatus["state"], string> = { done: "ok", wait: "in", action: "mut", fix: "warn", locked: "mut" };

export default async function Dossiers({ searchParams }: { searchParams: Promise<Zoek> }) {
  const { blok: blokId, filter = "", klas = "", q = "" } = await searchParams;
  const sj = schooljaarVan();
  const vandaag = vandaagIso();
  const sb = await serverClient();

  const [lR, bR, pR, gR] = await Promise.all([
    sb.from("leerlingen").select("*").eq("schooljaar", sj).eq("status", "actief").order("klas").order("naam").order("voornaam"),
    sb.from("blokken").select("*").eq("schooljaar", sj).order("start_datum"),
    sb.from("stageplaatsen").select("id, naam, gemeente"),
    sb.from("begeleiders").select("id, naam, kleur"),
  ]);
  const blokken = (bR.data ?? []) as Blok[];
  const blok = blokken.find((b) => b.id === blokId) ?? blokken.find((b) => b.eind_datum >= vandaag) ?? blokken.at(-1);
  const leerlingen = ((lR.data ?? []) as Leerling[]).filter((l) => doetMee(blok, l.klas));
  const plaatsen = new Map(((pR.data ?? []) as { id: string; naam: string; gemeente: string | null }[]).map((p) => [p.id, p]));
  const begeleiders = new Map(((gR.data ?? []) as Pick<Begeleider, "id" | "naam" | "kleur">[]).map((g) => [g.id, g]));

  let dossiers: Dossier[] = [];
  let top3: Top3Rij[] = [], aanvragen: AanvraagRij[] = [], beoordelingen: Beoordeling[] = [];
  if (blok) {
    const { data } = await sb.from("dossiers").select("*").eq("blok_id", blok.id);
    dossiers = (data ?? []) as Dossier[];
    const ids = dossiers.map((d) => d.id);
    if (ids.length) {
      const [t, a, o] = await Promise.all([
        sb.from("top3").select("dossier_id, status, ingediend_op, keuzes").in("dossier_id", ids),
        sb.from("aanvragen").select("dossier_id, status, ingediend_op, keuze_nr").in("dossier_id", ids),
        sb.from("beoordelingen").select("*").in("dossier_id", ids),
      ]);
      top3 = (t.data ?? []) as Top3Rij[];
      aanvragen = (a.data ?? []) as AanvraagRij[];
      beoordelingen = (o.data ?? []) as Beoordeling[];
    }
  }
  const perLeerling = new Map(dossiers.map((d) => [d.leerling_id, d]));
  const t3 = new Map(top3.map((t) => [t.dossier_id, t]));
  const aa = new Map(aanvragen.map((a) => [a.dossier_id, a]));

  const rijen = leerlingen.map((l) => {
    const d = perLeerling.get(l.id);
    const st = stapStatus({
      stageplaats_id: d?.stageplaats_id ?? null,
      top3: d ? t3.get(d.id) ?? null : null,
      aanvraag: d ? aa.get(d.id) ?? null : null,
      beoordelingen: d ? beoordelingen.filter((b) => b.dossier_id === d.id) : [],
    });
    const top = d ? t3.get(d.id) : undefined;
    const aanv = d ? aa.get(d.id) : undefined;
    const ingediend = schoolActie(st) === "top3" ? top?.ingediend_op : schoolActie(st) === "aanvraag" ? aanv?.ingediend_op : null;
    return { l, d, st, actie: schoolActie(st), ingediend };
  });

  const tel = {
    actie: rijen.filter((r) => r.actie).length,
    top3: rijen.filter((r) => r.st.top3.state === "action" || r.st.top3.state === "fix").length,
    aanvraag: rijen.filter((r) => r.st.aanvraag.state === "action" || r.st.aanvraag.state === "fix").length,
    klaar: rijen.filter((r) => r.st.aanvraag.state === "done").length,
  };
  const zoek = q.trim().toLowerCase();
  const lijst = rijen
    .filter((r) => {
      if (klas && r.l.klas !== klas) return false;
      if (zoek && !volledigeNaam(r.l).toLowerCase().includes(zoek)) return false;
      if (filter === "actie") return !!r.actie;
      if (filter === "top3") return r.st.top3.state === "action" || r.st.top3.state === "fix";
      if (filter === "aanvraag") return r.st.aanvraag.state === "action" || r.st.aanvraag.state === "fix";
      if (filter === "klaar") return r.st.aanvraag.state === "done";
      return true;
    })
    // Wat op de school wacht eerst, oudste eerst.
    .sort((a, b) => (a.actie ? 0 : 1) - (b.actie ? 0 : 1) || String(a.ingediend ?? "").localeCompare(String(b.ingediend ?? "")));
  const href = (f: string) => `/beheer/dossiers?${new URLSearchParams({ ...(blok ? { blok: blok.id } : {}), ...(f ? { filter: f } : {}), ...(klas ? { klas } : {}) })}`;
  const klassen = [...new Set(leerlingen.map((l) => l.klas))].sort();

  return (
    <>
      <header className="bh-top">
        <div>
          <h1>Stagedossiers</h1>
          <p className="sub">Top 3 en aanvragen van de leerlingen{blok ? ` · ${blok.naam}` : ""}</p>
        </div>
        {blokken.length > 1 && (
          <nav className="bh-seg" aria-label="Blokstage">
            {blokken.map((b) => <Link key={b.id} href={`/beheer/dossiers?blok=${b.id}`} className={b.id === blok?.id ? "on" : undefined}>{b.naam}</Link>)}
          </nav>
        )}
      </header>

      <div className="bh-kpis">
        <Link href={href("actie")} className={`bh-kpi${tel.actie ? " hot" : ""}`}><span className="l">Na te kijken</span><span className="v">{tel.actie}</span></Link>
        <Link href={href("top3")} className="bh-kpi"><span className="l">Top 3 nog niet ingediend</span><span className="v">{tel.top3}</span></Link>
        <Link href={href("aanvraag")} className="bh-kpi"><span className="l">Aanvraag nog niet ingediend</span><span className="v">{tel.aanvraag}</span></Link>
        <Link href={href("klaar")} className="bh-kpi"><span className="l">Stageplaats rond</span><span className="v">{tel.klaar}<small> / {rijen.length}</small></span></Link>
      </div>

      <form className="bh-toolbar" method="get">
        {blok && <input type="hidden" name="blok" value={blok.id} />}
        <input type="search" name="q" defaultValue={q} placeholder="Zoek een leerling" aria-label="Zoeken" />
        <select name="klas" defaultValue={klas} aria-label="Klas">
          <option value="">Alle klassen</option>
          {klassen.map((k) => <option key={k}>{k}</option>)}
        </select>
        <select name="filter" defaultValue={filter} aria-label="Filter">
          <option value="">Iedereen</option>
          <option value="actie">Na te kijken</option>
          <option value="top3">Top 3 nog niet ingediend</option>
          <option value="aanvraag">Aanvraag nog niet ingediend</option>
          <option value="klaar">Stageplaats rond</option>
        </select>
        <button className="bh-btn" type="submit">Toon</button>
        {(q || klas || filter) && <Link href={href("")} className="bh-link">Wis filters</Link>}
      </form>

      <div className="bh-tw">
        {lijst.length === 0 ? (
          <div className="bh-leeg"><b>Geen dossiers gevonden</b>{blok ? "Pas de filters aan." : "Er is nog geen blokstage. Voeg ze toe bij Instellingen."}</div>
        ) : (
          <table className="bh-tabel">
            <thead>
              <tr><th>Leerling</th><th>Klas</th><th>Top 3</th><th>Aanvraag</th><th>Stageplaats</th><th>Begeleider</th><th></th></tr>
            </thead>
            <tbody>
              {lijst.map(({ l, d, st, actie }) => {
                const p = d?.stageplaats_id ? plaatsen.get(d.stageplaats_id) : null;
                const g = d?.begeleider_id ? begeleiders.get(d.begeleider_id) : null;
                const open = d ? `/beheer/dossiers/${d.id}` : `/beheer/leerlingen/${l.id}`;
                return (
                  <tr key={l.id}>
                    <td><Link prefetch={false} className="nm" href={open}>{volledigeNaam(l)}</Link></td>
                    <td>{l.klas}</td>
                    <td><span className={`pill ${TOON[st.top3.state]}`}>{st.top3.label}</span></td>
                    <td>{st.aanvraag.state === "locked" ? <span className="sm">–</span> : <span className={`pill ${TOON[st.aanvraag.state]}`}>{st.aanvraag.label}</span>}</td>
                    <td>{p ? <>{p.naam}{p.gemeente ? <small className="sm"> · {p.gemeente}</small> : null}</> : <span className="sm">–</span>}</td>
                    <td>{g ? <span className="beg" style={{ background: g.kleur ?? "#1D5BAA" }}>{g.naam}</span> : <span className="sm">–</span>}</td>
                    <td>{actie && d ? <Link prefetch={false} className="bh-btn sm pri" href={open}>Nakijken</Link> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
