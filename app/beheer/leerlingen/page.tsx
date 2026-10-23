import Link from "next/link";
import Formulier from "@/components/beheer/Formulier";
import { leerlingToevoegen } from "../acties";
import { serverClient, type Begeleider } from "@/lib/supabase/server";
import {
  KLASSEN,
  LEERLING_STATUS,
  schooljaarVan,
  vandaagIso,
  volledigeNaam,
  type Blok,
  type Dossier,
  type Leerling,
} from "@/lib/beheer";

export const metadata = { title: "Leerlingen" };

type Zoek = { q?: string; klas?: string; filter?: string; jaar?: string };

export default async function Leerlingen({ searchParams }: { searchParams: Promise<Zoek> }) {
  const { q = "", klas = "", filter = "", jaar } = await searchParams;
  const sj = jaar && /^\d{4}-\d{4}$/.test(jaar) ? jaar : schooljaarVan();
  const vandaag = vandaagIso();
  const sb = await serverClient();

  const [lR, bR, pR, gR] = await Promise.all([
    sb.from("leerlingen").select("*").eq("schooljaar", sj).order("klas").order("naam").order("voornaam"),
    sb.from("blokken").select("*").eq("schooljaar", sj).order("start_datum"),
    sb.from("stageplaatsen").select("id, naam, gemeente"),
    sb.from("begeleiders").select("id, naam, kleur"),
  ]);
  const alle = (lR.data ?? []) as Leerling[];
  const blokken = (bR.data ?? []) as Blok[];
  const blok =
    blokken.find((b) => b.start_datum <= vandaag && vandaag <= b.eind_datum) ?? blokken.find((b) => b.start_datum > vandaag) ?? blokken.at(-1);
  const plaatsen = new Map(((pR.data ?? []) as { id: string; naam: string; gemeente: string | null }[]).map((p) => [p.id, p]));
  const begeleiders = new Map(((gR.data ?? []) as Pick<Begeleider, "id" | "naam" | "kleur">[]).map((g) => [g.id, g]));

  let dossiers = new Map<string, Dossier>();
  if (blok) {
    const { data } = await sb.from("dossiers").select("*").eq("blok_id", blok.id);
    dossiers = new Map(((data ?? []) as Dossier[]).map((d) => [d.leerling_id, d]));
  }

  const zoek = q.trim().toLowerCase();
  const lijst = alle.filter((l) => {
    if (klas && l.klas !== klas) return false;
    if (zoek && !`${l.voornaam} ${l.naam} ${l.email ?? ""} ${l.smartschool_gebruikersnaam ?? ""}`.toLowerCase().includes(zoek)) return false;
    const d = dossiers.get(l.id);
    if (filter === "zonder-plaats") return l.status === "actief" && !d?.stageplaats_id;
    if (filter === "zonder-begeleider") return l.status === "actief" && !d?.begeleider_id;
    if (filter === "niet-actief") return l.status !== "actief";
    return true;
  });
  const klassen = [...new Set([...KLASSEN, ...alle.map((l) => l.klas)])].sort();

  return (
    <>
      <header className="bh-top">
        <div>
          <h1>Leerlingen</h1>
          <p className="sub">
            Schooljaar {sj} · {alle.length} leerlingen{blok ? ` · stagegegevens voor ${blok.naam}` : ""}
          </p>
        </div>
        <div className="bh-acties">
          <Link href="/beheer/leerlingen/import" className="bh-btn">Klaslijst importeren</Link>
        </div>
      </header>

      <form className="bh-toolbar" method="get">
        <input type="search" name="q" defaultValue={q} placeholder="Zoek op naam, e-mail of gebruikersnaam" aria-label="Zoeken" />
        <select name="klas" defaultValue={klas} aria-label="Klas">
          <option value="">Alle klassen</option>
          {klassen.map((k) => <option key={k}>{k}</option>)}
        </select>
        <select name="filter" defaultValue={filter} aria-label="Filter">
          <option value="">Iedereen</option>
          <option value="zonder-plaats">Nog geen stageplaats</option>
          <option value="zonder-begeleider">Nog geen begeleider</option>
          <option value="niet-actief">Niet actief</option>
        </select>
        <button className="bh-btn" type="submit">Toon</button>
        {(q || klas || filter) && <Link href="/beheer/leerlingen" className="bh-link">Wis filters</Link>}
      </form>

      <div className="bh-tw">
        {lijst.length === 0 ? (
          <div className="bh-leeg">
            <b>{alle.length === 0 ? "Nog geen leerlingen" : "Geen leerlingen gevonden"}</b>
            {alle.length === 0 ? (
              <>Importeer de klaslijst uit Smartschool, of voeg hieronder een leerling toe.</>
            ) : (
              <>Pas de zoekterm of de filters aan.</>
            )}
          </div>
        ) : (
          <table className="bh-tabel">
            <thead>
              <tr>
                <th>Leerling</th>
                <th>Klas</th>
                <th>Status</th>
                <th>Stageplaats</th>
                <th>Begeleider</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {lijst.map((l) => {
                const d = dossiers.get(l.id);
                const p = d?.stageplaats_id ? plaatsen.get(d.stageplaats_id) : null;
                const g = d?.begeleider_id ? begeleiders.get(d.begeleider_id) : null;
                const st = LEERLING_STATUS[l.status];
                return (
                  <tr key={l.id}>
                    <td><Link prefetch={false} className="nm" href={`/beheer/leerlingen/${l.id}`}>{volledigeNaam(l)}</Link></td>
                    <td>{l.klas}</td>
                    <td><span className={`pill ${st.toon}`}>{st.label}</span></td>
                    <td>{p ? <>{p.naam}{p.gemeente ? <small className="sm"> · {p.gemeente}</small> : null}</> : <span className="sm">–</span>}</td>
                    <td>{g ? <span className="beg" style={{ background: g.kleur ?? "#1D5BAA" }}>{g.naam}</span> : <span className="sm">–</span>}</td>
                    <td className="sm">{l.email ?? l.gsm ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <details className="bh-card bh-toevoegen" open={alle.length === 0}>
        <summary>Leerling toevoegen</summary>
        <Formulier actie={leerlingToevoegen} knop="Toevoegen" leegNaOk>
          <input type="hidden" name="schooljaar" value={sj} />
          <div className="bh-fg3">
            <label className="f">Voornaam<input name="voornaam" required /></label>
            <label className="f">Naam<input name="naam" required /></label>
            <label className="f">Klas
              <select name="klas" defaultValue="" required>
                <option value="" disabled>Kies</option>
                {KLASSEN.map((k) => <option key={k}>{k}</option>)}
              </select>
            </label>
            <label className="f">Smartschool-gebruikersnaam<input name="smartschool_gebruikersnaam" /></label>
            <label className="f">E-mailadres<input name="email" type="email" /></label>
            <label className="f">Gsm<input name="gsm" type="tel" /></label>
          </div>
        </Formulier>
      </details>
    </>
  );
}
