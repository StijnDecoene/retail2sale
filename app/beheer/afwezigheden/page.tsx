import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { schooljaarVan, vandaagIso, volledigeNaam, type Blok, type Dossier, type Leerling } from "@/lib/beheer";
import { tijdensVoorDossiers } from "@/lib/tijdens-beheer";
import { afwLabel, standTekst, type Inhaal, type Stand } from "@/lib/tijdens";
import { dagKort, tijdKort, uren } from "@/lib/werkrooster";
import WettigKeuze from "@/components/beheer/WettigKeuze";

export const metadata = { title: "Afwezigheden" };

type Zoek = { blok?: string; toon?: string };
const TOON: Record<string, string> = {
  beoordelen: "Afwezigheden te beoordelen",
  los: "Inhaalstage niet gekoppeld",
  bevestigen: "Wacht op bevestiging van de stagegever",
  open: "Uren nog in te halen",
  verstreken: "Termijn verstreken",
};

function inhaalStatus(i: Inhaal, st: Stand | undefined, vandaag: string) {
  if (i.status === "ingehaald") return { c: "ok", t: "Ingehaald" };
  if (i.status === "geannuleerd") return { c: "mut", t: "Niet doorgegaan" };
  if (!i.afw.length || (st && !i.afw.some((id) => st.per.has(id)))) return { c: "warn", t: "Niet gekoppeld" };
  if (st?.nietNodig.some((x) => x.id === i.id)) return { c: "warn", t: "Niet meer nodig" };
  if (i.datum <= vandaag) return { c: "in", t: "Wacht op bevestiging" };
  return { c: "in", t: "Gepland" };
}

