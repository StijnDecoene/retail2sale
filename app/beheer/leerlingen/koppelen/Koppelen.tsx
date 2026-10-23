"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { dossiersKoppelen, type KoppelRij } from "../../acties";
import { leesTabel, norm, raadKolommen } from "@/lib/tabel";

type Veld = "leerling" | "voornaam" | "achternaam" | "klas" | "stageplaats" | "gemeente" | "mentor" | "mentor_telefoon" | "mentor_email" | "gsm";

const VELDEN: { k: Veld; label: string; woorden: string[] }[] = [
  { k: "leerling", label: "Leerling (volledige naam)", woorden: ["leerling", "stagiair", "volledige naam", "naam leerling", "name"] },
  { k: "voornaam", label: "Voornaam", woorden: ["voornaam", "first name"] },
  { k: "achternaam", label: "Achternaam", woorden: ["achternaam", "familienaam", "last name"] },
  { k: "klas", label: "Klas", woorden: ["klas", "klasgroep", "class"] },
  { k: "stageplaats", label: "Stageplaats", woorden: ["stageplaats", "bedrijf", "winkel", "company"] },
  { k: "gemeente", label: "Gemeente stageplaats", woorden: ["gemeente stageplaats", "gemeente", "plaats", "place"] },
  { k: "mentor", label: "Mentor", woorden: ["mentor", "contactpersoon", "contact"] },
  { k: "mentor_telefoon", label: "Telefoon mentor", woorden: ["telefoon mentor", "tel mentor", "telefoon", "contact phone"] },
  { k: "mentor_email", label: "E-mail mentor", woorden: ["e-mail mentor", "mail mentor", "contact email", "e-mail"] },
  { k: "gsm", label: "Gsm leerling", woorden: ["gsm leerling", "gsm", "student phone"] },
];

const sl = (s: string) => norm(s).replace(/[^a-z0-9]+/g, " ").trim();

type L = { id: string; voornaam: string; naam: string; klas: string };
type P = { id: string; naam: string; gemeente: string | null };

