import Formulier, { ActieKnop } from "@/components/beheer/Formulier";
import { begeleiderActiefZetten, begeleiderToevoegen, blokBewaren, uitzonderingToevoegen, uitzonderingVerwijderen } from "../acties";
import { huidigeGebruiker, serverClient, type Begeleider } from "@/lib/supabase/server";
import { UITZ_SOORT, datumKort, schooljaarVan, type Blok, type Uitzondering } from "@/lib/beheer";

export const metadata = { title: "Instellingen" };

const ROL: Record<Begeleider["rol"], string> = { begeleider: "Stagebegeleider", beheerder: "Beheerder", directie: "Directie" };

export default async function Instellingen() {
  const sj = schooljaarVan();
  const sb = await serverClient();
  const { begeleider: ik } = await huidigeGebruiker();
  const magBeheren = ik?.rol === "beheerder" || ik?.rol === "directie";

  const [gR, bR, uR] = await Promise.all([
    sb.from("begeleiders").select("*").order("naam"),
    sb.from("blokken").select("*").eq("schooljaar", sj).order("start_datum"),
    sb.from("uitzonderingen").select("*").order("van"),
  ]);
  const begeleiders = (gR.data ?? []) as Begeleider[];
  const blokken = (bR.data ?? []) as Blok[];
  const uitz = (uR.data ?? []) as Uitzondering[];

  return (
    <>
      <header className="bh-top">
        <div>
          <h1>Instellingen</h1>
          <p className="sub">Begeleiders, blokstages en uitzonderingen · schooljaar {sj}</p>
        </div>
      </header>

      <section className="bh-card">
        <div className="hd"><h2>Begeleiders</h2><span className="sm">Wie op deze lijst staat, kan inloggen in het beheer.</span></div>
        <table className="bh-tabel">
          <thead><tr><th>Naam</th><th>E-mailadres</th><th>Rol</th><th>Telefoon</th><th>Toegang</th></tr></thead>
          <tbody>
            {begeleiders.map((g) => (
              <tr key={g.id} className={g.actief ? undefined : "uit"}>
                <td><span className="dotje" style={{ background: g.kleur ?? "#1D5BAA" }} />{g.naam}</td>
                <td>{g.email}</td>
                <td>{ROL[g.rol]}</td>
                <td>{g.telefoon ?? ""}</td>
                <td>
                  {magBeheren && g.id !== ik?.id ? (
                    <form action={begeleiderActiefZetten}>
                      <input type="hidden" name="id" value={g.id} />
                      <input type="hidden" name="actief" value={String(!g.actief)} />
                      <ActieKnop className="bh-btn sm">{g.actief ? "Toegang intrekken" : "Toegang geven"}</ActieKnop>
                    </form>
                  ) : (
                    <span className={`pill ${g.actief ? "ok" : "mut"}`}>{g.actief ? "Actief" : "Geen toegang"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {magBeheren ? (
          <Formulier actie={begeleiderToevoegen} knop="Begeleider toevoegen" leegNaOk>
            <div className="bh-fg4">
              <label className="f">Naam<input name="naam" required /></label>
              <label className="f">E-mailadres van school<input name="email" type="email" placeholder="voornaam.naam@snh.be" required /></label>
              <label className="f">Rol
                <select name="rol" defaultValue="begeleider">
                  {Object.entries(ROL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
              <label className="f">Telefoon<input name="telefoon" type="tel" /></label>
            </div>
          </Formulier>
        ) : (
          <p className="bd sm">Enkel een beheerder of de directie kan begeleiders toevoegen.</p>
        )}
      </section>

      <div className="bh-grid2">
        {blokken.map((b) => (
          <section className="bh-card" key={b.id}>
            <div className="hd"><h2>{b.naam}</h2><span className="sm">{sj}</span></div>
            <Formulier actie={blokBewaren} knop="Bewaren">
              <input type="hidden" name="id" value={b.id} />
              <div className="bh-fg">
                <label className="f">Naam<input name="naam" defaultValue={b.naam} /></label>
                <label className="f">Deadline top 3<input name="deadline_top3" type="date" defaultValue={b.deadline_top3 ?? ""} /></label>
                <label className="f">Eerste stagedag<input name="start_datum" type="date" defaultValue={b.start_datum} required /></label>
                <label className="f">Laatste stagedag<input name="eind_datum" type="date" defaultValue={b.eind_datum} required /></label>
                <label className="f">Totaal uren<input name="uren" type="number" min={1} defaultValue={b.uren} /></label>
                <label className="f">Gemiddeld per week<input name="uren_per_week" type="number" min={1} defaultValue={b.uren_per_week} /></label>
              </div>
            </Formulier>

            <h3 className="bh-h3 bd">Vakanties en uitzonderingen</h3>
            <table className="bh-tabel">
              <tbody>
                {uitz.filter((u) => u.blok_id === b.id).map((u) => (
                  <tr key={u.id}>
                    <td>{datumKort(u.van)}{u.tot !== u.van ? ` – ${datumKort(u.tot)}` : ""}</td>
                    <td><b>{u.naam}</b><br /><small className="sm">{UITZ_SOORT[u.soort]}</small></td>
                    <td className="r">
                      <form action={uitzonderingVerwijderen}>
                        <input type="hidden" name="id" value={u.id} />
                        <ActieKnop className="bh-btn sm ghost" bevestig={`"${u.naam}" verwijderen?`}>Verwijderen</ActieKnop>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Formulier actie={uitzonderingToevoegen} knop="Uitzondering toevoegen" leegNaOk>
              <input type="hidden" name="blok_id" value={b.id} />
              <div className="bh-fg">
                <label className="f">Van<input name="van" type="date" required /></label>
                <label className="f">Tot en met<input name="tot" type="date" /></label>
                <label className="f">Omschrijving<input name="naam" placeholder="bv. Pedagogische studiedag" required /></label>
                <label className="f">Soort
                  <select name="soort" defaultValue="vakantie">
                    {Object.entries(UITZ_SOORT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </label>
              </div>
            </Formulier>
          </section>
        ))}
        {blokken.length === 0 && <p className="bh-melding">Er zijn nog geen blokstages voor {sj}.</p>}
      </div>
    </>
  );
}
