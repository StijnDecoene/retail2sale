import Beoordelen from "@/components/beheer/Beoordelen";
import Kopieer from "@/components/contract/Kopieer";
import { roosterBeoordelen } from "@/app/beheer/rooster-acties";
import { laadRooster } from "@/lib/werkrooster-server";
import { controle, dagKort, dagTekst, indienFouten, kalender, roosterStand, uren, verschillen, werkMin } from "@/lib/werkrooster";
import { mailIngesteld } from "@/lib/mail-server";
import type { serverClient } from "@/lib/supabase/server";

const tijd = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("nl-BE", { timeZone: "Europe/Brussels", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
const PIL: Record<string, string> = { leeg: "mut", concept: "mut", wijziging: "mut", terug: "warn", ingediend: "in", wijziging_ingediend: "in", goedgekeurd: "ok" };
const WIE: Record<string, string> = { stagegever: "de stagegever", stagiair: "de stagiair", school: "de school" };

/** Werkrooster in het dossier: stand, overzicht per week, wijzigingen, goedkeuren of terugsturen en de link voor de stagegever. */
export default async function RoosterKaart({
  sb, dossierId, leerlingId, blokId, site,
}: {
  sb: Awaited<ReturnType<typeof serverClient>>;
  dossierId: string;
  leerlingId: string;
  blokId: string;
  site: string;
}) {
  const ctx = await laadRooster(sb, { dossier: dossierId });
  if (!ctx) {
    return (
      <section className="bh-card">
        <div className="hd"><h2>Werkrooster</h2><span className="pill mut">Opent met het contract</span></div>
        <div className="bd"><p className="sm">Het werkrooster opent zodra het contract is klaargezet.</p></div>
      </section>
    );
  }
  const r = ctx.rooster;
  const stand = roosterStand(r);
  const dagen = r?.dagen ?? {};
  const c = controle(dagen, ctx.blok, ctx.uitzonderingen, ctx.meerderjarig);
  const fouten = indienFouten(c);
  const kal = kalender(ctx.blok, ctx.uitzonderingen);
  const diff = r?.vorige ? verschillen(r.vorige.dagen, dagen) : [];
  const { data: p } = await sb.from("contract_partijen").select("token").eq("dossier_id", dossierId).eq("rol", "stagegever").maybeSingle();
  const link = p?.token ? `${site}/rooster/${p.token}` : null;
  const alsLeerling = `/portaal?leerling=${leerlingId}&blok=${blokId}&stap=rooster`;

  return (
    <section className="bh-card">
      <div className="hd">
        <h2>Werkrooster</h2>
        <span className={`pill ${PIL[stand.code]}`}>{stand.label}</span>
      </div>
      <div className="bd bh-stack">
        {r && Object.keys(dagen).length > 0 ? (
          <>
            <p className="sm">
              <b>{uren(c.totaal)}</b> van {uren(c.doel)} op {c.aantalDagen} {c.aantalDagen === 1 ? "dag" : "dagen"}
              {r.bevestiging ? <> · bevestigd door <b>{r.bevestiging.naam}</b> op {tijd(r.bevestiging.at)}{r.ingediend_door ? ` (ingediend door ${WIE[r.ingediend_door] ?? r.ingediend_door})` : ""}</> : null}
              {r.status === "goedgekeurd" && r.goedgekeurd_op ? <> · goedgekeurd op {tijd(r.goedgekeurd_op)}</> : null}
              {r.bevestiging?.vakAkkoord ? <> · stage op vakantie- of zondagen in overleg</> : null}
            </p>
            {fouten.length > 0 && r.status !== "goedgekeurd" && <p className="bh-melding">{fouten.join(" ")}</p>}
            {diff.length > 0 && (
              <div className="wr-diff">
                <b>Gewijzigd tegenover het goedgekeurde rooster ({uren(r.vorige!.totaal_min)})</b>
                <ul>{diff.map((v) => <li key={v.iso}><span>{dagKort(v.iso)}</span> {dagTekst(v.oud)} → <b>{dagTekst(v.nieuw)}</b></li>)}</ul>
              </div>
            )}
            <div className="wr-mini">
              {kal.map((w) => {
                const dd = w.dagen.filter((d) => dagen[d.iso]);
                return (
                  <div key={w.maandag}>
                    <b>Week {w.nr} <small>{uren(c.weekMin[w.maandag] ?? 0)}</small></b>
                    {dd.length ? dd.map((d) => (
                      <span key={d.iso} className={c.dag[d.iso] ? "fout" : undefined}>{dagKort(d.iso)} · {dagTekst(dagen[d.iso]).replace(/ \(pauze (\d+) min\)/, " ($1')")} · {uren(werkMin(dagen[d.iso]))}</span>
                    )) : <span className="mut">geen stage</span>}
                  </div>
                );
              })}
            </div>
            {r.opmerkingen && <p className="sm"><b>Opmerkingen:</b> {r.opmerkingen}</p>}
          </>
        ) : (
          <p className="sm">Nog niets gepland. De stagegever plant via de persoonlijke link, de stagiair in het portaal.</p>
        )}

        {r?.status === "ingediend" && (
          <Beoordelen
            actie={roosterBeoordelen}
            dossierId={dossierId}
            goedLabel={r.vorige ? "Wijziging goedkeuren" : "Rooster goedkeuren"}
            terugLabel="Terugsturen"
            voorWie="de stagegever en de stagiair"
            extra={mailIngesteld() ? (
              <label className="pt-vink"><input type="checkbox" name="mailen" value="aan" defaultChecked /> <span>Goedgekeurd rooster als pdf mailen naar de mentor en de stagiair</span></label>
            ) : undefined}
          />
        )}

        <div className="bh-acties">
          {r && <a className="bh-btn" href={`/portaal/rooster-pdf?dossier=${dossierId}`} target="_blank" rel="noreferrer">Rooster als pdf</a>}
          <a className="bh-btn" href={alsLeerling}>Bekijken of aanpassen</a>
          {link && <><a className="bh-btn" href={link} target="_blank" rel="noreferrer">Link stagegever openen</a><Kopieer tekst={link} label="Link stagegever kopiëren" /></>}
        </div>
        {r?.historiek?.length ? (
          <p className="sm mut">Eerder goedgekeurd: {r.historiek.map((h) => `${tijd(h.goedgekeurd_op)} (${uren(h.totaal_min)})`).join(", ")}</p>
        ) : null}
      </div>
    </section>
  );
}
