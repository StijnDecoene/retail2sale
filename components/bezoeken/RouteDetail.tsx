"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Kaart from "./Kaart";
import { Melding, kaartLagen, lijstVan, useActie } from "./gedeeld";
import { BezoekVinkjes, LiggingKiezer, Opmerking } from "./BezoekenApp";
import { routeVerwijderen, routesBewaren } from "@/app/beheer/bezoeken/acties";
import {
  DEEL, DEEL_KORT, aanwezigheid, besteMomenten, bezoekDagen, datumTekst, invoegen, isVrij, mapsUrl, minTekst, naamVan, optimaliseer, plaatsAdres, punt,
  routeKleur, routeStats, urenOpDag, werkt, type BezoekData, type BLln, type Deel,
} from "@/lib/bezoeken";

export default function RouteDetail({ d, id }: { d: BezoekData; id: string }) {
  const router = useRouter();
  const lln = useMemo(() => lijstVan(d), [d]);
  const act = useActie();
  const r = d.routes.find((x) => x.id === id)!;
  const [weg, setWeg] = useState(false);
  const [kaartVoor, setKaartVoor] = useState<BLln | null>(null);
  const kleur = routeKleur(r);
  const st = routeStats(r.volgorde, lln, d.instellingen.vertrek);
  const lagen = kaartLagen(d, lln, { routes: [r] });
  const a = r.datum ? aanwezigheid(r.volgorde, lln, r.datum, r.dagdeel) : null;
  const beste = besteMomenten(r, d, lln, 8);
  const b = d.beschikbaarheid.find((x) => x.begeleider_id === r.begeleider_id);
  const idx = d.routes.findIndex((x) => x.id === r.id);
  const vorige = d.routes[idx - 1], volgende = d.routes[idx + 1];
  const bewaar = (p: Parameters<typeof routesBewaren>[1][number]) => act.doe(() => routesBewaren(d.blok.id, [{ id: r.id, ...p }]));
  const stops = r.volgorde.map((x) => lln.get(x)).filter((l): l is BLln => !!l);
  const inRoute = new Set(d.routes.flatMap((x) => x.volgorde));
  const los = d.leerlingen.filter((l) => !inRoute.has(l.dossier_id) && !l.bezoek?.niet_plannen);
  const verplaats = (i: number, n: number) => { const v = [...r.volgorde]; const [x] = v.splice(i, 1); v.splice(i + n, 0, x); bewaar({ volgorde: v }); };
  const naarRoute = (l: BLln, rid: string) => {
    const doel = d.routes.find((x) => x.id === rid);
    const wijz = [{ id: r.id, volgorde: r.volgorde.filter((x) => x !== l.dossier_id) }];
    if (doel) wijz.push({ id: doel.id, volgorde: invoegen(doel.volgorde, l.dossier_id, lln, d.instellingen.vertrek) });
    act.doe(() => routesBewaren(d.blok.id, wijz));
  };
  const datumVoorstel = r.datum && r.datum <= d.vandaag ? r.datum : d.vandaag;
  let rit = 0;

  return (
    <>
      <p className="bh-kruimel"><Link href={`/beheer/bezoeken?blok=${d.blok.id}&tab=routes`}>← Stagebezoeken</Link></p>
      <div className="bz-rhead" style={{ background: kleur }}>
        <span className="big">{r.nr}</span>
        <div className="ttl">
          <input defaultValue={r.naam} aria-label="Naam van de route" onBlur={(e) => e.target.value !== r.naam && bewaar({ naam: e.target.value })} />
          <small>{stops.length} leerlingen · {d.blok.naam}</small>
        </div>
        <div className="ctl">
          <select aria-label="Begeleider" value={r.begeleider_id ?? ""} onChange={(e) => bewaar({ begeleider_id: e.target.value || null })}>
            <option value="">Geen begeleider</option>
            {d.begeleiders.map((g) => <option key={g.id} value={g.id}>{g.naam}</option>)}
          </select>
          <select aria-label="Datum" value={r.datum ?? ""} onChange={(e) => bewaar({ datum: e.target.value || null })}>
            <option value="">Nog geen datum</option>
            {bezoekDagen(d.instellingen).map((x) => (
              <option key={x} value={x} disabled={!!d.instellingen.geblokkeerd[x]}>
                {datumTekst(x)}{d.instellingen.geblokkeerd[x] ? ` (${d.instellingen.geblokkeerd[x]})` : !isVrij(b, d.instellingen, x, "vm") && !isVrij(b, d.instellingen, x, "nm") ? " (niet vrij)" : ""}
              </option>
            ))}
          </select>
          <select aria-label="Dagdeel" value={r.dagdeel} onChange={(e) => bewaar({ dagdeel: e.target.value as Deel })}>
            {(["vm", "nm", "dag"] as Deel[]).map((p) => <option key={p} value={p}>{DEEL[p]}</option>)}
          </select>
        </div>
        <div className="nav">
          {vorige && <Link className="bh-btn sm" href={`/beheer/bezoeken/route/${vorige.id}`} aria-label="Vorige route">‹ {vorige.nr}</Link>}
          {volgende && <Link className="bh-btn sm" href={`/beheer/bezoeken/route/${volgende.id}`} aria-label="Volgende route">{volgende.nr} ›</Link>}
        </div>
      </div>

      <div className="bz-stats">
        <div><small>Leerlingen</small><b>{stops.length}</b></div>
        <div><small>Afstand</small><b>{Math.round(st.km)} km</b></div>
        <div><small>Reistijd</small><b>{minTekst(st.min)}</b></div>
        <div><small>Dagduur</small><b>{minTekst(st.dagMin)}–{minTekst(st.dagMax)}</b></div>
        <div><small>Aan het werk{r.datum ? ` op ${datumTekst(r.datum)}` : ""}</small><b>{a ? `${a.ja}/${a.n}` : "–"}</b>{a && a.onbekend > 0 && <small>{a.onbekend} zonder rooster</small>}</div>
        <div><small>Bezocht</small><b>{stops.filter((l) => l.bezoek?.bezocht_op).length}/{stops.length}</b></div>
      </div>
      {r.datum && !isVrij(b, d.instellingen, r.datum, r.dagdeel) && <p className="bh-melding">De begeleider is volgens de beschikbaarheid niet vrij op {datumTekst(r.datum)} ({DEEL[r.dagdeel]}).</p>}

      <div className="bz-acties">
        <button type="button" className="bh-btn" disabled={act.bezig} onClick={() => bewaar({ volgorde: optimaliseer(r.volgorde, lln, d.instellingen.vertrek) })}>Kortste volgorde</button>
        <a className="bh-btn" href={mapsUrl(r.volgorde, lln, d.instellingen.vertrek)} target="_blank" rel="noreferrer">Openen in Google Maps</a>
        <a className="bh-btn" href={`/beheer/bezoeken/route/${r.id}/pdf`} target="_blank" rel="noreferrer">Pdf</a>
        {weg ? (
          <>
            <button type="button" className="bh-btn" onClick={() => act.doe(() => routeVerwijderen(r.id), (x) => x?.ok && router.push(`/beheer/bezoeken?blok=${d.blok.id}&tab=routes`))}>Ja, route verwijderen</button>
            <button type="button" className="ct-link" onClick={() => setWeg(false)}>Toch niet</button>
          </>
        ) : <button type="button" className="ct-link" onClick={() => setWeg(true)}>Route verwijderen</button>}
      </div>

      {beste.length > 0 && (
        <section className="bh-card">
          <div className="hd"><h2>Beste momenten</h2><small className="sm">wie werkt volgens het werkrooster, begeleider vrij</small></div>
          <div className="bd bz-beste">
            {beste.map((x) => (
              <button key={`${x.datum}${x.deel}`} type="button" className={`bz-bestebtn${r.datum === x.datum && r.dagdeel === x.deel ? " on" : ""}`} onClick={() => bewaar({ datum: x.datum, dagdeel: x.deel })}>
                {datumTekst(x.datum)} {DEEL_KORT[x.deel]} <span className="ok">{x.a.ja} werken</span>{x.a.nee > 0 && <span className="bad"> · {x.a.nee} niet</span>}{x.a.onbekend > 0 && <span> · {x.a.onbekend} ?</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="bz-detail">
        <ol className="bz-tl" style={{ ["--rc" as string]: kleur }}>
          <li className="bz-eind"><span className="sq">S</span>Vertrek: {d.instellingen.vertrek.label}</li>
          {stops.map((l, i) => {
            const p = punt(l);
            const rr = p ? st.ritten[rit++] : null;
            const w = r.datum ? werkt(l, r.datum, r.dagdeel) : null;
            return (
              <li key={l.dossier_id}>
                {rr && <div className={`bz-rit s-${rr.soort}`}>{rr.soort === "zelfde" ? "zelfde adres" : `${rr.soort === "voet" ? "te voet" : "rijden"} · ${rr.km.toFixed(1)} km · ${rr.min} min`}</div>}
                <div className={`bz-stop${l.bezoek?.bezocht_op ? " klaar" : ""}`}>
                  <span className="num">{i + 1}</span>
                  <div>
                    <div className="wie"><b>{naamVan(l)}</b> <small>{l.klas}</small>
                      {r.datum && (w === true ? <span className="pill ok">werkt {urenOpDag(l, r.datum)}</span> : w === false ? <span className="pill bad">{l.afwezig.includes(r.datum) || l.status === "ziek" ? "afwezig" : "werkt niet"}</span> : <span className="pill mut">rooster onbekend</span>)}
                    </div>
                    <div className="waar">{l.plaats?.naam} · {plaatsAdres(l) || "geen adres"}{!p && <> · <button type="button" className="ct-link" onClick={() => setKaartVoor(l)}>op de kaart zetten</button></>}</div>
                    <div className="meta">
                      {l.mentor.naam && <span>Mentor {l.mentor.naam}</span>}
                      {(l.mentor.tel || l.plaats?.telefoon) && <a href={`tel:${(l.mentor.tel || l.plaats?.telefoon || "").replace(/[^\d+]/g, "")}`}>{l.mentor.tel || l.plaats?.telefoon}</a>}
                      {l.gsm && <span>Stagiair <a href={`tel:${l.gsm.replace(/[^\d+]/g, "")}`}>{l.gsm}</a></span>}
                    </div>
                    <div className="act">
                      <span className="bz-vinkjes">
                        <BezoekVinkjes l={l} act={act} datumVoorstel={datumVoorstel} />
                        <Link className="bz-pil" href={`/beheer/dossiers/${l.dossier_id}/evaluatie?soort=school&terug=/beheer/bezoeken/route/${r.id}`}>Bezoekformulier</Link>
                      </span>
                      <span className="bz-pijlen">
                        <button type="button" className="bh-btn sm" disabled={i === 0 || act.bezig} onClick={() => verplaats(i, -1)} aria-label="Hoger">↑</button>
                        <button type="button" className="bh-btn sm" disabled={i === stops.length - 1 || act.bezig} onClick={() => verplaats(i, 1)} aria-label="Lager">↓</button>
                        <select aria-label="Naar andere route" value="" onChange={(e) => naarRoute(l, e.target.value)}>
                          <option value="">Verplaatsen…</option>
                          {d.routes.filter((x) => x.id !== r.id).map((x) => <option key={x.id} value={x.id}>naar {x.nr}. {x.naam}</option>)}
                          <option value="weg">uit deze route halen</option>
                        </select>
                      </span>
                    </div>
                    <Opmerking l={l} act={act} />
                  </div>
                </div>
              </li>
            );
          })}
          {stops.length > 0 && st.ritten.at(-1) && <li><div className="bz-rit s-auto">terug · {st.ritten.at(-1)!.km.toFixed(1)} km · {st.ritten.at(-1)!.min} min</div></li>}
          <li className="bz-eind"><span className="sq">S</span>Terug: {d.instellingen.vertrek.label}</li>
          {los.length > 0 && (
            <li className="bz-toevoegen">
              <select aria-label="Leerling toevoegen" value="" onChange={(e) => { const l = lln.get(e.target.value); if (l) bewaar({ volgorde: invoegen(r.volgorde, l.dossier_id, lln, d.instellingen.vertrek) }); }}>
                <option value="">+ Leerling toevoegen (nog niet in een route)…</option>
                {los.map((l) => <option key={l.dossier_id} value={l.dossier_id}>{naamVan(l)} · {l.plaats?.naam ?? "geen stageplaats"} {l.plaats?.gemeente ?? ""}</option>)}
              </select>
            </li>
          )}
        </ol>
        <div className="bz-kaartvak bz-plak"><Kaart vertrek={d.instellingen.vertrek} markers={lagen.markers} lijnen={lagen.lijnen} hoogte={520} /></div>
      </div>
      {kaartVoor && <LiggingKiezer l={kaartVoor} d={d} act={act} sluit={() => setKaartVoor(null)} />}
      <Melding m={act.melding} />
    </>
  );
}
