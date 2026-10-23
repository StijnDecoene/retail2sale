import Link from "next/link";
import { notFound } from "next/navigation";
import Formulier, { ActieKnop } from "@/components/beheer/Formulier";
import { dossierBewaren, leerlingBewaren, leerlingVerwijderen } from "../../acties";
import { serverClient, type Begeleider } from "@/lib/supabase/server";
import { KLASSEN, LEERLING_STATUS, datumKort, volledigeNaam, type Blok, type Dossier, type Leerling } from "@/lib/beheer";

export const metadata = { title: "Leerling" };

export default async function LeerlingFiche({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await serverClient();
  const { data: l } = await sb.from("leerlingen").select("*").eq("id", id).maybeSingle();
  if (!l) notFound();
  const leerling = l as Leerling;

  const [bR, dR, pR, gR] = await Promise.all([
    sb.from("blokken").select("*").eq("schooljaar", leerling.schooljaar).order("start_datum"),
    sb.from("dossiers").select("*").eq("leerling_id", id),
    sb.from("stageplaatsen").select("id, naam, gemeente, status").order("naam"),
    sb.from("begeleiders").select("id, naam, actief").order("naam"),
  ]);
  const blokken = (bR.data ?? []) as Blok[];
  const dossiers = new Map(((dR.data ?? []) as Dossier[]).map((d) => [d.blok_id, d]));
  const plaatsen = (pR.data ?? []) as { id: string; naam: string; gemeente: string | null; status: string }[];
  const begeleiders = (gR.data ?? []) as Pick<Begeleider, "id" | "naam" | "actief">[];
  const klassen = KLASSEN.includes(leerling.klas) ? KLASSEN : [leerling.klas, ...KLASSEN];

  return (
    <>
      <p className="bh-kruimel"><Link href="/beheer/leerlingen">← Leerlingen</Link></p>
      <header className="bh-top">
        <div>
          <h1>{volledigeNaam(leerling)}</h1>
          <p className="sub">{leerling.klas} · schooljaar {leerling.schooljaar}</p>
        </div>
        <span className={`pill ${LEERLING_STATUS[leerling.status].toon}`}>{LEERLING_STATUS[leerling.status].label}</span>
      </header>

      <div className="bh-grid2">
        <section className="bh-card">
          <div className="hd"><h2>Fiche</h2></div>
          <Formulier actie={leerlingBewaren} knop="Bewaren">
            <input type="hidden" name="id" value={leerling.id} />
            <div className="bh-fg">
              <label className="f">Voornaam<input name="voornaam" defaultValue={leerling.voornaam} required /></label>
              <label className="f">Naam<input name="naam" defaultValue={leerling.naam} required /></label>
              <label className="f">Klas
                <select name="klas" defaultValue={leerling.klas}>{klassen.map((k) => <option key={k}>{k}</option>)}</select>
              </label>
              <label className="f">Smartschool-gebruikersnaam<input name="smartschool_gebruikersnaam" defaultValue={leerling.smartschool_gebruikersnaam ?? ""} /></label>
              <label className="f">E-mailadres<input name="email" type="email" defaultValue={leerling.email ?? ""} /></label>
              <label className="f">Gsm<input name="gsm" type="tel" defaultValue={leerling.gsm ?? ""} /></label>
              <label className="f">Leerlingstatus
                <select name="status" defaultValue={leerling.status}>
                  {Object.entries(LEERLING_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
              <label className="f">Sinds<input name="status_van" type="date" defaultValue={leerling.status_van ?? ""} /></label>
              <label className="f">Verwacht terug (bij ziekte)<input name="status_tot" type="date" defaultValue={leerling.status_tot ?? ""} /></label>
              <label className="f full">Notities (enkel voor begeleiders)<textarea name="notities" defaultValue={leerling.notities ?? ""} /></label>
            </div>
          </Formulier>
        </section>

        <div className="bh-stack">
          {blokken.length === 0 && <p className="bh-melding">Er zijn nog geen blokstages voor {leerling.schooljaar}. Voeg ze toe bij Instellingen.</p>}
          {blokken.map((b) => {
            const d = dossiers.get(b.id);
            return (
              <section className="bh-card" key={b.id}>
                <div className="hd">
                  <h2>{b.naam}</h2>
                  <span className="sm">{datumKort(b.start_datum)} – {datumKort(b.eind_datum)}</span>
                </div>
                <Formulier actie={dossierBewaren} knop="Bewaren">
                  <input type="hidden" name="leerling_id" value={leerling.id} />
                  <input type="hidden" name="blok_id" value={b.id} />
                  <div className="bh-fg">
                    <label className="f full">Stageplaats
                      <select name="stageplaats_id" defaultValue={d?.stageplaats_id ?? ""}>
                        <option value="">Nog niet gekend</option>
                        {plaatsen.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.naam}{p.gemeente ? ` (${p.gemeente})` : ""}{p.status !== "actief" ? " – werkt niet mee" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="f">Begeleider
                      <select name="begeleider_id" defaultValue={d?.begeleider_id ?? ""}>
                        <option value="">Nog niet toegewezen</option>
                        {begeleiders.filter((g) => g.actief || g.id === d?.begeleider_id).map((g) => <option key={g.id} value={g.id}>{g.naam}</option>)}
                      </select>
                    </label>
                    <label className="f">Mentor<input name="mentor_naam" defaultValue={d?.mentor_naam ?? ""} /></label>
                    <label className="f">Telefoon mentor<input name="mentor_telefoon" type="tel" defaultValue={d?.mentor_telefoon ?? ""} /></label>
                    <label className="f">E-mail mentor<input name="mentor_email" type="email" defaultValue={d?.mentor_email ?? ""} /></label>
                  </div>
                  {plaatsen.length === 0 && (
                    <p className="hint">Nog geen stageplaatsen in de databank. <Link href="/beheer/stageplaatsen">Voeg er een toe</Link>.</p>
                  )}
                </Formulier>
              </section>
            );
          })}

          <section className="bh-card bh-gevaar">
            <div className="hd"><h2>Verwijderen</h2></div>
            <form action={leerlingVerwijderen} className="bh-form">
              <input type="hidden" name="id" value={leerling.id} />
              <p className="sm">Verwijdert de fiche en de stagegegevens van deze leerling. Dit kan niet ongedaan worden.</p>
              <div className="bh-form-voet">
                <ActieKnop className="bh-btn danger" bevestig={`${volledigeNaam(leerling)} definitief verwijderen?`}>Leerling verwijderen</ActieKnop>
              </div>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
