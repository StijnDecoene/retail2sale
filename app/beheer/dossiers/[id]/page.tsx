import Link from "next/link";
import { notFound } from "next/navigation";
import Formulier, { ActieKnop } from "@/components/beheer/Formulier";
import Beoordelen from "@/components/beheer/Beoordelen";
import { AanvraagSamenvatting, Top3Samenvatting } from "@/components/portaal/Samenvatting";
import { aanvraagBeoordelen, beoordelingIntrekken, bevestigingMailen, top3Beoordelen } from "../../acties";
import { laadBevestiging } from "@/lib/bevestiging-server";
import { bevestigingMail } from "@/lib/bevestiging-mail";
import { mailAfzender, mailIngesteld } from "@/lib/mail-server";
import { siteAdres } from "@/lib/bevestiging-versturen";
import { huidigeGebruiker, serverClient, type Begeleider } from "@/lib/supabase/server";
import ContractKaart from "@/components/contract/ContractKaart";
import RoosterKaart from "@/components/rooster/RoosterKaart";
import TijdensKaart from "@/components/rooster/TijdensKaart";
import EvaluatieKaart from "@/components/evaluatie/EvaluatieKaart";
import { bezettingsChecker } from "@/lib/stageplaats-bezetting";
import { datumKort, tijdstip, volledigeNaam, zoekPlaats, type Blok, type Dossier, type Leerling, type Stageplaats } from "@/lib/beheer";
import { stapStatus, type AanvraagRij, type Beoordeling, type Profiel, type StapStatus, type Top3Rij } from "@/lib/portaal";

export const metadata = { title: "Stagedossier" };
const TOON: Record<StapStatus["state"], string> = { done: "ok", wait: "in", action: "mut", fix: "warn", locked: "mut" };

