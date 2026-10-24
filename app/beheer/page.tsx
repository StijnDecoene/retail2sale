import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { teBeoordelen } from "@/lib/dossiers-server";
import { datumKort, doetMee, schooljaarVan, tijdstip, vandaagIso, type Blok, type Dossier, type Leerling, type Vraag } from "@/lib/beheer";

export const metadata = { title: "Overzicht" };

export default async function Overzicht() {
  const sj = schooljaarVan();
  const vandaag = vandaagIso();
  const sb = await serverClient();
  const sbPub = await serverClient("public");

  const [blokkenR, leerlingenR, plaatsenR, vragenR, nakijken] = await Promise.all([
    sb.from("blokken").select("*").eq("schooljaar", sj).order("start_datum"),
    sb.from("leerlingen").select("id, klas, status").eq("schooljaar", sj),
    sb.from("stageplaatsen").select("id", { count: "exact", head: true }).eq("status", "actief"),
    sbPub.from("vragen").select("*").eq("status", "nieuw").order("aangemaakt_op", { ascending: false }).limit(5),
    teBeoordelen(sb),
  ]);

  const blokken = (blokkenR.data ?? []) as Blok[];
  const leerlingen = (leerlingenR.data ?? []) as Pick<Leerling, "id" | "klas" | "status">[];
  const actief = leerlingen.filter((l) => l.status === "actief");
  const vragen = (vragenR.data ?? []) as Vraag[];

  const blok =
    blokken.find((b) => b.start_datum <= vandaag && vandaag <= b.eind_datum) ??
    blokken.find((b) => b.start_datum > vandaag) ??
    blokken.at(-1);
  const bezig = blok ? blok.start_datum <= vandaag && vandaag <= blok.eind_datum : false;

  let dossiers: Dossier[] = [];
  if (blok) {
    const { data } = await sb.from("dossiers").select("*").eq("blok_id", blok.id);
    dossiers = (data ?? []) as Dossier[];
  }
  // Enkel leerlingen van klassen die aan deze blokstage meedoen, tellen voor de stageplaats.
  const inBlok = actief.filter((l) => doetMee(blok, l.klas));
  const actiefIds = new Set(inBlok.map((l) => l.id));
  const metPlaats = dossiers.filter((d) => d.stageplaats_id && actiefIds.has(d.leerling_id)).length;

  const perKlas = new Map<string, number>();
  actief.forEach((l) => perKlas.set(l.klas, (perKlas.get(l.klas) ?? 0) + 1));
  const schemaFout = blokkenR.error;

  return (
    <>
      <header className="bh-top">
        <div>
          <h1>Overzicht</h1>
          <p className="sub">Onthaal, organisatie en sales · schooljaar {sj}</p>
        </div>
        {blok && (
          <div className="bh-blokinfo">
            <span className={bezig ? "pill ok" : "pill in"}>{bezig ? "Nu bezig" : "Volgende"}</span>
            <b>{blok.naam}</b>
            <span>{datumKort(blok.start_datum)} – {datumKort(blok.eind_datum)} · {blok.uren} uur</span>
          </div>
        )}
      </header>

      {schemaFout && (
        <p className="bh-melding">
          De databank is nog niet volledig ingesteld. Controleer of het schema <code>stage</code> zichtbaar is in Supabase
          (Data API → Exposed schemas).
        </p>
      )}

      <section className="bh-kpis" aria-label="Kerncijfers">
        <Link href="/beheer/leerlingen" className="bh-kpi">
          <span className="l">Actieve leerlingen</span>
          <span className="v">{actief.length}</span>
          {blok && inBlok.length !== actief.length && <span className="sm">{inBlok.length} in {blok.naam}</span>}
        </Link>
        <Link href="/beheer/leerlingen" className="bh-kpi">
          <span className="l">Stageplaats gekend{blok ? ` · ${blok.naam}` : ""}</span>
          <span className="v">{metPlaats} <small>/ {inBlok.length}</small></span>
          <span className="meter"><i style={{ width: `${inBlok.length ? (metPlaats / inBlok.length) * 100 : 0}%` }} /></span>
        </Link>
        <Link href="/beheer/stageplaatsen" className="bh-kpi">
          <span className="l">Stageplaatsen die meewerken</span>
          <span className="v">{plaatsenR.count ?? 0}</span>
        </Link>
        <Link href="/beheer/vragen" className={`bh-kpi${vragen.length ? " hot" : ""}`}>
          <span className="l">Nieuwe vragen</span>
          <span className="v">{vragen.length}</span>
        </Link>
      </section>

      <div className="bh-grid2">
        <section className="bh-card">
          <div className="hd"><h2>Actie nodig</h2></div>
          <div className="bh-lijst">
            {leerlingen.length === 0 && (
              <Link href="/beheer/leerlingen/import" className="bh-rij">
                <span className="sev warn" />
                <span className="t">Nog geen leerlingen<small>importeer de klaslijst uit Smartschool</small></span>
                <span className="pijl">→</span>
              </Link>
            )}
            {nakijken.top3 > 0 && (
              <Link href="/beheer/dossiers?filter=actie" className="bh-rij">
                <span className="sev bad" />
                <span className="t">Top 3 na te kijken<small>goedkeuren of laten aanpassen</small></span>
                <span className="c">{nakijken.top3}</span>
              </Link>
            )}
            {nakijken.aanvraag > 0 && (
              <Link href="/beheer/dossiers?filter=actie" className="bh-rij">
                <span className="sev bad" />
                <span className="t">Aanvragen na te kijken<small>bij goedkeuren komt de stageplaats in het dossier</small></span>
                <span className="c">{nakijken.aanvraag}</span>
              </Link>
            )}
            {nakijken.rooster > 0 && (
              <Link href="/beheer/dossiers?filter=actie" className="bh-rij">
                <span className="sev bad" />
                <span className="t">Werkroosters na te kijken<small>goedkeuren of terugsturen, ook wijzigingen</small></span>
                <span className="c">{nakijken.rooster}</span>
              </Link>
            )}
            {nakijken.contract > 0 && (
              <Link href="/beheer/dossiers?filter=contract" className="bh-rij">
                <span className="sev bad" />
                <span className="t">Contracten wachten op de school<small>alle andere partijen hebben getekend</small></span>
                <span className="c">{nakijken.contract}</span>
              </Link>
            )}
            {nakijken.afwezig > 0 && (
              <Link href="/beheer/afwezigheden" className="bh-rij">
                <span className="sev bad" />
                <span className="t">Afwezigheden te beoordelen<small>gewettigd of niet gewettigd</small></span>
                <span className="c">{nakijken.afwezig}</span>
              </Link>
            )}
            {nakijken.losInhaal > 0 && (
              <Link href="/beheer/afwezigheden?toon=los" className="bh-rij">
                <span className="sev warn" />
                <span className="t">Inhaalstage niet gekoppeld<small>de uren tellen pas mee na koppeling aan een afwezigheid</small></span>
                <span className="c">{nakijken.losInhaal}</span>
              </Link>
            )}
            {inBlok.length - metPlaats > 0 && blok && (
              <Link href="/beheer/leerlingen?filter=zonder-plaats" className="bh-rij">
                <span className="sev warn" />
                <span className="t">Nog geen stageplaats<small>{blok.naam}</small></span>
                <span className="c">{inBlok.length - metPlaats}</span>
              </Link>
            )}
            {vragen.map((v) => (
              <Link href="/beheer/vragen" className="bh-rij" key={v.id}>
                <span className="sev bad" />
                <span className="t">
                  Vraag van {v.naam}
                  <small>{v.onderwerp ?? "Geen onderwerp"} · {tijdstip(v.aangemaakt_op)}</small>
                </span>
                <span className="pijl">→</span>
              </Link>
            ))}
            {leerlingen.length > 0 && inBlok.length === metPlaats && vragen.length === 0 && nakijken.totaal === 0 && nakijken.afwezig === 0 && nakijken.losInhaal === 0 && (
              <p className="bh-leeg">Niets dringends. Alles is in orde.</p>
            )}
          </div>
        </section>

        <section className="bh-card">
          <div className="hd"><h2>Leerlingen per klas</h2></div>
          {perKlas.size === 0 ? (
            <p className="bh-leeg">Nog geen leerlingen voor {sj}.</p>
          ) : (
            <table className="bh-tabel">
              <thead><tr><th>Klas</th><th className="r">Actief</th>{blok && <th>{blok.naam}</th>}</tr></thead>
              <tbody>
                {[...perKlas.entries()].sort().map(([k, n]) => (
                  <tr key={k}><td><Link prefetch={false} href={`/beheer/leerlingen?klas=${encodeURIComponent(k)}`}>{k}</Link></td><td className="r">{n}</td>{blok && <td>{doetMee(blok, k) ? <span className="pill ok">doet mee</span> : <span className="pill mut">geen stage</span>}</td>}</tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="hd" style={{ borderTop: "1px solid var(--line)" }}><h2>Blokstages {sj}</h2></div>
          <table className="bh-tabel">
            <tbody>
              {blokken.map((b) => (
                <tr key={b.id}><td><b>{b.naam}</b>{b.klassen ? <><br /><small className="sm">{b.klassen.join(", ")}</small></> : null}</td><td>{datumKort(b.start_datum)} – {datumKort(b.eind_datum)}</td><td className="r">{b.uren} u</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
