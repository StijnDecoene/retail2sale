import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { doetMee, schooljaarVan, vandaagIso, volledigeNaam, type Blok, type Dossier, type Leerling } from "@/lib/beheer";
import { klaar } from "@/lib/afronding";
import { afrondingVoorDossiers } from "@/lib/afronding-server";
import { uren } from "@/lib/werkrooster";
import AfrondingLijst, { type AfRij } from "@/components/afronding/AfrondingLijst";

export const metadata = { title: "Afronding" };

export default async function AfrondingPagina({ searchParams }: { searchParams: Promise<{ blok?: string }> }) {
  const { blok: blokId } = await searchParams;
  const sb = await serverClient();
  const vandaag = vandaagIso();
  const { data: bData } = await sb.from("blokken").select("*").eq("schooljaar", schooljaarVan()).order("start_datum");
  const blokken = (bData ?? []) as Blok[];
  const blok = blokken.find((b) => b.id === blokId) ?? blokken.find((b) => b.eind_datum >= vandaag) ?? blokken.at(-1);
  if (!blok) return <p className="bh-leeg">Er is nog geen blokstage.</p>;
  const { data: dData } = await sb.from("dossiers").select("*").eq("blok_id", blok.id);
  const dossiers = (dData ?? []) as Dossier[];
  const [lR, pR] = await Promise.all([
    sb.from("leerlingen").select("*").in("id", [...new Set(dossiers.map((d) => d.leerling_id))]),
    sb.from("stageplaatsen").select("id, naam"),
  ]);
  const ll = new Map(((lR.data ?? []) as Leerling[]).map((l) => [l.id, l]));
  const plaatsen = new Map(((pR.data ?? []) as { id: string; naam: string }[]).map((x) => [x.id, x.naam]));
  const mee = dossiers.filter((d) => { const l = ll.get(d.leerling_id); return l && ["actief", "ziek"].includes(l.status) && doetMee(blok, l.klas) && d.stageplaats_id; });
  const { per, fout } = await afrondingVoorDossiers(sb, mee.map((d) => d.id), blok, vandaag);
  const rijen: AfRij[] = mee.map((d) => {
    const l = ll.get(d.leerling_id)!;
    const st = per.get(d.id)!;
    const c = (k: string) => st.checks.find((x) => x.k === k)?.ok ?? false;
    return {
      dossier_id: d.id, naam: volledigeNaam(l), klas: l.klas, plaats: plaatsen.get(d.stageplaats_id!) ?? "",
      uren: `${uren(st.u.gepresteerd)} / ${uren(st.u.vereist)}`, urenOk: c("uren"),
      rooster: c("rooster"), afw: c("afw"), eval: c("eval"), verslag: c("verslag"), feedback: c("feedback"),
      klaar: klaar(st.checks), afgerond: st.afronding ? st.afronding.afgerond_op.slice(0, 10).split("-").reverse().join("/") : null, code: st.afronding?.attest_code ?? null,
    };
  }).sort((a, b) => a.klas.localeCompare(b.klas) || a.naam.localeCompare(b.naam));

  return (
    <>
      <header className="bh-top">
        <div>
          <h1>Afronding</h1>
          <p className="sub">{blok.naam} · uren, evaluatie, stageverslag en feedback · stageattest en bedankmail</p>
        </div>
        {blokken.length > 1 && (
          <nav className="bh-seg" aria-label="Blokstage">{blokken.map((b) => <Link key={b.id} href={`/beheer/afronding?blok=${b.id}`} className={b.id === blok.id ? "on" : undefined}>{b.naam}</Link>)}</nav>
        )}
      </header>
      {fout && <p className="bh-melding">De databank mist nog de tabellen voor de afronding. Voer de migratie 20261031090000_afronding.sql uit.</p>}
      <AfrondingLijst rijen={rijen} />
    </>
  );
}
