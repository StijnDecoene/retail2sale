import Link from "next/link";
import { serverClient, type Begeleider } from "@/lib/supabase/server";
import { doetMee, schooljaarVan, vandaagIso, volledigeNaam, type Blok, type Dossier, type Leerling } from "@/lib/beheer";
import { schoolActie, stapStatus, type AanvraagRij, type Beoordeling, type ContractStand, type StapStatus, type Top3Rij } from "@/lib/portaal";
import { ROL_LABEL, nodigeRollen, type Rol } from "@/lib/contract";
import { roosterStand, uren, type RoosterRij } from "@/lib/werkrooster";
import { stand, type Afwezigheid, type Inhaal, type Stand } from "@/lib/tijdens";

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
  const contracten = new Map<string, NonNullable<ContractStand>>();
  const roosters = new Map<string, RoosterRij>();
  const tijdens = new Map<string, Stand>();
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
      // Contract: stand van de ondertekening (tabellen bestaan pas na de contractmigratie).
      const [{ data: cs }, { data: ps }] = await Promise.all([
        sb.from("contracten").select("dossier_id, meerderjarig, afgerond_op").in("dossier_id", ids),
        sb.from("contract_partijen").select("dossier_id, rol").in("dossier_id", ids).not("getekend_op", "is", null),
      ]);
      const { data: rs } = await sb.from("roosters").select("dossier_id, status, vorige, totaal_min, ingediend_op").in("dossier_id", ids);
      for (const r of (rs ?? []) as RoosterRij[]) roosters.set(r.dossier_id, r);
      const [{ data: af }, { data: ih }] = await Promise.all([
        sb.from("afwezigheden").select("*").in("dossier_id", ids),
        sb.from("inhaalmomenten").select("*").in("dossier_id", ids),
      ]);
      const afw = (af ?? []) as Afwezigheid[], inh = (ih ?? []) as Inhaal[];
      for (const id of new Set(afw.map((a) => a.dossier_id))) {
        tijdens.set(id, stand({ afwezigheden: afw.filter((a) => a.dossier_id === id), inhaal: inh.filter((i) => i.dossier_id === id).map((i) => ({ ...i, afw: i.afw ?? [] })) }, blok, vandaag));
      }
      for (const c of (cs ?? []) as { dossier_id: string; meerderjarig: boolean; afgerond_op: string | null }[]) {
        contracten.set(c.dossier_id, { meerderjarig: c.meerderjarig, afgerond_op: c.afgerond_op, getekend: ((ps ?? []) as { dossier_id: string; rol: string }[]).filter((p) => p.dossier_id === c.dossier_id).map((p) => p.rol) });
      }
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
      contract: d ? contracten.get(d.id) ?? null : null,
      rooster: d && roosters.has(d.id) ? roosterStand(roosters.get(d.id)!) : null,
    });
    const rooster = d ? roosters.get(d.id) : undefined;
    // Contract in woorden voor de begeleider.
    const c = d ? contracten.get(d.id) : undefined;
    let contract: { toon: string; label: string; titel?: string } | null = null;
    if (st.contract.code === "geregeld") contract = { toon: "ok", label: "Al geregeld" };
    else if (st.aanvraag.state === "done" && !c) contract = { toon: "warn", label: "Nog klaar te zetten" };
    else if (c) {
      const nodig = nodigeRollen(c.meerderjarig);
      const ontbreekt = nodig.filter((r) => !c.getekend.includes(r));
      contract = c.afgerond_op || !ontbreekt.length
        ? { toon: "ok", label: "Ondertekend" }
        : { toon: c.getekend.length ? "in" : "warn", label: `${nodig.length - ontbreekt.length} van ${nodig.length}`, titel: `Nog: ${ontbreekt.map((r: Rol) => ROL_LABEL[r].toLowerCase()).join(", ")}` };
    }
    const top = d ? t3.get(d.id) : undefined;
    const aanv = d ? aa.get(d.id) : undefined;
    const ts = d ? tijdens.get(d.id) : undefined;
    const actie = schoolActie(st) ?? (ts?.teBeoordelen.length ? "afwezig" : null);
    const ingediend = actie === "top3" ? top?.ingediend_op : actie === "aanvraag" ? aanv?.ingediend_op : actie === "rooster" ? rooster?.ingediend_op : null;
    return { l, d, st, actie, ingediend, contract, rooster, ts };
  });

  const tel = {
    actie: rijen.filter((r) => r.actie).length,
    top3: rijen.filter((r) => r.st.top3.state === "action" || r.st.top3.state === "fix").length,
    aanvraag: rijen.filter((r) => r.st.aanvraag.state === "action" || r.st.aanvraag.state === "fix").length,
    klaar: rijen.filter((r) => r.st.aanvraag.state === "done").length,
    contract: rijen.filter((r) => r.contract && r.contract.label !== "Ondertekend" && r.contract.label !== "Al geregeld").length,
    rooster: rijen.filter((r) => r.st.rooster.state === "action" || r.st.rooster.state === "fix").length,
    inhalen: rijen.filter((r) => r.ts && r.ts.rest > 0).length,
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
      if (filter === "inhalen") return !!r.ts && r.ts.rest > 0;
      if (filter === "rooster") return r.st.rooster.state === "action" || r.st.rooster.state === "fix";
      if (filter === "contract") return !!r.contract && r.contract.label !== "Ondertekend" && r.contract.label !== "Al geregeld";
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
          <p className="sub">Top 3, aanvragen, contracten en werkroosters{blok ? ` · ${blok.naam}` : ""}</p>
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
        <Link href={href("contract")} className="bh-kpi"><span className="l">Contract nog niet ondertekend</span><span className="v">{tel.contract}</span></Link>
        <Link href={href("rooster")} className="bh-kpi"><span className="l">Werkrooster nog niet ingediend</span><span className="v">{tel.rooster}</span></Link>
        <Link href={href("inhalen")} className="bh-kpi"><span className="l">Uren nog in te halen</span><span className="v">{tel.inhalen}</span></Link>
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
          <option value="contract">Contract nog niet volledig ondertekend</option>
          <option value="rooster">Werkrooster nog niet ingediend</option>
          <option value="inhalen">Uren nog in te halen</option>
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
              <tr><th>Leerling</th><th>Klas</th><th>Top 3</th><th>Aanvraag</th><th>Contract</th><th>Werkrooster</th><th>Afwezig</th><th>Stageplaats</th><th>Begeleider</th><th></th></tr>
            </thead>
            <tbody>
              {lijst.map(({ l, d, st, actie, contract, rooster, ts }) => {
                const p = d?.stageplaats_id ? plaatsen.get(d.stageplaats_id) : null;
                const g = d?.begeleider_id ? begeleiders.get(d.begeleider_id) : null;
                const open = d ? `/beheer/dossiers/${d.id}` : `/beheer/leerlingen/${l.id}`;
                return (
                  <tr key={l.id}>
                    <td><Link prefetch={false} className="nm" href={open}>{volledigeNaam(l)}</Link></td>
                    <td>{l.klas}</td>
                    <td><span className={`pill ${TOON[st.top3.state]}`}>{st.top3.label}</span></td>
                    <td>{st.aanvraag.state === "locked" ? <span className="sm">–</span> : <span className={`pill ${TOON[st.aanvraag.state]}`}>{st.aanvraag.label}</span>}</td>
                    <td>{contract ? <><span className={`pill ${contract.toon}`}>{contract.label}</span>{contract.titel && <small className="sm bh-ct-nog"> {contract.titel}</small>}</> : <span className="sm">–</span>}</td>
                    <td>{st.rooster.state === "locked" || st.rooster.code === "klaarzetten" ? <span className="sm">–</span> : <span className={`pill ${TOON[st.rooster.state]}`} title={rooster ? `${uren(rooster.totaal_min)} gepland` : undefined}>{st.rooster.label}</span>}</td>
                    <td>{!ts ? <span className="sm">–</span> : ts.teBeoordelen.length ? <span className="pill in">{ts.teBeoordelen.length} te beoordelen</span> : ts.rest ? <span className={`pill ${ts.verstreken ? "bad" : "warn"}`} title={`${uren(ts.ingehaald)} ingehaald, ${uren(ts.gepland)} gepland`}>{ts.verstreken ? "Termijn verstreken" : `nog ${uren(ts.rest)} in te halen`}</span> : <span className="pill ok">{ts.nodig ? "Ingehaald" : "Niets in te halen"}</span>}</td>
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
