"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { stageplaatsenImporteren } from "../../acties";
import { SECTOREN, type PlaatsImportRij, type PlaatsImportVeld } from "@/lib/beheer";
import { leesTabel, norm, raadKolommen } from "@/lib/tabel";

const VELDEN: { k: PlaatsImportVeld; label: string; verplicht?: boolean; woorden: string[] }[] = [
  { k: "naam", label: "Naam", verplicht: true, woorden: ["naam", "stageplaats", "bedrijf", "winkel", "company", "naam stageplaats"] },
  { k: "juridische_naam", label: "Juridische naam", woorden: ["juridische naam", "officiele naam", "officiele naam onderneming", "rechtsvorm"] },
  { k: "kbo", label: "Ondernemingsnummer", woorden: ["ondernemingsnummer", "ondernemingsnr", "kbo", "btw", "vat"] },
  { k: "sector", label: "Sector", woorden: ["sector", "branche"] },
  { k: "straat", label: "Straat en nummer", woorden: ["straat", "adres", "address", "straat en nummer"] },
  { k: "postcode", label: "Postcode", woorden: ["postcode", "post", "pc", "zip"] },
  { k: "gemeente", label: "Gemeente", woorden: ["gemeente", "plaats", "stad", "city", "woonplaats"] },
  { k: "telefoon", label: "Telefoon", woorden: ["telefoon", "tel", "gsm", "phone"] },
  { k: "email", label: "E-mailadres", woorden: ["e-mail", "email", "e-mailadres", "mail"] },
  { k: "website", label: "Website", woorden: ["website", "web", "url", "site"] },
  { k: "contactpersoon", label: "Contactpersoon", woorden: ["contactpersoon", "contact", "mentor", "verantwoordelijke"] },
  { k: "notities", label: "Notities", woorden: ["notities", "notitie", "opmerkingen", "opmerking"] },
];

/** "Koestraat 175, 8800 Roeselare" → straat, postcode, gemeente (enkel als er geen aparte kolommen zijn). */
function splitsAdres(adres: string): { straat: string; postcode: string; gemeente: string } | null {
  const m = adres.match(/^(.*?)[,\s]+(\d{4})\s+(.+)$/);
  return m ? { straat: m[1].replace(/[,\s]+$/, ""), postcode: m[2], gemeente: m[3].trim() } : null;
}

/** Sector uit het bestand afstemmen op de lijst van het beheer; onbekende waarden blijven zoals ze zijn. */
function sectorVan(v: string): string {
  if (!v) return "";
  const n = norm(v);
  const exact = SECTOREN.find((s) => norm(s) === n);
  if (exact) return exact;
  if (/winkel|retail|verkoop|sales|mode|voeding|supermarkt/.test(n)) return "Retail / winkel";
  if (/onthaal|receptie|hotel|toerisme/.test(n)) return "Onthaal / receptie";
  if (/kantoor|administratie/.test(n)) return "Kantoor / administratie";
  if (/horeca|restaurant|cafe/.test(n)) return "Horeca";
  if (/zorg|ziekenhuis|woonzorg/.test(n)) return "Zorg";
  if (/overheid|gemeente|stad|ocmw/.test(n)) return "Overheid";
  return v;
}

const VOORBEELD = ["naam", "straat", "postcode", "gemeente", "contactpersoon", "email"] as const;

