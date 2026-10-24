import Link from "next/link";
import Formulier from "@/components/beheer/Formulier";
import PlaatsVelden from "@/components/beheer/PlaatsVelden";
import { plaatsToevoegen } from "../acties";
import { serverClient } from "@/lib/supabase/server";
import { PLAATS_KOLOMMEN, PLAATS_STATUS, SECTOREN, schooljaarVan, vandaagIso, type Blok, type Stageplaats } from "@/lib/beheer";

export const metadata = { title: "Stageplaatsen" };

type Zoek = { q?: string; sector?: string; status?: string };

export default async function Stageplaatsen({ searchParams }: { searchParams: Promise<Zoek> }) {
  const { q = "", sector = "", status = "" } = await searchParams;
  const sb = await serverClient();
  const sj = schooljaarVan();
  const vandaag = vandaagIso();

  const [pR, bR] = await Promise.all([
    sb.from("stageplaatsen").select(PLAATS_KOLOMMEN).order("naam"),
    sb.from("blokken").select("*").eq("schooljaar", sj).order("start_datum"),
  ]);
  const alle = (pR.data ?? []) as Stageplaats[];
  const blokken = (bR.data ?? []) as Blok[];
  const blok =
    blokken.find((b) => b.start_datum <= vandaag && vandaag <= b.eind_datum) ?? blokken.find((b) => b.start_datum > vandaag) ?? blokken.at(-1);

  const bezetting = new Map<string, number>();
  if (blok) {
    const { data } = await sb.from("dossiers").select("stageplaats_id").eq("blok_id", blok.id).not("stageplaats_id", "is", null);
    (data ?? []).forEach((d: { stageplaats_id: string }) => bezetting.set(d.stageplaats_id, (bezetting.get(d.stageplaats_id) ?? 0) + 1));
  }

  const zoek = q.trim().toLowerCase();
  const lijst = alle.filter(
    (p) =>
      (!sector || p.sector === sector) &&
      (!status || p.status === status) &&
      (!zoek || `${p.naam} ${p.juridische_naam ?? ""} ${p.gemeente ?? ""} ${p.contactpersoon ?? ""}`.toLowerCase().includes(zoek)),
  );

  return (
    <>
      <header className="bh-top">
        <div>
          <h1>Stageplaatsen</h1>
          <p className="sub">{alle.length} stageplaatsen over alle schooljaren{blok ? ` · bezetting in ${blok.naam}` : ""}</p>
        </div>
        <div className="bh-acties">
          <Link href="/beheer/stageplaatsen/import" className="bh-btn">Stageplaatsen importeren</Link>
        </div>
      </header>

      <form className="bh-toolbar" method="get">
        <input type="search" name="q" defaultValue={q} placeholder="Zoek op naam, gemeente of contactpersoon" aria-label="Zoeken" />
        <select name="sector" defaultValue={sector} aria-label="Sector">
          <option value="">Alle sectoren</option>
          {SECTOREN.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select name="status" defaultValue={status} aria-label="Status">
          <option value="">Elke status</option>
          {Object.entries(PLAATS_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button className="bh-btn" type="submit">Toon</button>
        {(q || sector || status) && <Link href="/beheer/stageplaatsen" className="bh-link">Wis filters</Link>}
      </form>

      <div className="bh-tw">
        {lijst.length === 0 ? (
          <div className="bh-leeg">
            <b>{alle.length === 0 ? "Nog geen stageplaatsen" : "Geen stageplaatsen gevonden"}</b>
            {alle.length === 0 ? "Voeg hieronder de eerste stageplaats toe." : "Pas de zoekterm of de filters aan."}
          </div>
        ) : (
          <table className="bh-tabel">
            <thead>
              <tr><th>Stageplaats</th><th>Sector</th><th>Gemeente</th><th>Contact</th><th className="c">Bezet</th><th>Status</th><th>Score</th></tr>
            </thead>
            <tbody>
              {lijst.map((p) => {
                const n = bezetting.get(p.id) ?? 0;
                const st = PLAATS_STATUS[p.status];
                return (
                  <tr key={p.id}>
                    <td><Link prefetch={false} className="nm" href={`/beheer/stageplaatsen/${p.id}`}>{p.naam}</Link>{p.juridische_naam ? <small className="sm"> · {p.juridische_naam}</small> : null}</td>
                    <td className="sm">{p.sector ?? ""}</td>
                    <td>{p.gemeente ?? ""}</td>
                    <td className="sm">{p.contactpersoon ?? p.telefoon ?? ""}</td>
                    <td className={`c${n >= p.max_stagiairs && p.max_stagiairs > 0 ? " vol" : ""}`}>{n}/{p.max_stagiairs}</td>
                    <td><span className={`pill ${st.toon}`}>{st.label}</span></td>
                    <td className="ster" aria-label={p.beoordeling ? `${p.beoordeling} op 5` : "Geen score"}>{p.beoordeling ? "★".repeat(p.beoordeling) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <details className="bh-card bh-toevoegen" open={alle.length === 0}>
        <summary>Stageplaats toevoegen</summary>
        <Formulier actie={plaatsToevoegen} knop="Toevoegen">
          <PlaatsVelden />
        </Formulier>
      </details>
    </>
  );
}
