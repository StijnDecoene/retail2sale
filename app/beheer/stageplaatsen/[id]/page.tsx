import Link from "next/link";
import { notFound } from "next/navigation";
import Formulier, { ActieKnop } from "@/components/beheer/Formulier";
import PlaatsVelden from "@/components/beheer/PlaatsVelden";
import { plaatsBewaren, plaatsVerwijderen } from "../../acties";
import { serverClient } from "@/lib/supabase/server";
import { PLAATS_KOLOMMEN, PLAATS_STATUS, volledigeNaam, type Stageplaats } from "@/lib/beheer";
import PartnerKaart from "@/components/beheer/PartnerKaart";

export const metadata = { title: "Stageplaats" };

type Stagiair = {
  id: string;
  blokken: { naam: string; schooljaar: string } | null;
  leerlingen: { id: string; voornaam: string; naam: string; klas: string } | null;
};

export default async function PlaatsFiche({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nieuw?: string }>;
}) {
  const { id } = await params;
  const { nieuw } = await searchParams;
  const sb = await serverClient();
  const { data } = await sb.from("stageplaatsen").select(`${PLAATS_KOLOMMEN}, partner, logo_op`).eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as Stageplaats;

  const { data: st } = await sb
    .from("dossiers")
    .select("id, blokken(naam, schooljaar), leerlingen(id, voornaam, naam, klas)")
    .eq("stageplaats_id", id);
  const stagiairs = ((st ?? []) as unknown as Stagiair[]).sort((a, b) =>
    `${b.blokken?.schooljaar}${b.blokken?.naam}`.localeCompare(`${a.blokken?.schooljaar}${a.blokken?.naam}`),
  );

  return (
    <>
      <p className="bh-kruimel"><Link href="/beheer/stageplaatsen">← Stageplaatsen</Link></p>
      <header className="bh-top">
        <div>
          <h1>{p.naam}</h1>
          <p className="sub">{[p.juridische_naam, p.gemeente].filter(Boolean).join(" · ") || "Stageplaats"}</p>
        </div>
        <span className={`pill ${PLAATS_STATUS[p.status].toon}`}>{PLAATS_STATUS[p.status].label}</span>
      </header>
      {nieuw && <p className="bh-melding ok">Stageplaats toegevoegd.</p>}

      <div className="bh-grid2">
        <section className="bh-card">
          <div className="hd"><h2>Gegevens</h2></div>
          <Formulier actie={plaatsBewaren} knop="Bewaren">
            <input type="hidden" name="id" value={p.id} />
            <PlaatsVelden p={p} />
          </Formulier>
        </section>

        <div className="bh-stack">
          <section className="bh-card">
            <div className="hd"><h2>Stagiairs</h2><span className="sm">{stagiairs.length}</span></div>
            {stagiairs.length === 0 ? (
              <p className="bh-leeg">Nog geen stagiairs gekoppeld. Koppel een stageplaats via de fiche van een leerling.</p>
            ) : (
              <table className="bh-tabel">
                <tbody>
                  {stagiairs.map((s) => (
                    <tr key={s.id}>
                      <td>{s.leerlingen ? <Link prefetch={false} className="nm" href={`/beheer/leerlingen/${s.leerlingen.id}`}>{volledigeNaam(s.leerlingen)}</Link> : "–"}</td>
                      <td>{s.leerlingen?.klas}</td>
                      <td className="sm">{s.blokken?.naam} {s.blokken?.schooljaar}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <PartnerKaart id={p.id} naam={p.naam} partner={!!p.partner} logoOp={p.logo_op ?? null} website={p.website} />

          <section className="bh-card bh-gevaar">
            <div className="hd"><h2>Verwijderen</h2></div>
            <form action={plaatsVerwijderen} className="bh-form">
              <input type="hidden" name="id" value={p.id} />
              <p className="sm">Liever niet: zet de status op &ldquo;Niet meer&rdquo; om de historiek te bewaren. Bij verwijderen verdwijnt de koppeling bij de stagiairs.</p>
              <div className="bh-form-voet">
                <ActieKnop className="bh-btn danger" bevestig={`${p.naam} definitief verwijderen?`}>Stageplaats verwijderen</ActieKnop>
              </div>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