export default async function DossierPagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await serverClient();
  const { data: dd } = await sb.from("dossiers").select("*").eq("id", id).maybeSingle();
  if (!dd) notFound();
  const d = dd as Dossier;

  const [lR, bR, tR, aR, oR, gR, pR] = await Promise.all([
    sb.from("leerlingen").select("*").eq("id", d.leerling_id).single(),
    sb.from("blokken").select("*").eq("id", d.blok_id).single(),
    sb.from("top3").select("*").eq("dossier_id", id).maybeSingle(),
    sb.from("aanvragen").select("*").eq("dossier_id", id).maybeSingle(),
    sb.from("beoordelingen").select("*").eq("dossier_id", id),
    sb.from("begeleiders").select("id, naam"),
    sb.from("stageplaatsen").select("id, naam, gemeente, kbo"),
  ]);
  const l = lR.data as Leerling;
  const blok = bR.data as Blok;
  const top3 = (tR.data as Top3Rij | null) ?? null;
  const aanvraag = (aR.data as AanvraagRij | null) ?? null;
  const beoordelingen = (oR.data ?? []) as Beoordeling[];
  const namen = new Map(((gR.data ?? []) as Pick<Begeleider, "id" | "naam">[]).map((g) => [g.id, g.naam]));
  const plaatsen = (pR.data ?? []) as Pick<Stageplaats, "id" | "naam" | "gemeente" | "kbo">[];
  const { data: pf } = await sb.from("leerling_profielen").select("gegevens").eq("leerling_id", l.id).maybeSingle();
  const profiel = (pf?.gegevens ?? {}) as Profiel;

  const st = stapStatus({ stageplaats_id: d.stageplaats_id, top3, aanvraag, beoordelingen });
  const b3 = beoordelingen.find((b) => b.stap === "top3");
  const ba = beoordelingen.find((b) => b.stap === "aanvraag");
  const huidigePlaats = d.stageplaats_id ? plaatsen.find((p) => p.id === d.stageplaats_id) : undefined;

  // Heeft een andere leerling in deze blokstage dezelfde winkel al (geplaatst, aanvraag of goedgekeurde top 3)?
  const check = await bezettingsChecker(sb, blok.id, id);
  const top3Meldingen = (top3?.keuzes ?? []).map((k) => check(k.winkel, k.gemeente));
  const bedrijf = aanvraag?.gegevens.bedrijf;
  const aanvraagMeldingen = bedrijf ? check(bedrijf.naam, bedrijf.gemeente, bedrijf.kbo) : [];
  const match = bedrijf?.naam ? zoekPlaats(plaatsen, bedrijf.naam, bedrijf.gemeente ?? null, bedrijf.kbo ?? null) : undefined;
  const plaatsUitleg = !bedrijf?.naam
    ? undefined
    : match
      ? `Bij goedkeuren wordt het dossier gekoppeld aan de bestaande stageplaats "${match.naam}${match.gemeente ? `, ${match.gemeente}` : ""}" (lege velden worden aangevuld).`
      : `Bij goedkeuren wordt "${bedrijf.naam}" als nieuwe stageplaats aangemaakt en aan het dossier gekoppeld.`;

  const mailAan = mailIngesteld();
  const site = await siteAdres();
  const { begeleider: ik } = await huidigeGebruiker();
  const bevestiging = ba?.status === "goedgekeurd" ? await laadBevestiging(sb, id, site) : null;
  const mail = bevestiging ? bevestigingMail(bevestiging, site, "stagegever") : null;
  const mailLln = bevestiging ? bevestigingMail(bevestiging, site, "stagiair") : null;
  const { data: mR } = bevestiging ? await sb.from("mails").select("*").eq("dossier_id", id).order("verstuurd_op", { ascending: false }) : { data: null };
  const mails = (mR ?? []) as { id: string; aan: string[]; verstuurd_op: string; fout: string | null; door: string | null }[];
  const maakMailto = (m: typeof mail) =>
    m ? `mailto:${m.aan.join(",")}?${m.cc.length ? `cc=${encodeURIComponent(m.cc.join(","))}&` : ""}subject=${encodeURIComponent(m.onderwerp)}&body=${encodeURIComponent(m.tekst)}` : "";

  const beoordeeld = (b: Beoordeling) => (
    <p className="sm">
      {b.status === "goedgekeurd" ? "Goedgekeurd" : "Teruggestuurd"} door {b.door ? namen.get(b.door) ?? "een begeleider" : "een begeleider"} op {tijdstip(b.op)}
      {b.feedback ? <> · <i>&ldquo;{b.feedback}&rdquo;</i></> : null}
    </p>
  );

  return (
    <>
      <p className="bh-kruimel"><Link href={`/beheer/dossiers?blok=${blok.id}`}>← Stagedossiers</Link></p>
      <header className="bh-top">
        <div>
          <h1>{volledigeNaam(l)}</h1>
          <p className="sub">{l.klas} · {blok.naam} ({datumKort(blok.start_datum)} – {datumKort(blok.eind_datum)})</p>
        </div>
        <div className="bh-acties">
          <Link className="bh-btn" href={`/beheer/leerlingen/${l.id}`}>Fiche</Link>
          <Link className="bh-btn" href={`/portaal?leerling=${l.id}&blok=${blok.id}`}>Bekijk als leerling</Link>
        </div>
      </header>

      {huidigePlaats && (
        <p className="bh-melding ok">Stageplaats in het dossier: <b>{huidigePlaats.naam}</b>{huidigePlaats.gemeente ? `, ${huidigePlaats.gemeente}` : ""}{d.mentor_naam ? ` · mentor ${d.mentor_naam}` : ""}</p>
      )}

      <div className="bh-grid2">
        <section className="bh-card">
          <div className="hd">
            <h2>Top 3</h2>
            <span className={`pill ${TOON[st.top3.state]}`}>{st.top3.label}</span>
          </div>
          {!top3 ? (
            <p className="bh-leeg">{st.top3.code === "geregeld" ? "Stageplaats al geregeld buiten het portaal: geen top 3 nodig." : "De leerling heeft nog geen top 3 ingevuld."}</p>
          ) : (
            <div className="bd">
              {top3.ingediend_op && <p className="sm" style={{ marginBottom: 8 }}>Ingediend op {tijdstip(top3.ingediend_op)}{top3.status === "concept" ? " · nu weer in concept" : ""}</p>}
              <Top3Samenvatting keuzes={top3.keuzes} goedgekeurd={b3?.status === "goedgekeurd" ? b3.keuzes : []} profiel={profiel} meldingen={top3Meldingen} />
            </div>
          )}
          {b3 && (
            <div className="bd bh-beoordeeld">
              {beoordeeld(b3)}
              {!(b3.status === "goedgekeurd" && ba?.status === "goedgekeurd") && (
                <form action={beoordelingIntrekken}>
                  <input type="hidden" name="dossier_id" value={id} />
                  <input type="hidden" name="stap" value="top3" />
                  <ActieKnop className="bh-btn sm ghost" bevestig="Deze beoordeling intrekken?">Intrekken</ActieKnop>
                </form>
              )}
            </div>
          )}
          {top3 && b3?.status !== "goedgekeurd" && top3.status === "ingediend" && (
            <Beoordelen
              actie={top3Beoordelen}
              dossierId={id}
              keuzes={top3.keuzes.map((k, i) => ({ nr: i + 1, label: k.winkel || `Keuze ${i + 1}` }))}
              goedLabel="Top 3 goedkeuren"
            />
          )}
          {top3 && top3.status === "concept" && b3?.status !== "goedgekeurd" && (
            <p className="bh-leeg">De leerling werkt nog aan de top 3 (concept).</p>
          )}
        </section>

        <section className="bh-card">
          <div className="hd">
            <h2>Aanvraag</h2>
            <span className={`pill ${TOON[st.aanvraag.state]}`}>{st.aanvraag.label}</span>
          </div>
          {!aanvraag ? (
            <p className="bh-leeg">{st.aanvraag.state === "locked" ? "Opent zodra de top 3 is goedgekeurd." : st.aanvraag.code === "geregeld" ? "Stageplaats al geregeld buiten het portaal." : "De leerling heeft de aanvraag nog niet ingevuld."}</p>
          ) : (
            <div className="bd">
              {aanvraag.ingediend_op && <p className="sm" style={{ marginBottom: 8 }}>Ingediend op {tijdstip(aanvraag.ingediend_op)}{aanvraag.keuze_nr ? ` · keuze ${aanvraag.keuze_nr} uit de top 3` : ""}{aanvraag.status === "concept" ? " · nu weer in concept" : ""}</p>}
              <AanvraagSamenvatting g={aanvraag.gegevens} />
            </div>
          )}
          {ba && (
            <div className="bd bh-beoordeeld">
              {beoordeeld(ba)}
              <form action={beoordelingIntrekken}>
                <input type="hidden" name="dossier_id" value={id} />
                <input type="hidden" name="stap" value="aanvraag" />
                <ActieKnop className="bh-btn sm ghost" bevestig="Deze beoordeling intrekken? De stageplaats blijft in het dossier staan; pas die zo nodig aan in de fiche.">Intrekken</ActieKnop>
              </form>
            </div>
          )}
          {aanvraag && ba?.status !== "goedgekeurd" && aanvraag.status === "ingediend" && (
            <>
            {aanvraagMeldingen.length > 0 && (
              <div className="bh-melding bh-ct-waarschuwing"><b>Let op: deze winkel</b><ul>{aanvraagMeldingen.map((m) => <li key={m}>{m}</li>)}</ul></div>
            )}
            <Beoordelen
              actie={aanvraagBeoordelen}
              dossierId={id}
              goedLabel="Aanvraag goedkeuren"
              uitleg={plaatsUitleg}
              extra={
                <label className="bh-vink">
                  <input type="checkbox" name="bevestiging" value="aan" defaultChecked={mailAan} disabled={!mailAan} />
                  <span>
                    Bevestiging mailen naar stagegever en stagiair, met de pdf en de infobrochure
                    {!mailAan && <small> (mail versturen is nog niet ingesteld: zet de mail daarna klaar in je eigen mailprogramma)</small>}
                  </span>
                </label>
              }
            />
            </>
          )}
          {aanvraag && aanvraag.status === "concept" && ba?.status !== "goedgekeurd" && (
            <p className="bh-leeg">De leerling werkt nog aan de aanvraag (concept).</p>
          )}
        </section>
      </div>

      {bevestiging && mail && (
        <section className="bh-card">
          <div className="hd">
            <h2>Bevestiging aan stagegever en stagiair</h2>
            {mails.some((x) => !x.fout) ? <span className="pill ok">Gemaild</span> : <span className="pill warn">Nog niet gemaild</span>}
          </div>
          <div className="bd bh-stack">
            <p className="sm">
              Stagegever: {mail.aan.join(", ") || "geen e-mailadres"} (cc {mail.cc.join(", ")}, met de persoonlijke contractlink)
              <br />Stagiair: {mailLln?.aan.join(", ") || "geen e-mailadres"} (zonder contractlink) · van {mailAfzender()}
              <br />Onderwerp: {mail.onderwerp}
            </p>
            <div className="bh-acties">
              <a className="bh-btn" href={`/beheer/dossiers/${id}/bevestiging?soort=mail`} target="_blank" rel="noreferrer">Mail stagegever bekijken</a>
              <a className="bh-btn" href={`/beheer/dossiers/${id}/bevestiging?soort=mail&voor=stagiair`} target="_blank" rel="noreferrer">Mail stagiair bekijken</a>
              <a className="bh-btn" href={`/beheer/dossiers/${id}/bevestiging`} target="_blank" rel="noreferrer">Pdf bekijken</a>
              <a className="bh-btn" href={`/beheer/dossiers/${id}/bevestiging?download=1`}>Pdf downloaden</a>
              <a className="bh-btn" href="/docs/infobrochure-stage-2026-2027.pdf" target="_blank" rel="noreferrer">Infobrochure</a>
            </div>
            {mailAan ? (
              <Formulier actie={bevestigingMailen} knop={mails.some((x) => !x.fout) ? "Opnieuw mailen" : "Bevestiging mailen"} className="bh-form-inline">
                <input type="hidden" name="dossier_id" value={id} />
              </Formulier>
            ) : (
              <div className="bh-melding">
                Mail versturen vanuit {mailAfzender()} is nog niet ingesteld. Tot dan: download de pdf, zet de mails klaar en voeg de pdf en de infobrochure toe als bijlage:{" "}
                <a href={maakMailto(mail)}><b>mail voor de stagegever</b></a>
                {mailLln?.aan.length ? <> · <a href={maakMailto(mailLln)}><b>mail voor de stagiair</b></a></> : null}
              </div>
            )}
            {mails.length > 0 && (
              <ul className="bh-maillog">
                {mails.map((x) => (
                  <li key={x.id}>
                    {tijdstip(x.verstuurd_op)} · {x.fout ? <span className="bh-fout">mislukt: {x.fout}</span> : <>naar {x.aan.join(", ")}</>}
                    {x.door ? ` · ${namen.get(x.door) ?? ""}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
      {ba?.status === "goedgekeurd" && ik && <ContractKaart sb={sb} dossierId={id} ik={ik} site={site} />}
      {(ba?.status === "goedgekeurd" || d.stageplaats_id) && <RoosterKaart sb={sb} dossierId={id} leerlingId={l.id} blokId={blok.id} site={site} />}
      {(ba?.status === "goedgekeurd" || d.stageplaats_id) && ik && <TijdensKaart sb={sb} dossierId={id} ikNaam={ik.naam} site={site} />}
      {(ba?.status === "goedgekeurd" || d.stageplaats_id) && <EvaluatieKaart sb={sb} dossierId={id} />}
    </>
  );
}