export default function Koppelen({ leerlingen, plaatsen, blokken, standaardBlok }: { leerlingen: L[]; plaatsen: P[]; blokken: { id: string; naam: string }[]; standaardBlok: string }) {
  const [tekst, setTekst] = useState("");
  const [kolom, setKolom] = useState<Record<Veld, number> | null>(null);
  const [blok, setBlok] = useState(standaardBlok);
  const [bezig, start] = useTransition();
  const [uitslag, setUitslag] = useState<Awaited<ReturnType<typeof dossiersKoppelen>> | null>(null);
  const [keuze, setKeuze] = useState<Record<number, string>>({}); // rij → zelf gekozen leerling
  const opId = useMemo(() => new Map(leerlingen.map((l) => [l.id, l])), [leerlingen]);
  const perKlas = useMemo(() => [...leerlingen].sort((a, b) => a.klas.localeCompare(b.klas) || a.naam.localeCompare(b.naam, "nl") || a.voornaam.localeCompare(b.voornaam, "nl")), [leerlingen]);

  // Leerlingen op naam (beide volgordes), stageplaatsen op naam + gemeente.
  const opNaam = useMemo(() => {
    const m = new Map<string, L[]>();
    for (const l of leerlingen) for (const k of new Set([sl(`${l.voornaam} ${l.naam}`), sl(`${l.naam} ${l.voornaam}`)])) m.set(k, [...(m.get(k) ?? []), l]);
    return m;
  }, [leerlingen]);
  const zoekPlaats = useMemo(() => {
    const opBeide = new Map<string, P>(), opNaamP = new Map<string, P[]>();
    for (const p of plaatsen) {
      opBeide.set(`${sl(p.naam)}|${sl(p.gemeente ?? "")}`, p);
      opNaamP.set(sl(p.naam), [...(opNaamP.get(sl(p.naam)) ?? []), p]);
    }
    return (naam: string, gemeente: string) => opBeide.get(`${sl(naam)}|${sl(gemeente)}`) ?? (opNaamP.get(sl(naam))?.length === 1 ? opNaamP.get(sl(naam))![0] : undefined);
  }, [plaatsen]);

  /** Benaderen: in dezelfde klas, alle woorden uit de lijst staan in de naam uit Smartschool, of de namen zijn gelijk zonder spaties. */
  const benader = useMemo(() => (naam: string, klas: string) => {
    const w = sl(naam).split(" ").filter(Boolean), plat = w.join("");
    if (!w.length) return undefined;
    const kand = leerlingen.filter((l) => !klas || l.klas.toUpperCase() === klas).filter((l) => {
      const v = sl(`${l.voornaam} ${l.naam}`).split(" ");
      return w.every((x) => v.includes(x)) || v.join("") === plat || sl(`${l.naam} ${l.voornaam}`).replace(/ /g, "") === plat;
    });
    return kand.length === 1 ? kand[0] : undefined;
  }, [leerlingen]);

  const tabel = useMemo(() => leesTabel(tekst), [tekst]);
  const kop = tabel[0] ?? [];
  const map = kolom ?? (kop.length ? raadKolommen(kop, VELDEN) : null);

  const rijen = useMemo(() => {
    if (!map) return [];
    const get = (r: string[], v: Veld) => (map[v] >= 0 ? (r[map[v]] ?? "").trim() : "");
    return tabel.slice(1).map((r, i) => {
      const naam = get(r, "leerling") || `${get(r, "voornaam")} ${get(r, "achternaam")}`.trim();
      const klas = get(r, "klas").toUpperCase().replace(/\s+/g, "");
      const kand = opNaam.get(sl(naam)) ?? [];
      const exact = kand.length === 1 ? kand[0] : kand.find((x) => x.klas.toUpperCase() === klas);
      const gekozen = keuze[i] ? opId.get(keuze[i]) : undefined;
      const benaderd = !exact && !gekozen ? benader(naam, klas) : undefined;
      const l = gekozen ?? exact ?? benaderd;
      const plaatsNaam = get(r, "stageplaats");
      const p = plaatsNaam ? zoekPlaats(plaatsNaam, get(r, "gemeente")) : undefined;
      return {
        i, naam, klas, plaatsNaam, l, p, hoe: gekozen ? "gekozen" : exact ? "" : benaderd ? "benaderd" : "",
        rij: l && p ? ({ leerling_id: l.id, stageplaats_id: p.id, mentor_naam: get(r, "mentor"), mentor_telefoon: get(r, "mentor_telefoon"), mentor_email: get(r, "mentor_email"), gsm: get(r, "gsm") } as KoppelRij) : null,
      };
    }).filter((x) => x.naam || x.plaatsNaam);
  }, [tabel, map, opNaam, zoekPlaats, keuze, opId, benader]);
  const klaar = rijen.filter((r) => r.rij).map((r) => r.rij!);
  const rang = (r: (typeof rijen)[number]) => (!r.rij ? 0 : r.hoe === "benaderd" ? 1 : 2);
  const naamKolom = map && (map.leerling >= 0 || (map.voornaam >= 0 && map.achternaam >= 0));

  async function bestand(f: File | undefined) {
    if (!f) return;
    setUitslag(null); setKolom(null); setKeuze({}); setTekst(await f.text());
  }

  return (
    <section className="bh-card">
      <div className="hd"><h2>Stagelijst</h2></div>
      <div className="bh-form">
        <div className="bh-fg">
          <label className="f">Blokstage
            <select value={blok} onChange={(e) => { setBlok(e.target.value); setUitslag(null); }}>
              {blokken.map((b) => <option key={b.id} value={b.id}>{b.naam}</option>)}
            </select>
          </label>
          <label className="f">CSV-bestand
            <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(e) => bestand(e.target.files?.[0])} />
          </label>
          <label className="f full">Of plak de rijen uit Excel (met de titelrij)
            <textarea rows={5} value={tekst} onChange={(e) => { setTekst(e.target.value); setKolom(null); setKeuze({}); setUitslag(null); }}
              placeholder={"Leerling;Klas;Stageplaats;Gemeente stageplaats;Mentor;Telefoon mentor;E-mail mentor\nGuust Stevens;5OS1;Sportline;Roeselare;Filip Comptaert;051 26 17 00;info@sportline.be"} />
          </label>
        </div>

        {map && kop.length > 0 && (
          <>
            <h3 className="bh-h3">Welke kolom is wat?</h3>
            <div className="bh-fg3">
              {VELDEN.map((v) => (
                <label className="f" key={v.k}>{v.label}
                  <select value={map[v.k]} onChange={(e) => setKolom({ ...map, [v.k]: Number(e.target.value) })}>
                    <option value={-1}>— niet gebruiken —</option>
                    {kop.map((h, i) => <option key={i} value={i}>{h || `Kolom ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
            </div>

            <h3 className="bh-h3">Voorbeeld ({klaar.length} van {rijen.length} leerlingen klaar om te koppelen)</h3>
            <div className="bh-tw">
              <table className="bh-tabel">
                <thead><tr><th>Leerling</th><th>Klas</th><th>Stageplaats</th><th>Gevonden?</th></tr></thead>
                <tbody>
                  {[...rijen].sort((a, b) => rang(a) - rang(b)).map((r) => (
                    <tr key={r.i} className={r.rij ? undefined : "ongeldig"}>
                      <td>
                        {!r.l || r.hoe ? (
                          <>
                            <select value={r.l?.id ?? ""} aria-label={`Leerling voor ${r.naam}`}
                              onChange={(e) => { setUitslag(null); setKeuze({ ...keuze, [r.i]: e.target.value }); }}>
                              <option value="">— kies de leerling —</option>
                              {[...perKlas.filter((x) => x.klas.toUpperCase() === r.klas), ...perKlas.filter((x) => x.klas.toUpperCase() !== r.klas)].map((x) => (
                                <option key={x.id} value={x.id}>{x.naam} {x.voornaam} · {x.klas}</option>
                              ))}
                            </select>
                            <small className="sm"> in de lijst: {r.naam || "(geen naam)"}</small>
                          </>
                        ) : `${r.l.voornaam} ${r.l.naam}`}
                      </td>
                      <td>{r.l?.klas ?? r.klas}</td>
                      <td>{r.p ? `${r.p.naam}${r.p.gemeente ? ` · ${r.p.gemeente}` : ""}` : r.plaatsNaam}</td>
                      <td>
                        {r.rij ? (r.hoe === "benaderd" ? <span className="pill warn">Klaar · naam nakijken</span> : <span className="pill ok">Klaar</span>) : (
                          <>
                            {!r.l && <span className="pill bad">Leerling niet gevonden</span>}{" "}
                            {!r.plaatsNaam ? <span className="pill mut">Geen stageplaats</span> : !r.p && <span className="pill bad">Stageplaats niet gevonden</span>}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rijen.some((r) => rang(r) < 2) && (
              <p className="sm">
                <b>Leerling niet gevonden?</b> Kies de juiste leerling in de keuzelijst; leerlingen uit dezelfde klas staan bovenaan.{" "}
                <b>Naam nakijken</b> (oranje): de naam kwam niet exact overeen maar werd gevonden in dezelfde klas; pas aan als het niet klopt.{" "}
                Een stageplaats niet gevonden? Kijk na of naam en gemeente hetzelfde zijn als bij <Link href="/beheer/stageplaatsen">Stageplaatsen</Link>.
                Rode rijen worden overgeslagen; je kan ze ook achteraf in de fiche van de leerling instellen.
              </p>
            )}
          </>
        )}

        <div className="bh-form-voet">
          <button type="button" className="bh-btn pri" disabled={bezig || !klaar.length || !blok}
            onClick={() => { setUitslag(null); start(async () => setUitslag(await dossiersKoppelen(blok, klaar))); }}>
            {bezig ? "Bezig met koppelen…" : `Koppelen (${klaar.length})`}
          </button>
          {map && kop.length > 0 && !naamKolom && <span className="bh-fout">Kies de kolom met de naam van de leerling.</span>}
          {uitslag?.fout && <span className="bh-fout" role="alert">{uitslag.fout}</span>}
          {uitslag && !uitslag.fout && (
            <span className="bh-ok" role="status">
              Klaar: {uitslag.gekoppeld} gekoppeld, {uitslag.aangevuld} aangevuld, {uitslag.ongewijzigd} ongewijzigd
              {uitslag.anders?.length ? `, ${uitslag.anders.length} al bij een andere stageplaats` : ""}.{" "}
              <Link href="/beheer/leerlingen">Naar de leerlingen</Link>
            </span>
          )}
        </div>
        {uitslag?.anders && uitslag.anders.length > 0 && (
          <ul className="sm">{uitslag.anders.map((t) => <li key={t}>{t}</li>)}</ul>
        )}
      </div>
    </section>
  );
}