export default function ImporterenPlaatsen() {
  const [tekst, setTekst] = useState("");
  const [kolom, setKolom] = useState<Record<PlaatsImportVeld, number> | null>(null);
  const [bezig, start] = useTransition();
  const [uitslag, setUitslag] = useState<{ fout?: string; nieuw?: number; aangevuld?: number; ongewijzigd?: number } | null>(null);

  const tabel = useMemo(() => leesTabel(tekst), [tekst]);
  const kop = tabel[0] ?? [];
  const map = kolom ?? (kop.length ? raadKolommen(kop, VELDEN) : null);

  const rijen: PlaatsImportRij[] = useMemo(() => {
    if (!map) return [];
    return tabel.slice(1).map((r) => {
      const o = {} as PlaatsImportRij;
      for (const v of VELDEN) o[v.k] = map[v.k] >= 0 ? (r[map[v.k]] ?? "").trim() : "";
      if (o.straat && !o.postcode && !o.gemeente) {
        const a = splitsAdres(o.straat);
        if (a) Object.assign(o, a);
      }
      o.sector = sectorVan(o.sector);
      return o;
    });
  }, [tabel, map]);
  const geldig = rijen.filter((r) => r.naam);
  const ontbreekt = map ? VELDEN.filter((v) => v.verplicht && map[v.k] < 0) : [];

  async function bestand(f: File | undefined) {
    if (!f) return;
    setUitslag(null);
    setKolom(null);
    setTekst(await f.text());
  }

  function importeer() {
    setUitslag(null);
    start(async () => setUitslag(await stageplaatsenImporteren(geldig)));
  }

  return (
    <section className="bh-card">
      <div className="hd"><h2>Lijst met stageplaatsen</h2></div>
      <div className="bh-form">
        <div className="bh-fg">
          <label className="f">CSV-bestand
            <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(e) => bestand(e.target.files?.[0])} />
          </label>
          <label className="f full">Of plak de rijen uit Excel (met de titelrij)
            <textarea
              rows={6}
              value={tekst}
              onChange={(e) => { setTekst(e.target.value); setKolom(null); setUitslag(null); }}
              placeholder={"Naam;Adres;Postcode;Gemeente;Contactpersoon;Telefoon;E-mail\nSportline;Koestraat 175;8800;Roeselare;Filip Comptaert;051 26 17 00;info@sportline.be"}
            />
          </label>
        </div>

        {map && kop.length > 0 && (
          <>
            <h3 className="bh-h3">Welke kolom is wat?</h3>
            <div className="bh-fg3">
              {VELDEN.map((v) => (
                <label className="f" key={v.k}>
                  {v.label}{v.verplicht ? "" : " (optioneel)"}
                  <select value={map[v.k]} onChange={(e) => setKolom({ ...map, [v.k]: Number(e.target.value) })}>
                    <option value={-1}>— niet gebruiken —</option>
                    {kop.map((h, i) => <option key={i} value={i}>{h || `Kolom ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <p className="sm">
              Staat het volledige adres in één kolom (bv. &quot;Koestraat 175, 8800 Roeselare&quot;)? Kies die kolom bij Straat en
              nummer: postcode en gemeente worden er dan uit gehaald.
            </p>

            <h3 className="bh-h3">Voorbeeld ({geldig.length} van {rijen.length} rijen bruikbaar)</h3>
            <div className="bh-tw">
              <table className="bh-tabel">
                <thead><tr>{VOORBEELD.map((k) => <th key={k}>{VELDEN.find((v) => v.k === k)!.label}</th>)}</tr></thead>
                <tbody>
                  {rijen.slice(0, 8).map((r, i) => (
                    <tr key={i} className={r.naam ? undefined : "ongeldig"}>
                      {VOORBEELD.map((k) => <td key={k}>{r[k]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rijen.length > 8 && <p className="sm">… en nog {rijen.length - 8} rijen.</p>}
          </>
        )}

        <div className="bh-form-voet">
          <button type="button" className="bh-btn pri" onClick={importeer} disabled={bezig || !geldig.length || ontbreekt.length > 0}>
            {bezig ? "Bezig met importeren…" : `Importeren (${geldig.length})`}
          </button>
          {ontbreekt.length > 0 && <span className="bh-fout">Kies nog een kolom voor: {ontbreekt.map((v) => v.label.toLowerCase()).join(", ")}.</span>}
          {uitslag?.fout && <span className="bh-fout" role="alert">{uitslag.fout}</span>}
          {uitslag && !uitslag.fout && (
            <span className="bh-ok" role="status">
              Klaar: {uitslag.nieuw} nieuw, {uitslag.aangevuld} aangevuld, {uitslag.ongewijzigd} ongewijzigd.{" "}
              <Link href="/beheer/stageplaatsen">Naar de stageplaatsen</Link>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
