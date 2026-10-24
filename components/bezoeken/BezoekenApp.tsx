"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Kaart from "./Kaart";
import { Melding, kaartLagen, lijstVan, routeVan, useActie } from "./gedeeld";
import { beschikbaarheidBewaren, bezoekBewaren, instellingenBewaren, liggingBewaren, liggingZoeken, routesBewaren } from "@/app/beheer/bezoeken/acties";
import {
  DEEL, DEEL_KORT, aanwezigheid, bezoekDagen, datumKort, datumTekst, invoegen, isVrij, maandag, minTekst, naamVan, plaatsAdres, punt, routeKleur, routeStats,
  stelRoutesVoor, wd, type BezoekData, type BLln, type Deel, type Route,
} from "@/lib/bezoeken";

type Tab = "routes" | "leerlingen" | "kalender" | "instellingen";
const TABS: [Tab, string][] = [["routes", "Routes"], ["leerlingen", "Leerlingen"], ["kalender", "Kalender"], ["instellingen", "Instellingen"]];

export default function BezoekenApp({ d, tab, blokken }: { d: BezoekData; tab: Tab; blokken: { id: string; naam: string }[] }) {
  const lln = useMemo(() => lijstVan(d), [d]);
  const rv = useMemo(() => routeVan(d), [d]);
  const [wie, setWie] = useState<string>("");
  useEffect(() => { try { setWie(localStorage.getItem("bz-wie") ?? ""); } catch { /* geen opslag */ } }, []);
  const kiesWie = (v: string) => { setWie(v); try { localStorage.setItem("bz-wie", v); } catch { /* geen opslag */ } };
  const act = useActie();
  const routes = d.routes.filter((r) => !wie || r.begeleider_id === wie);
  const href = (t: Tab) => `/beheer/bezoeken?blok=${d.blok.id}&tab=${t}`;

  return (
    <>
      <header className="bh-top">
        <div>
          <h1>Stagebezoeken</h1>
          <p className="sub">{d.blok.naam} · bezoeken van {datumTekst(d.instellingen.start_datum)} tot {datumTekst(d.instellingen.eind_datum)} · dinsdag tot vrijdag</p>
        </div>
        <div className="bz-kop-rechts">
          {blokken.length > 1 && (
            <nav className="bh-seg" aria-label="Blokstage">{blokken.map((b) => <Link key={b.id} href={`/beheer/bezoeken?blok=${b.id}&tab=${tab}`} className={b.id === d.blok.id ? "on" : undefined}>{b.naam}</Link>)}</nav>
          )}
          <div className="bh-seg" role="group" aria-label="Begeleider">
            <button type="button" className={!wie ? "on" : ""} onClick={() => kiesWie("")}>Iedereen</button>
            {d.begeleiders.map((g) => <button key={g.id} type="button" className={wie === g.id ? "on" : ""} onClick={() => kiesWie(g.id)}>{g.naam.split(" ")[0]}</button>)}
          </div>
        </div>
      </header>

      <div className="bz-meters">
        {d.begeleiders.map((g) => {
          const ids = d.routes.filter((r) => r.begeleider_id === g.id).flatMap((r) => r.volgorde).filter((id) => lln.has(id));
          const v = ids.filter((id) => lln.get(id)!.bezoek?.bezocht_op).length, e = ids.filter((id) => lln.get(id)!.bezoek?.evaluatie).length;
          return (
            <div key={g.id} className="bz-meter">
              <b>{g.naam.split(" ")[0]}</b>
              <span className="bz-balk"><i style={{ width: `${ids.length ? (v / ids.length) * 100 : 0}%` }} /></span>
              <small>{v}/{ids.length} bezocht · {e} evaluaties · {d.routes.filter((r) => r.begeleider_id === g.id).length} routes</small>
            </div>
          );
        })}
      </div>

      <nav className="bz-tabs" role="tablist">
        {TABS.map(([k, l]) => <Link key={k} href={href(k)} role="tab" aria-selected={tab === k} className={tab === k ? "on" : undefined}>{l}</Link>)}
      </nav>

      {tab === "routes" && <Routes d={d} lln={lln} routes={routes} act={act} />}
      {tab === "leerlingen" && <Leerlingen d={d} lln={lln} rv={rv} wie={wie} act={act} />}
      {tab === "kalender" && <Kalender d={d} lln={lln} routes={routes} act={act} />}
      {tab === "instellingen" && <Instellingen d={d} act={act} />}
      <Melding m={act.melding} />
    </>
  );
}

