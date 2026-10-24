import Formulier, { ActieKnop } from "@/components/beheer/Formulier";
import Ondertekening from "./Ondertekening";
import Kopieer from "./Kopieer";
import DirectieTekenen from "./DirectieTekenen";
import ActiviteitenBeheer from "./ActiviteitenBeheer";
import { contractGegevensBewaren, contractHandtekeningWissen, contractKlaarzettenActie, contractLeeftijdHerbepalen, contractLinkMailen } from "@/app/beheer/contract-acties";
import { leeftijdOp } from "@/lib/portaal";
import { contractBeheer } from "@/lib/contract-server";
import { HOEDANIGHEDEN, ROL_LABEL, SCHOOL_CONTRACT, contractStatus, effectief, getekend, magTekenen, nodigeRollen, type Rol } from "@/lib/contract";
import { mailIngesteld } from "@/lib/mail-server";
import type { serverClient, Begeleider } from "@/lib/supabase/server";

const tijd = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("nl-BE", { timeZone: "Europe/Brussels", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

/** Contract in het dossier: klaarzetten, links, stand van de ondertekening, tekenen voor de school, gegevens en logboek. */
export default async function ContractKaart({
  sb, dossierId, ik, site,
}: {
  sb: Awaited<ReturnType<typeof serverClient>>;
  dossierId: string;
  ik: Pick<Begeleider, "naam" | "rol">;
  site: string;
}) {
  const d = await contractBeheer(sb, dossierId);
  if (!d) {
    return (
      <section className="bh-card">
        <div className="hd"><h2>Stagecontract</h2><span className="pill mut">Nog niet klaargezet</span></div>
        <div className="bd">
          <p className="sm" style={{ marginBottom: 8 }}>Zet het contract klaar: de gegevens uit de aanvraag worden overgenomen en elke partij krijgt een persoonlijke link.</p>
          <Formulier actie={contractKlaarzettenActie} knop="Contract klaarzetten" className="bh-form-inline">
            <input type="hidden" name="dossier_id" value={dossierId} />
          </Formulier>
        </div>
      </section>
    );
  }
  const st = contractStatus(d);
  const g = effectief(d);
  const mailAan = mailIngesteld();
  const linkRollen = nodigeRollen(d.contract.meerderjarig).filter((r): r is Exclude<Rol, "directie"> => r !== "directie");
  const beheerder = ik.rol === "beheerder" || ik.rol === "directie";

  return (
    <section className="bh-card">
      <div className="hd">
        <h2>Stagecontract</h2>
        <span className={`pill ${st.afgerond ? "ok" : st.klaar ? "in" : "warn"}`}>
          {st.afgerond ? "Volledig ondertekend" : `${st.klaar} van ${st.totaal} getekend`}
        </span>
      </div>
      <div className="bd bh-stack">
        <Ondertekening d={d} />
        <div className="bh-acties">
          <a className="bh-btn" href={`/beheer/dossiers/${dossierId}/contract`} target="_blank" rel="noreferrer">Contract bekijken (pdf)</a>
          <a className="bh-btn" href={`/beheer/dossiers/${dossierId}/contract?download=1`}>Pdf downloaden</a>
        </div>

        <div className="bh-ct-leeftijd">
          <span className="sm">
            {(() => {
              const gd = d.aanvraag.stagiair?.geboortedatum;
              const lft = leeftijdOp(gd, d.blok.start_datum);
              return lft === null
                ? "Geen geldige geboortedatum in de aanvraag."
                : `Geboortedatum ${(gd ?? "").split("-").reverse().join("/")}: ${lft} jaar op de eerste stagedag.`;
            })()}{" "}
            <b>{d.contract.meerderjarig ? "Meerderjarig: 3 handtekeningen, geen ouder." : "Minderjarig: 4 handtekeningen, een ouder of voogd tekent mee."}</b>
          </span>
          {!getekend(d, "stagiair") && !getekend(d, "ouder") && (
            <Formulier actie={contractLeeftijdHerbepalen} knop="Leeftijd opnieuw bepalen" className="bh-form-inline">
              <input type="hidden" name="dossier_id" value={dossierId} />
            </Formulier>
          )}
        </div>

        {magTekenen(d, "directie") && (
          <div className="bh-ct-directie">
            <h3 className="bh-h3">Tekenen voor de school</h3>
            <DirectieTekenen dossierId={dossierId} naam={ik.naam} directeur={SCHOOL_CONTRACT.directeur} isDirectie={ik.rol === "directie"} />
          </div>
        )}

        <div>
          <h3 className="bh-h3">Persoonlijke links</h3>
          <p className="sm" style={{ margin: "4px 0 8px" }}>
            Wie de link heeft, kan het contract openen zonder in te loggen. Deel een link enkel met de juiste persoon.
            {!mailAan && " Mail versturen staat nog niet aan: kopieer de link en mail hem zelf."}
          </p>
          <table className="bh-tabel bh-ct-links">
            <tbody>
              {linkRollen.map((r) => {
                const p = d.partijenBeheer.find((x) => x.rol === r);
                if (!p?.token) return null;
                const url = `${site}/contract/${p.token}`;
                const standaardMail = p.email ?? (r === "stagegever" ? g.winkel_email : r === "stagiair" ? d.leerling.email ?? "" : "");
                return (
                  <tr key={r}>
                    <td><b>{ROL_LABEL[r]}</b><br /><small className="sm">{getekend(d, r) ? "getekend" : p.geopend_op ? `geopend ${tijd(p.geopend_op)}` : p.uitgenodigd_op ? `gemaild ${tijd(p.uitgenodigd_op)}` : "nog niet geopend"}</small></td>
                    <td className="bh-ct-actie">
                      <Kopieer tekst={url} />
                      <a className="bh-btn sm" href={url} target="_blank" rel="noreferrer">Openen</a>
                      {r === "ouder" && <small className="sm">De ouder kan ook meteen na de stagiair tekenen via de link van de stagiair.</small>}
                    </td>
                    <td>
                      {!getekend(d, r) && (
                        mailAan ? (
                          <Formulier actie={contractLinkMailen} knop="Link mailen" className="bh-ct-mail">
                            <input type="hidden" name="dossier_id" value={dossierId} />
                            <input type="hidden" name="rol" value={r} />
                            <input type="email" name="email" defaultValue={standaardMail} placeholder="e-mailadres" aria-label={`E-mailadres ${ROL_LABEL[r]}`} />
                          </Formulier>
                        ) : (
                          <a className="bh-btn sm" href={`mailto:${standaardMail}?subject=${encodeURIComponent(`Stagecontract ${d.leerling.voornaam} ${d.leerling.naam}`)}&body=${encodeURIComponent(`Via deze persoonlijke link kan u het stagecontract lezen en digitaal ondertekenen:\n\n${url}\n\nMet vriendelijke groeten,\nDe stagebegeleiders`)}`}>
                            Mail klaarzetten
                          </a>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <details className="bh-toevoegen bh-ct-sub">
          <summary>Gegevens van het contract wijzigen</summary>
          {st.klaar > 0 && <p className="bh-melding" style={{ margin: "8px 16px 0" }}>Er is al getekend. Een wijziging komt in het logboek; de partijen hoeven niet opnieuw te tekenen (beslissing 20 oktober).</p>}
          <Formulier actie={contractGegevensBewaren} knop="Bewaren">
            <input type="hidden" name="dossier_id" value={dossierId} />
            <div className="bh-fg">
              <label className="f">Naam ondertekenaar<input name="ondertekenaar" defaultValue={g.ondertekenaar} /></label>
              <label className="f">Hoedanigheid
                <select name="hoedanigheid" defaultValue={g.hoedanigheid}>
                  <option value="">Kies</option>
                  {[...new Set([...HOEDANIGHEDEN, g.hoedanigheid].filter(Boolean))].map((h) => <option key={h}>{h}</option>)}
                </select>
              </label>
              <label className="f">Naam winkel<input name="winkel_naam" defaultValue={g.winkel_naam} /></label>
              <label className="f">Adres (zetel)<input name="winkel_adres" defaultValue={g.winkel_adres} /></label>
              <label className="f">Telefoon winkel<input name="winkel_tel" defaultValue={g.winkel_tel} /></label>
              <label className="f">E-mail winkel<input name="winkel_email" defaultValue={g.winkel_email} /></label>
              <label className="f">Ondernemingsnummer<input name="kbo" defaultValue={g.kbo} /></label>
              <label className="f">Paritair comité<input name="pc" defaultValue={g.pc} /></label>
              <label className="f">RSZ-kengetal<input name="rsz" defaultValue={g.rsz} /></label>
              <label className="f">Mentor<input name="mentor" defaultValue={g.mentor} /></label>
              <label className="f">Gsm mentor<input name="mentor_tel" defaultValue={g.mentor_tel} /></label>
              <label className="f">Adres stagiair<input name="stagiair_adres" defaultValue={g.stagiair_adres} /></label>
              <label className="f">Risicoanalyse
                <select name="risico" defaultValue={g.risico}>
                  <option value="">Nog niet aangeduid</option>
                  <option value="heb">Heeft een risicoanalyse of werkpostfiche</option>
                  <option value="stuur">Geen werknemers: werkpostfiche sturen</option>
                </select>
              </label>
              <label className="f full">Niet toegelaten toestellen of taken<textarea name="toestellen" defaultValue={g.toestellen} /></label>
              <label className="f full">Andere afspraken<textarea name="afspraken" defaultValue={g.afspraken} /></label>
            </div>
          </Formulier>
        </details>

        <details className="bh-toevoegen bh-ct-sub">
          <summary>Activiteitenlijst ({g.activiteiten.length}{d.contract.gegevens.activiteiten?.length ? "" : ", voorstel"})</summary>
          <ActiviteitenBeheer dossierId={dossierId} catalogus={d.catalogus ?? []} stage={d.aanvraag?.bedrijf?.soort} start={g.activiteiten}
            bevestigd={!!d.contract.gegevens.activiteiten?.length} getekend={st.klaar > 0} />
        </details>

        {(d.log.length > 0 || beheerder) && (
          <details className="bh-toevoegen bh-ct-sub">
            <summary>Logboek{beheerder ? " en handtekeningen wissen" : ""}</summary>
            <div className="bd">
              <ul className="bh-maillog">
                {d.log.map((x, i) => <li key={i}>{tijd(x.op)} · {x.wie}: {x.wat}</li>)}
              </ul>
              {beheerder && (
                <div className="bh-acties" style={{ marginTop: 10 }}>
                  {nodigeRollen(d.contract.meerderjarig).filter((r) => getekend(d, r)).map((r) => (
                    <form key={r} action={contractHandtekeningWissen}>
                      <input type="hidden" name="dossier_id" value={dossierId} />
                      <input type="hidden" name="rol" value={r} />
                      <ActieKnop className="bh-btn sm danger" bevestig={`De handtekening van ${ROL_LABEL[r].toLowerCase()} wissen? Die partij moet dan opnieuw tekenen.`}>
                        Handtekening {ROL_LABEL[r].toLowerCase()} wissen
                      </ActieKnop>
                    </form>
                  ))}
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