export default async function Afwezigheden({ searchParams }: { searchParams: Promise<Zoek> }) {
  const { blok: blokId, toon = "" } = await searchParams;
  const sj = schooljaarVan();
  const vandaag = vandaagIso();
  const sb = await serverClient();
  const { data: bData } = await sb.from("blokken").select("*").eq("schooljaar", sj).order("start_datum");
  const blokken = (bData ?? []) as Blok[];
  const blok = blokken.find((b) => b.id === blokId) ?? blokken.find((b) => b.start_datum <= vandaag && vandaag <= b.eind_datum) ?? blokken.find((b) => b.eind_datum >= vandaag) ?? blokken.at(-1);

  const { data: dData } = blok ? await sb.from("dossiers").select("*").eq("blok_id", blok.id) : { data: [] };
  const dossiers = (dData ?? []) as Dossier[];
  const { per, afw, inhaal } = blok ? await tijdensVoorDossiers(sb, dossiers.map((d) => d.id), blok, vandaag) : { per: new Map<string, Stand>(), afw: [], inhaal: [] };
  const lIds = [...new Set(dossiers.filter((d) => per.has(d.id)).map((d) => d.leerling_id))];
  const { data: lData } = lIds.length ? await sb.from("leerlingen").select("*").in("id", lIds) : { data: [] };
  const leerlingen = new Map(((lData ?? []) as Leerling[]).map((l) => [l.id, l]));
  const dossierVan = new Map(dossiers.map((d) => [d.id, d]));
  const wie = (dossierId: string) => {
    const d = dossierVan.get(dossierId);
    const l = d ? leerlingen.get(d.leerling_id) : undefined;
    return { l, href: `/beheer/dossiers/${dossierId}` };
  };
  const naamVan = (dossierId: string) => { const l = wie(dossierId).l; return l ? volledigeNaam(l) : "?"; };

  const standen = [...per.entries()];
  const tel = {
    beoordelen: afw.filter((a) => a.gewettigd === null).length,
    los: inhaal.filter((i) => inhaalStatus(i, per.get(i.dossier_id), vandaag).t === "Niet gekoppeld").length,
    bevestigen: inhaal.filter((i) => inhaalStatus(i, per.get(i.dossier_id), vandaag).t === "Wacht op bevestiging").length,
    open: standen.filter(([, s]) => s.rest > 0).length,
    verstreken: standen.filter(([, s]) => s.verstreken).length,
  };
  const afwLijst = afw.filter((a) => (toon === "beoordelen" ? a.gewettigd === null : !toon || toon === "open" || toon === "verstreken"));
  const inhaalLijst = inhaal.filter((i) => {
    const t = inhaalStatus(i, per.get(i.dossier_id), vandaag).t;
    if (toon === "los") return t === "Niet gekoppeld";
    if (toon === "bevestigen") return t === "Wacht op bevestiging";
    return !toon || toon === "open" || toon === "verstreken";
  });
  const leerlingLijst = standen
    .filter(([, s]) => (toon === "open" ? s.rest > 0 : toon === "verstreken" ? s.verstreken : !toon))
    .sort((a, b) => b[1].rest - a[1].rest || naamVan(a[0]).localeCompare(naamVan(b[0])));
  const href = (t: string) => `/beheer/afwezigheden?${new URLSearchParams({ ...(blok ? { blok: blok.id } : {}), ...(t ? { toon: t } : {}) })}`;

  return (
    <>
      <header className="bh-top">
        <div>
          <h1>Afwezigheden en inhaalstage</h1>
          <p className="sub">{blok ? `${blok.naam} · inhalen kan tot 14 dagen na de laatste stagedag` : "Nog geen blokstage"}{toon ? ` · ${TOON[toon] ?? ""}` : ""}</p>
        </div>
        {blokken.length > 1 && (
          <nav className="bh-seg" aria-label="Blokstage">
            {blokken.map((b) => <Link key={b.id} href={`/beheer/afwezigheden?blok=${b.id}`} className={b.id === blok?.id ? "on" : undefined}>{b.naam}</Link>)}
          </nav>
        )}
      </header>

      <div className="bh-kpis">
        <Link href={href("beoordelen")} className={`bh-kpi${tel.beoordelen ? " hot" : ""}`}><span className="l">Afwezigheden te beoordelen</span><span className="v">{tel.beoordelen}</span></Link>
        <Link href={href("los")} className={`bh-kpi${tel.los ? " hot" : ""}`}><span className="l">Inhaalstage niet gekoppeld</span><span className="v">{tel.los}</span></Link>
        <Link href={href("bevestigen")} className="bh-kpi"><span className="l">Wacht op bevestiging stagegever</span><span className="v">{tel.bevestigen}</span></Link>
        <Link href={href("open")} className="bh-kpi"><span className="l">Leerlingen met uren in te halen</span><span className="v">{tel.open}</span></Link>
        <Link href={href("verstreken")} className={`bh-kpi${tel.verstreken ? " hot" : ""}`}><span className="l">Termijn verstreken</span><span className="v">{tel.verstreken}</span></Link>
      </div>
      {toon && <p><Link href={href("")} className="bh-link">← Alles tonen</Link></p>}

      {per.size === 0 ? (
        <div className="bh-leeg"><b>Nog geen afwezigheden gemeld</b>Stagiair en stagegever melden afwezigheden in het portaal of via de persoonlijke link. Ze verschijnen hier zodra het contract van de leerling in het platform staat.</div>
      ) : (
        <>
          {(!toon || ["beoordelen", "open", "verstreken"].includes(toon)) && (
            <section className="bh-card">
              <div className="hd"><h2>Afwezigheden</h2><span className="sm">{afwLijst.length}</span></div>
              {afwLijst.length === 0 ? <p className="bh-leeg">Niets te tonen.</p> : (
                <div className="bh-tw"><table className="bh-tabel">
                  <thead><tr><th>Leerling</th><th>Datum</th><th>Afwezig</th><th className="r">Gemist</th><th>Reden</th><th>Gemeld door</th><th>Gewettigd?</th><th>Inhalen</th></tr></thead>
                  <tbody>
                    {afwLijst.map((a) => {
                      const { l, href: h } = wie(a.dossier_id);
                      const s = per.get(a.dossier_id)?.per.get(a.id);
                      return (
                        <tr key={a.id}>
                          <td><Link prefetch={false} className="nm" href={h}>{l ? volledigeNaam(l) : "?"}</Link>{l && <small className="sm"> · {l.klas}</small>}</td>
                          <td>{dagKort(a.datum)}</td>
                          <td>{a.soort === "hele" ? "hele dag" : `deel${a.aan ? ` (vanaf ${tijdKort(a.aan)})` : ""}${a.ver ? ` (tot ${tijdKort(a.ver)})` : ""}`}</td>
                          <td className="r">{uren(a.gemist_min)}</td>
                          <td>{a.reden}{a.opm ? <small className="sm"> · {a.opm}</small> : null}</td>
                          <td><small className="sm">{a.naam || a.door} ({a.door})</small></td>
                          <td><WettigKeuze dossierId={a.dossier_id} id={a.id} waarde={a.gewettigd} /></td>
                          <td>{s ? <span className={`pill ${s.open ? "warn" : "ok"}`}>{afwLabel(s)}</span> : null}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
              )}
            </section>
          )}

          {(!toon || ["los", "bevestigen", "open", "verstreken"].includes(toon)) && (
            <section className="bh-card">
              <div className="hd"><h2>Inhaalstage</h2><span className="sm">{inhaalLijst.length}</span></div>
              {inhaalLijst.length === 0 ? <p className="bh-leeg">Niets te tonen.</p> : (
                <div className="bh-tw"><table className="bh-tabel">
                  <thead><tr><th>Leerling</th><th>Datum</th><th>Uren</th><th>Haalt in</th><th>Gepland door</th><th>Status</th></tr></thead>
                  <tbody>
                    {inhaalLijst.map((i) => {
                      const { l, href: h } = wie(i.dossier_id);
                      const st = inhaalStatus(i, per.get(i.dossier_id), vandaag);
                      const b = i.status === "ingehaald" && i.bev ? i.bev : i;
                      return (
                        <tr key={i.id}>
                          <td><Link prefetch={false} className="nm" href={h}>{l ? volledigeNaam(l) : "?"}</Link>{l && <small className="sm"> · {l.klas}</small>}</td>
                          <td>{dagKort(i.datum)}</td>
                          <td>{tijdKort(b.aan)}–{tijdKort(b.ver)} · <b>{uren(b.min)}</b></td>
                          <td>{i.afw.length ? i.afw.map((id) => afw.find((a) => a.id === id)).filter(Boolean).map((a) => dagKort(a!.datum)).join(", ") : "–"}</td>
                          <td><small className="sm">{i.naam || i.door}{i.bev ? ` · bevestigd door ${i.bev.naam}` : ""}</small></td>
                          <td><span className={`pill ${st.c}`}>{st.t}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
              )}
            </section>
          )}

          {(!toon || toon === "open" || toon === "verstreken") && (
            <section className="bh-card">
              <div className="hd"><h2>Per leerling</h2><span className="sm">{leerlingLijst.length}</span></div>
              {leerlingLijst.length === 0 ? <p className="bh-leeg">Niets te tonen.</p> : (
                <div className="bh-tw"><table className="bh-tabel">
                  <thead><tr><th>Leerling</th><th>Klas</th><th className="r">In te halen</th><th className="r">Ingehaald</th><th className="r">Gepland</th><th className="r">Nog in te plannen</th><th>Stand</th></tr></thead>
                  <tbody>
                    {leerlingLijst.map(([id, s]) => {
                      const { l, href: h } = wie(id);
                      return (
                        <tr key={id}>
                          <td><Link prefetch={false} className="nm" href={h}>{l ? volledigeNaam(l) : "?"}</Link></td>
                          <td>{l?.klas}</td>
                          <td className="r">{uren(s.nodig)}</td>
                          <td className="r">{uren(s.ingehaald)}</td>
                          <td className="r">{uren(s.gepland)}</td>
                          <td className="r">{s.open ? <b>{uren(s.open)}</b> : uren(0)}</td>
                          <td>
                            {s.verstreken ? <span className="pill bad">Termijn verstreken</span>
                              : s.teBeoordelen.length ? <span className="pill in">{s.teBeoordelen.length} te beoordelen</span>
                              : s.rest ? <span className="pill warn">{standTekst(s).split(" · ").slice(-1)[0]}</span>
                              : <span className="pill ok">{s.nodig ? "Alles ingehaald" : "Niets in te halen"}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