type Act = ReturnType<typeof useActie>;

// ---------------------------------------------------------------------------
// Routes: kaart en lijst
// ---------------------------------------------------------------------------
function Routes({ d, lln, routes, act }: { d: BezoekData; lln: Map<string, BLln>; routes: Route[]; act: Act }) {
  const [hl, setHl] = useState<string | null>(null);
  const lagen = kaartLagen(d, lln, { routes, uitgelicht: hl, losse: true });
  const inRoute = new Set(d.routes.flatMap((r) => r.volgorde));
  const los = d.leerlingen.filter((l) => !inRoute.has(l.dossier_id) && !l.bezoek?.niet_plannen);
  const zonderLigging = d.leerlingen.filter((l) => l.plaats && !punt(l));
  const geenPlaats = d.leerlingen.filter((l) => !l.plaats);
  const voorstel = () => {
    const nieuw = stelRoutesVoor(d, lln);
    if (!nieuw.length) return;
    act.doe(() => routesBewaren(d.blok.id, nieuw));
  };
  const toevoegen = (id: string, rid: string) => {
    if (rid === "nieuw") return act.doe(() => routesBewaren(d.blok.id, [{ naam: lln.get(id)?.plaats?.gemeente ?? "Nieuwe route", volgorde: [id] }]));
    const r = d.routes.find((x) => x.id === rid);
    if (r) act.doe(() => routesBewaren(d.blok.id, [{ id: r.id, volgorde: invoegen(r.volgorde, id, lln, d.instellingen.vertrek) }]));
  };
  return (
    <>
      {zonderLigging.length > 0 && (
        <div className="bh-melding bz-rij">
          <span>{zonderLigging.length} {zonderLigging.length === 1 ? "stageplaats staat" : "stageplaatsen staan"} nog niet op de kaart.</span>
          <button type="button" className="bh-btn sm" disabled={act.bezig} onClick={() => act.doe(() => liggingZoeken([...new Set(zonderLigging.map((l) => l.plaats!.id))]))}>
            {act.bezig ? "Bezig met zoeken…" : "Ligging zoeken op adres"}
          </button>
        </div>
      )}
      <div className="bz-ov">
        <div className="bz-kaartvak"><Kaart vertrek={d.instellingen.vertrek} markers={lagen.markers} lijnen={lagen.lijnen} hoogte={560} /></div>
        <div className="bz-rlijst">
          {routes.length === 0 && <p className="bh-leeg">Nog geen routes. Gebruik <b>Routes voorstellen</b> hieronder.</p>}
          {routes.map((r) => {
            const st = routeStats(r.volgorde, lln, d.instellingen.vertrek);
            const g = d.begeleiders.find((x) => x.id === r.begeleider_id);
            const v = r.volgorde.filter((id) => lln.get(id)?.bezoek?.bezocht_op).length;
            const a = r.datum ? aanwezigheid(r.volgorde, lln, r.datum, r.dagdeel) : null;
            return (
              <Link key={r.id} href={`/beheer/bezoeken/route/${r.id}`} className="bz-rrij" onMouseEnter={() => setHl(r.id)} onMouseLeave={() => setHl(null)} onFocus={() => setHl(r.id)} onBlur={() => setHl(null)}>
                <span className="bz-badge" style={{ background: routeKleur(r) }}>{r.nr}</span>
                <span className="t">
                  <b>{r.naam || `Route ${r.nr}`}</b>
                  <small>{g?.naam.split(" ")[0] ?? "Geen begeleider"} · {r.volgorde.length} lln · {Math.round(st.km)} km · {minTekst(st.dagMin)}–{minTekst(st.dagMax)}</small>
                </span>
                <span className="z">
                  <span className={`bz-datum${r.datum ? "" : " geen"}`}>{r.datum ? `${datumTekst(r.datum)}${r.dagdeel !== "dag" ? ` ${DEEL_KORT[r.dagdeel]}` : ""}` : "geen datum"}</span>
                  {a && a.nee > 0 && <span className="pill bad">{a.nee} werk{a.nee > 1 ? "en" : "t"} niet</span>}
                  {v > 0 && <span className="pill ok">{v}/{r.volgorde.length} bezocht</span>}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <section className="bh-card">
        <div className="hd">
          <h2>Nog niet in een route <small className="sm">{los.length}</small></h2>
          {los.length > 0 && <button type="button" className="bh-btn pri" disabled={act.bezig} onClick={voorstel}>Routes voorstellen</button>}
        </div>
        {los.length === 0 ? <p className="bh-leeg">Alle leerlingen zitten in een route.</p> : (
          <div className="bz-los">
            {los.map((l) => (
              <div key={l.dossier_id} className="bz-loskaart">
                <b>{naamVan(l)} <small>{l.klas}</small></b>
                <small>{l.plaats ? `${l.plaats.naam} · ${l.plaats.gemeente ?? ""}` : "Nog geen stageplaats"}{l.plaats && !punt(l) ? " · niet op de kaart" : ""}</small>
                <select aria-label="Toevoegen aan route" value="" onChange={(e) => e.target.value && toevoegen(l.dossier_id, e.target.value)}>
                  <option value="">Toevoegen aan route…</option>
                  {d.routes.map((r) => <option key={r.id} value={r.id}>{r.nr}. {r.naam}</option>)}
                  <option value="nieuw">+ Nieuwe route</option>
                </select>
              </div>
            ))}
          </div>
        )}
        {geenPlaats.length > 0 && <p className="sm bd">Zonder stageplaats: {geenPlaats.map(naamVan).join(", ")}. Koppel eerst een stageplaats in de fiche.</p>}
        <p className="sm bd">Een voorstel verdeelt de leerlingen zonder route volgens de richting vanaf de school, in routes van maximaal {d.instellingen.max_per_route} leerlingen, om beurt voor de begeleider met de minste leerlingen. Bestaande routes blijven ongewijzigd.</p>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Leerlingen: per route, bezoek afvinken
// ---------------------------------------------------------------------------
function Leerlingen({ d, lln, rv, wie, act }: { d: BezoekData; lln: Map<string, BLln>; rv: Map<string, Route>; wie: string; act: Act }) {
  const [q, setQ] = useState("");
  const [kaartVoor, setKaartVoor] = useState<BLln | null>(null);
  const zoek = q.trim().toLowerCase();
  const groepen: { r: Route | null; lijst: BLln[] }[] = [
    ...d.routes.filter((r) => !wie || r.begeleider_id === wie).map((r) => ({ r, lijst: r.volgorde.map((id) => lln.get(id)).filter((l): l is BLln => !!l) })),
    ...(wie ? [] : [{ r: null, lijst: d.leerlingen.filter((l) => !rv.has(l.dossier_id)) }]),
  ].map((g) => ({ ...g, lijst: g.lijst.filter((l) => !zoek || `${naamVan(l)} ${l.klas} ${l.plaats?.naam ?? ""} ${l.plaats?.gemeente ?? ""}`.toLowerCase().includes(zoek)) }))
    .filter((g) => g.lijst.length);
  const verplaats = (l: BLln, naar: string) => {
    const van = rv.get(l.dossier_id);
    const wijz: { id: string; volgorde: string[] }[] = [];
    if (van) wijz.push({ id: van.id, volgorde: van.volgorde.filter((x) => x !== l.dossier_id) });
    const doel = d.routes.find((r) => r.id === naar);
    if (doel) wijz.push({ id: doel.id, volgorde: invoegen(doel.volgorde.filter((x) => x !== l.dossier_id), l.dossier_id, lln, d.instellingen.vertrek) });
    act.doe(() => routesBewaren(d.blok.id, wijz));
  };
  return (
    <>
      <div className="bh-toolbar">
        <input type="search" placeholder="Zoek een leerling, winkel of gemeente" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Zoeken" />
      </div>
      {groepen.map(({ r, lijst }) => (
        <section key={r?.id ?? "geen"} className="bh-card">
          <div className="hd bz-ghd" style={r ? { background: routeKleur(r), color: "#fff" } : undefined}>
            <h2>{r ? `${r.nr}. ${r.naam}` : "Nog niet in een route"}</h2>
            {r && <span>{d.begeleiders.find((g) => g.id === r.begeleider_id)?.naam.split(" ")[0] ?? ""} · {r.datum ? `${datumTekst(r.datum)} ${DEEL_KORT[r.dagdeel]}` : "geen datum"}</span>}
            {r && <Link className="bh-btn sm" href={`/beheer/bezoeken/route/${r.id}`}>Route openen</Link>}
          </div>
          {lijst.map((l) => <LlnRij key={l.dossier_id} l={l} d={d} r={r} act={act} onKaart={() => setKaartVoor(l)} onVerplaats={(x) => verplaats(l, x)} />)}
        </section>
      ))}
      {kaartVoor && <LiggingKiezer l={kaartVoor} d={d} act={act} sluit={() => setKaartVoor(null)} />}
    </>
  );
}

export function BezoekVinkjes({ l, act, datumVoorstel }: { l: BLln; act: Act; datumVoorstel: string }) {
  const b = l.bezoek;
  const [eerste, setEerste] = useState(false);
  return (
    <span className="bz-vinkjes">
      <button type="button" className={`bz-pil${b?.bezocht_op ? " on" : ""}`} disabled={act.bezig} title={b?.bezocht_op ? "Klik om het bezoek te schrappen" : "Bezoek gedaan"}
        onClick={() => act.doe(() => bezoekBewaren(l.dossier_id, { bezocht_op: b?.bezocht_op ? null : datumVoorstel }))}>
        {b?.bezocht_op ? `Bezocht ${datumKort(b.bezocht_op)}` : "Bezocht"}
      </button>
      {b?.bezocht_op && (
        <input type="date" className="bz-datumveld" aria-label="Datum bezoek" value={b.bezocht_op} onChange={(e) => e.target.value && act.doe(() => bezoekBewaren(l.dossier_id, { bezocht_op: e.target.value }))} />
      )}
      {b?.eerste_bezoek || eerste ? (
        <span className="bz-pil eerste on">
          Eerste bezoek
          <input type="date" aria-label="Datum eerste bezoek" defaultValue={b?.eerste_bezoek ?? datumVoorstel}
            onChange={(e) => act.doe(() => bezoekBewaren(l.dossier_id, { eerste_bezoek: e.target.value || null }))} />
          <button type="button" className="ct-link" aria-label="Eerste bezoek schrappen" onClick={() => { setEerste(false); act.doe(() => bezoekBewaren(l.dossier_id, { eerste_bezoek: null })); }}>×</button>
        </span>
      ) : (
        <button type="button" className="bz-pil eerste" onClick={() => { setEerste(true); act.doe(() => bezoekBewaren(l.dossier_id, { eerste_bezoek: datumVoorstel })); }}>Eerste bezoek</button>
      )}
      <button type="button" className={`bz-pil${b?.evaluatie ? " on" : ""}`} disabled={act.bezig} onClick={() => act.doe(() => bezoekBewaren(l.dossier_id, { evaluatie: !b?.evaluatie }))}>
        {b?.evaluatie ? "Evaluatie ✓" : "Evaluatie"}
      </button>
    </span>
  );
}

export function Opmerking({ l, act }: { l: BLln; act: Act }) {
  const [open, setOpen] = useState(false);
  const huidig = l.bezoek?.opmerking ?? "";
  if (!open) {
    return huidig ? <button type="button" className="bz-opm" onClick={() => setOpen(true)}>{huidig}</button>
      : <button type="button" className="ct-link bz-opmknop" onClick={() => setOpen(true)}>+ Opmerking</button>;
  }
  return (
    <textarea className="bz-opmveld" autoFocus defaultValue={huidig} rows={2} placeholder="Wat viel op tijdens het bezoek?"
      onBlur={(e) => { setOpen(false); if (e.target.value !== huidig) act.doe(() => bezoekBewaren(l.dossier_id, { opmerking: e.target.value })); }} />
  );
}

function LlnRij({ l, d, r, act, onKaart, onVerplaats }: { l: BLln; d: BezoekData; r: Route | null; act: Act; onKaart: () => void; onVerplaats: (rid: string) => void }) {
  const datum = r?.datum && r.datum <= d.vandaag ? r.datum : d.vandaag;
  return (
    <div className={`bz-lrij${l.bezoek?.bezocht_op ? " klaar" : ""}`}>
      <div className="n">
        <b>{naamVan(l)}</b> <small>{l.klas}</small>
        {l.status === "ziek" && <span className="pill bad">langdurig ziek</span>}
        {l.bezoek?.te_doen && <small className="bz-todo">{l.bezoek.te_doen}</small>}
      </div>
      <div className="w">
        {l.plaats ? <>{l.plaats.naam}<small>{plaatsAdres(l)}</small></> : <small>Nog geen stageplaats</small>}
        {l.plaats && !punt(l) && <button type="button" className="ct-link" onClick={onKaart}>Op de kaart zetten</button>}
      </div>
      <div className="c">
        {l.mentor.naam && <small>{l.mentor.naam}</small>}
        {(l.mentor.tel || l.plaats?.telefoon) && <a href={`tel:${(l.mentor.tel || l.plaats?.telefoon || "").replace(/[^\d+]/g, "")}`}>{l.mentor.tel || l.plaats?.telefoon}</a>}
        <small>{l.roosterBron ? `rooster (${l.roosterBron === "mail" ? "uit mail" : "platform"})` : "geen rooster"}</small>
      </div>
      <select aria-label="Route" value={r?.id ?? ""} onChange={(e) => onVerplaats(e.target.value)}>
        <option value="">Geen route</option>
        {d.routes.map((x) => <option key={x.id} value={x.id}>{x.nr}. {x.naam}</option>)}
      </select>
      <div className="s">
        <BezoekVinkjes l={l} act={act} datumVoorstel={datum} />
        <Opmerking l={l} act={act} />
      </div>
    </div>
  );
}

export function LiggingKiezer({ l, d, act, sluit }: { l: BLln; d: BezoekData; act: Act; sluit: () => void }) {
  const [p, setP] = useState<{ lat: number; lng: number } | null>(punt(l));
  return (
    <div className="bz-overlay" role="dialog" aria-modal="true" aria-label="Ligging kiezen">
      <div className="bz-paneel">
        <h2>{l.plaats?.naam}</h2>
        <p className="sm">{plaatsAdres(l) || "Geen adres"}. Klik op de kaart op de juiste plek.</p>
        <Kaart vertrek={d.instellingen.vertrek} markers={[]} kruis={p} onKlik={(lat, lng) => setP({ lat, lng })} hoogte={380} />
        <div className="bh-form-voet">
          <button type="button" className="bh-btn pri" disabled={!p || act.bezig} onClick={() => p && act.doe(() => liggingBewaren(l.plaats!.id, p.lat, p.lng), (r) => r?.ok && sluit())}>Ligging bewaren</button>
          <button type="button" className="bh-btn" onClick={sluit}>Annuleren</button>
          <a className="bh-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${l.plaats?.naam ?? ""} ${plaatsAdres(l)}`)}`} target="_blank" rel="noreferrer">Zoeken in Google Maps</a>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kalender
// ---------------------------------------------------------------------------
function Kalender({ d, lln, routes, act }: { d: BezoekData; lln: Map<string, BLln>; routes: Route[]; act: Act }) {
  const dagen = bezoekDagen(d.instellingen);
  const weken = [...new Set(dagen.map(maandag))];
  const zonder = routes.filter((r) => !r.datum);
  const plan = (rid: string, datum: string) => act.doe(() => routesBewaren(d.blok.id, [{ id: rid, datum }]));
  return (
    <>
      {zonder.length > 0 && <p className="bh-melding">Nog zonder datum: {zonder.map((r) => `${r.nr}. ${r.naam}`).join(" · ")}. Kies een dag hieronder, of open de route voor de beste momenten.</p>}
      <div className="bz-kal">
        {weken.map((m) => (
          <div key={m} className="bz-week">
            <div className="bz-wk">week van {datumKort(m)}</div>
            {[1, 2, 3, 4].map((i) => {
              const datum = new Date(new Date(`${m}T12:00:00Z`).getTime() + i * 864e5).toISOString().slice(0, 10);
              const binnen = dagen.includes(datum);
              const blok = d.instellingen.geblokkeerd[datum];
              const hier = d.routes.filter((r) => r.datum === datum);
              return (
                <div key={datum} className={`bz-dag${!binnen || blok ? " dicht" : ""}${datum === d.vandaag ? " vandaag" : ""}`}>
                  <div className="d"><b>{datumTekst(datum)}</b></div>
                  {blok && <small>{blok}</small>}
                  {binnen && !blok && (
                    <small className="bz-vrij">
                      {d.begeleiders.map((g) => {
                        const b = d.beschikbaarheid.find((x) => x.begeleider_id === g.id);
                        const delen = (["vm", "nm"] as Deel[]).filter((p) => isVrij(b, d.instellingen, datum, p));
                        return `${g.naam[0]}: ${delen.length === 2 ? "dag" : delen.length ? DEEL_KORT[delen[0]] : "–"}`;
                      }).join(" · ")}
                    </small>
                  )}
                  {hier.map((r) => {
                    const a = aanwezigheid(r.volgorde, lln, datum, r.dagdeel);
                    return (
                      <Link key={r.id} href={`/beheer/bezoeken/route/${r.id}`} className="bz-kroute" style={{ background: routeKleur(r) }}>
                        <b>{r.nr}</b> {r.naam} <small>{DEEL_KORT[r.dagdeel]} · {d.begeleiders.find((g) => g.id === r.begeleider_id)?.naam[0] ?? "?"}{a.nee ? ` · ${a.nee} werkt niet` : ""}</small>
                      </Link>
                    );
                  })}
                  {binnen && !blok && zonder.length > 0 && (
                    <select aria-label={`Route plannen op ${datumTekst(datum)}`} value="" onChange={(e) => e.target.value && plan(e.target.value, datum)}>
                      <option value="">Route plannen…</option>
                      {zonder.map((r) => {
                        const a = aanwezigheid(r.volgorde, lln, datum, r.dagdeel);
                        const b = d.beschikbaarheid.find((x) => x.begeleider_id === r.begeleider_id);
                        return <option key={r.id} value={r.id}>{r.nr}. {r.naam} ({a.ja}/{a.n} werken{isVrij(b, d.instellingen, datum, r.dagdeel) ? "" : ", begeleider niet vrij"})</option>;
                      })}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Instellingen en beschikbaarheid
// ---------------------------------------------------------------------------
function Instellingen({ d, act }: { d: BezoekData; act: Act }) {
  const i = d.instellingen;
  const [x, setX] = useState({ start_datum: i.start_datum, eind_datum: i.eind_datum, max_per_route: i.max_per_route, vertrek: i.vertrek });
  const [blok, setBlok] = useState(Object.entries(i.geblokkeerd).sort());
  const [nd, setNd] = useState({ datum: "", reden: "" });
  return (
    <div className="bz-inst">
      <section className="bh-card">
        <div className="hd"><h2>Bezoekperiode en vertrek</h2></div>
        <div className="bd bz-form">
          <label className="f">Eerste bezoekdag<input type="date" value={x.start_datum} onChange={(e) => setX({ ...x, start_datum: e.target.value })} /></label>
          <label className="f">Laatste bezoekdag<input type="date" value={x.eind_datum} onChange={(e) => setX({ ...x, eind_datum: e.target.value })} /></label>
          <label className="f">Maximum leerlingen per route<input type="number" min={1} max={20} value={x.max_per_route} onChange={(e) => setX({ ...x, max_per_route: Number(e.target.value) })} /></label>
          <label className="f">Vertrekpunt<input value={x.vertrek.label} onChange={(e) => setX({ ...x, vertrek: { ...x.vertrek, label: e.target.value } })} /></label>
          <label className="f full">Adres<input value={x.vertrek.adres} onChange={(e) => setX({ ...x, vertrek: { ...x.vertrek, adres: e.target.value } })} /></label>
          <div className="f full">
            <span>Dagen zonder bezoeken</span>
            <ul className="bz-blok">
              {blok.map(([k, v]) => <li key={k}>{datumTekst(k)} · {v} <button type="button" className="ct-link" onClick={() => setBlok(blok.filter(([a]) => a !== k))}>schrappen</button></li>)}
            </ul>
            <span className="bz-rij">
              <input type="date" value={nd.datum} onChange={(e) => setNd({ ...nd, datum: e.target.value })} aria-label="Datum" />
              <input placeholder="Reden (bv. herfstvakantie)" value={nd.reden} onChange={(e) => setNd({ ...nd, reden: e.target.value })} aria-label="Reden" />
              <button type="button" className="bh-btn sm" disabled={!nd.datum} onClick={() => { setBlok([...blok.filter(([a]) => a !== nd.datum), [nd.datum, nd.reden || "Geen bezoeken"] as [string, string]].sort()); setNd({ datum: "", reden: "" }); }}>Toevoegen</button>
            </span>
          </div>
          <div className="bh-form-voet full">
            <button type="button" className="bh-btn pri" disabled={act.bezig} onClick={() => act.doe(() => instellingenBewaren(d.blok.id, { ...x, geblokkeerd: Object.fromEntries(blok) }))}>Bewaren</button>
          </div>
        </div>
      </section>
      {d.begeleiders.map((g) => <Beschikbaar key={g.id} d={d} g={g} act={act} />)}
    </div>
  );
}

function Beschikbaar({ d, g, act }: { d: BezoekData; g: BezoekData["begeleiders"][number]; act: Act }) {
  const b = d.beschikbaarheid.find((x) => x.begeleider_id === g.id);
  const [slots, setSlots] = useState<Record<string, ("vm" | "nm")[]>>(b?.slots ?? { 2: ["vm", "nm"], 3: ["vm", "nm"], 4: ["vm", "nm"], 5: ["vm", "nm"] });
  const [over, setOver] = useState<string[]>(b?.overslaan ?? []);
  const [nd, setNd] = useState({ datum: "", deel: "" });
  const WDN = ["", "", "dinsdag", "woensdag", "donderdag", "vrijdag"];
  const zet = (w: number, p: "vm" | "nm", aan: boolean) => setSlots({ ...slots, [w]: aan ? [...new Set([...(slots[w] ?? []), p])] : (slots[w] ?? []).filter((x) => x !== p) });
  return (
    <section className="bh-card">
      <div className="hd"><h2>Beschikbaarheid {g.naam}</h2></div>
      <div className="bd">
        <table className="bz-slots">
          <thead><tr><th></th><th>Voormiddag</th><th>Namiddag</th></tr></thead>
          <tbody>
            {[2, 3, 4, 5].map((w) => (
              <tr key={w}>
                <th>{WDN[w]}</th>
                {(["vm", "nm"] as const).map((p) => <td key={p}><input type="checkbox" aria-label={`${WDN[w]} ${DEEL[p]}`} checked={(slots[w] ?? []).includes(p)} onChange={(e) => zet(w, p, e.target.checked)} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="sm">Niet beschikbaar op:</p>
        <ul className="bz-blok">
          {over.sort().map((o) => { const [dd, p] = o.split(":"); return <li key={o}>{datumTekst(dd)}{p ? ` (${DEEL[p as Deel]})` : ""} <button type="button" className="ct-link" onClick={() => setOver(over.filter((x) => x !== o))}>schrappen</button></li>; })}
        </ul>
        <span className="bz-rij">
          <input type="date" value={nd.datum} onChange={(e) => setNd({ ...nd, datum: e.target.value })} aria-label="Datum" />
          <select value={nd.deel} onChange={(e) => setNd({ ...nd, deel: e.target.value })} aria-label="Dagdeel"><option value="">hele dag</option><option value="vm">voormiddag</option><option value="nm">namiddag</option></select>
          <button type="button" className="bh-btn sm" disabled={!nd.datum || wd(nd.datum) > 5} onClick={() => { setOver([...new Set([...over, nd.deel ? `${nd.datum}:${nd.deel}` : nd.datum])]); setNd({ datum: "", deel: "" }); }}>Toevoegen</button>
        </span>
        <div className="bh-form-voet">
          <button type="button" className="bh-btn pri" disabled={act.bezig} onClick={() => act.doe(() => beschikbaarheidBewaren(d.blok.id, g.id, slots, over))}>Bewaren</button>
        </div>
      </div>
    </section>
  );
}
