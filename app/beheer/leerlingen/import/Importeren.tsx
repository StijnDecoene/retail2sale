"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { leerlingenImporteren, type ImportRij } from "../../acties";
import { leesTabel, raadKolommen } from "@/lib/tabel";

type Veld = "voornaam" | "naam" | "klas" | "smartschool_gebruikersnaam" | "email";

const VELDEN: { k: Veld; label: string; verplicht?: boolean; woorden: string[] }[] = [
  { k: "voornaam", label: "Voornaam", verplicht: true, woorden: ["voornaam", "firstname", "first name", "roepnaam"] },
  { k: "naam", label: "Naam", verplicht: true, woorden: ["naam", "achternaam", "familienaam", "lastname", "last name", "surname"] },
  { k: "klas", label: "Klas", verplicht: true, woorden: ["klas", "klasgroep", "klascode", "class", "groep"] },
  { k: "smartschool_gebruikersnaam", label: "Smartschool-gebruikersnaam", woorden: ["gebruikersnaam", "username", "login", "gebruiker"] },
  { k: "email", label: "E-mailadres", woorden: ["e-mail", "email", "e-mailadres", "emailadres", "mail"] },
];

export default function Importeren({ schooljaar }: { schooljaar: string }) {
  const [tekst, setTekst] = useState("");
  const [kolom, setKolom] = useState<Record<Veld, number> | null>(null);
  const [bezig, start] = useTransition();
  const [uitslag, setUitslag] = useState<{ fout?: string; nieuw?: number; bijgewerkt?: number; ongewijzigd?: number } | null>(null);

  const tabel = useMemo(() => leesTabel(tekst), [tekst]);
  const kop = tabel[0] ?? [];
  const data = tabel.slice(1);
  const map = kolom ?? (kop.length ? raadKolommen(kop, VELDEN) : null);

  const rijen: ImportRij[] = useMemo(() => {
    if (!map) return [];
    const get = (r: string[], v: Veld) => (map[v] >= 0 ? r[map[v]] ?? "" : "");
    return data.map((r) => ({
      voornaam: get(r, "voornaam"),
      naam: get(r, "naam"),
      klas: get(r, "klas"),
      smartschool_gebruikersnaam: get(r, "smartschool_gebruikersnaam") || null,
      email: get(r, "email") || null,
    }));
  }, [data, map]);
  const geldig = rijen.filter((r) => r.voornaam && r.naam && r.klas);
  const ontbreekt = map ? VELDEN.filter((v) => v.verplicht && map[v.k] < 0) : [];

  async function bestand(f: File | undefined) {
    if (!f) return;
    setUitslag(null);
    setKolom(null);
    setTekst(await f.text());
  }

  function importeer() {
    setUitslag(null);
    start(async () => setUitslag(await leerlingenImporteren(schooljaar, geldig)));
  }

  return (
    <section className="bh-card">
      <div className="hd"><h2>Klaslijst voor schooljaar {schooljaar}</h2></div>
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
              placeholder={"Voornaam;Naam;Klas;Gebruikersnaam;E-mail\nEmma;Peeters;5OS1;emma.peeters;emma.peeters@leerling.snh.be"}
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
                  <select
                    value={map[v.k]}
                    onChange={(e) => setKolom({ ...map, [v.k]: Number(e.target.value) })}
                  >
                    <option value={-1}>— niet gebruiken —</option>
                    {kop.map((h, i) => <option key={i} value={i}>{h || `Kolom ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
            </div>

            <h3 className="bh-h3">Voorbeeld ({geldig.length} van {rijen.length} rijen bruikbaar)</h3>
            <div className="bh-tw">
              <table className="bh-tabel">
                <thead><tr>{VELDEN.map((v) => <th key={v.k}>{v.label}</th>)}</tr></thead>
                <tbody>
                  {rijen.slice(0, 8).map((r, i) => (
                    <tr key={i} className={r.voornaam && r.naam && r.klas ? undefined : "ongeldig"}>
                      <td>{r.voornaam}</td><td>{r.naam}</td><td>{r.klas}</td><td>{r.smartschool_gebruikersnaam}</td><td>{r.email}</td>
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
              Klaar: {uitslag.nieuw} nieuw, {uitslag.bijgewerkt} bijgewerkt, {uitslag.ongewijzigd} ongewijzigd.{" "}
              <Link href="/beheer/leerlingen">Naar de leerlingen</Link>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
