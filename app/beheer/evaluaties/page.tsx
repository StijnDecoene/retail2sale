import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { doetMee, schooljaarVan, vandaagIso, volledigeNaam, type Blok, type Dossier, type Leerling } from "@/lib/beheer";
import { PUNTEN_STANDAARD, formulier, puntVoorstel, score, type EvaluatieRij, type Puntenschema, type Resultaat } from "@/lib/evaluaties";
import EvaluatieLijst, { type EvRij } from "@/components/evaluatie/EvaluatieLijst";

export const metadata = { title: "Evaluaties" };

export default async function Evaluaties({ searchParams }: { searchParams: Promise<{ blok?: string }> }) {
  const { blok: blokId } = await searchParams;
  const sb = await serverClient();
  const vandaag = vandaagIso();
  const { data: bData } = await sb.from("blokken").select("*").eq("schooljaar", schooljaarVan()).order("start_datum");
  const blokken = (bData ?? []) as Blok[];
  const blok = blokken.find((b) => b.id === blokId) ?? blokken.find((b) => b.eind_datum >= vandaag) ?? blokken.at(-1);
  if (!blok) return <p className="bh-leeg">Er is nog geen blokstage.</p>;
  const { data: dData } = await sb.from("dossiers").select("*").eq("blok_id", blok.id);
  const dossiers = (dData ?? []) as Dossier[];
  const ids = dossiers.map((d) => d.id);
  const [lR, eR, rR, aR, pR, iR] = await Promise.all([
    sb.from("leerlingen").select("*").in("id", [...new Set(dossiers.map((d) => d.leerling_id))]),
    ids.length ? sb.from("evaluaties").select("*").in("dossier_id", ids) : Promise.resolve({ data: [], error: null }),
    ids.length ? sb.from("evaluatie_resultaten").select("*").in("dossier_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? sb.from("aanvragen").select("dossier_id, gegevens").in("dossier_id", ids) : Promise.resolve({ data: [] }),
    sb.from("stageplaatsen").select("id, naam"),
    sb.from("evaluatie_instellingen").select("punten").eq("blok_id", blok.id).maybeSingle(),
  ]);
  const p: Puntenschema = { ...PUNTEN_STANDAARD, ...((iR.data?.punten as Partial<Puntenschema> | undefined) ?? {}) };
  const ll = new Map(((lR.data ?? []) as Leerling[]).map((l) => [l.id, l]));
  const ev = (eR.data ?? []) as EvaluatieRij[];
  const res = new Map(((rR.data ?? []) as Resultaat[]).map((r) => [r.dossier_id, r]));
  const soortVan = new Map(((aR.data ?? []) as { dossier_id: string; gegevens: { bedrijf?: { soort?: string } } }[]).map((a) => [a.dossier_id, (a.gegevens?.bedrijf?.soort ?? "") as "sales" | "onthaal" | ""]));
  const plaatsen = new Map(((pR.data ?? []) as { id: string; naam: string }[]).map((x) => [x.id, x.naam]));

  const rijen: EvRij[] = dossiers.flatMap((d) => {
    const l = ll.get(d.leerling_id);
    if (!l || !["actief", "ziek"].includes(l.status) || !doetMee(blok, l.klas)) return [];
    const stage = soortVan.get(d.id) ?? "";
    const e = (s: EvaluatieRij["soort"]) => ev.find((x) => x.dossier_id === d.id && x.soort === s);
    const sc = (s: "mentor" | "school") => { const x = e(s); return x?.status === "ingediend" ? score(formulier(s, stage), x.antwoorden, p) : null; };
    const r = res.get(d.id);
    return [{
      dossier_id: d.id, naam: volledigeNaam(l), klas: l.klas, plaats: d.stageplaats_id ? plaatsen.get(d.stageplaats_id) ?? "" : "",
      mentor: e("mentor")?.status ?? null, school: e("school")?.status ?? null, zelf: e("zelf")?.status ?? null,
      voorstel: puntVoorstel(sc("mentor"), sc("school"), p), eindpunt: r?.eindpunt ?? null, vrijgegeven: !!r?.vrijgegeven_op,
    }];
  }).sort((a, b) => a.klas.localeCompare(b.klas) || a.naam.localeCompare(b.naam));

  return (
    <>
      <header className="bh-top">
        <div>
          <h1>Evaluaties</h1>
          <p className="sub">{blok.naam} · mentor, stagebezoek en zelfevaluatie · eindpunt op {p.op}</p>
        </div>
        {blokken.length > 1 && (
          <nav className="bh-seg" aria-label="Blokstage">{blokken.map((b) => <Link key={b.id} href={`/beheer/evaluaties?blok=${b.id}`} className={b.id === blok.id ? "on" : undefined}>{b.naam}</Link>)}</nav>
        )}
      </header>
      {eR.error && <p className="bh-melding">De databank mist nog de tabellen voor de evaluaties. Voer de migratie 20261030090000_evaluaties.sql uit.</p>}
      <EvaluatieLijst blokId={blok.id} rijen={rijen} punten={p} />
    </>
  );
}
