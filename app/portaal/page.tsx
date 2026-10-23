import Link from "next/link";
import { datumKort, type Blok } from "@/lib/beheer";
import { STAPPEN, type StapKey } from "@/lib/portaal";
import { kiesBlok, laadDossier, portaalGebruiker } from "@/lib/portaal-server";
import { AanvraagSamenvatting, Top3Samenvatting } from "@/components/portaal/Samenvatting";
import Top3Formulier from "./Top3Formulier";
import AanvraagFormulier from "./AanvraagFormulier";

type Zoek = Promise<{ leerling?: string; blok?: string; stap?: string }>;

const ICOON: Record<string, string> = { done: "✓", wait: "…", action: "!", fix: "!", locked: "" };

export default async function Portaal({ searchParams }: { searchParams: Zoek }) {
  const zp = await searchParams;
  const { sb, begeleider, leerling, voorbeeld } = await portaalGebruiker(zp.leerling);

  if (!leerling) {
    return (
      <section className="pt-leeg">
        {begeleider ? (
          <>
            <h1>Bekijk als leerling</h1>
            <p>Je bent ingelogd als begeleider. Open een leerling in het beheer en kies <b>Bekijk als leerling</b> om het portaal te zien zoals die leerling het ziet.</p>
            <Link className="btn btn-blue" href="/beheer/leerlingen">Naar de leerlingen</Link>
          </>
        ) : (
          <>
            <h1>We vinden je niet terug</h1>
            <p>Je bent ingelogd, maar je staat (nog) niet op de stagelijst van dit schooljaar. Vraag het aan je stagebegeleider.</p>
          </>
        )}
      </section>
    );
  }

  const { data: bData } = await sb.from("blokken").select("*").eq("schooljaar", leerling.schooljaar).order("start_datum");
  const { mee, blok } = kiesBlok((bData ?? []) as Blok[], leerling.klas, zp.blok);
  const link = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    if (voorbeeld) q.set("leerling", leerling.id);
    Object.entries(extra).forEach(([k, v]) => v && q.set(k, v));
    return `/portaal?${q}`;
  };

  const banner = voorbeeld && (
    <div className="pt-voorbeeld">
      <span>
        <b>Voorbeeld</b> · je bekijkt het portaal als {leerling.voornaam} {leerling.naam} ({leerling.klas}). Wat je hier bewaart of indient, wordt echt bewaard.
      </span>
      <Link href={`/beheer/leerlingen/${leerling.id}`}>← Terug naar de fiche</Link>
    </div>
  );

  if (!blok) {
    return (
      <>
        {banner}
        <section className="pt-leeg">
          <h1>Dag {leerling.voornaam}</h1>
          <p>Voor klas {leerling.klas} staat er dit schooljaar nog geen blokstage gepland. Je krijgt bericht zodra je je top 3 kan invullen.</p>
        </section>
      </>
    );
  }

  const d = await laadDossier(sb, leerling, blok, !!begeleider);
  if (!d) {
    return (
      <>
        {banner}
        <section className="pt-leeg"><h1>Dag {leerling.voornaam}</h1><p>Je stagedossier kon niet geladen worden. Probeer later opnieuw of vraag het aan je stagebegeleider.</p></section>
      </>
    );
  }

  const { status } = d;
  const eersteOpen = STAPPEN.find((s) => ["action", "fix"].includes(status[s.k].state))?.k ?? STAPPEN.find((s) => status[s.k].state === "wait")?.k ?? "top3";
  const stap = (STAPPEN.some((s) => s.k === zp.stap) ? zp.stap : eersteOpen) as StapKey;
  const b3 = d.beoordelingen.find((b) => b.stap === "top3");
  const ba = d.beoordelingen.find((b) => b.stap === "aanvraag");
  const goedgekeurd = b3?.status === "goedgekeurd" ? b3.keuzes : [];
  const top3Bewerkbaar = ["action", "fix"].includes(status.top3.state);
  const aanvraagBewerkbaar = ["action", "fix"].includes(status.aanvraag.state);

  return (
    <>
      {banner}
      <header className="pt-kop">
        <div>
          <span className="eyebrow"><span className="streep" />{leerling.klas} · {blok.naam}</span>
          <h1>Dag {leerling.voornaam}</h1>
          <p className="sub">
            Stage van {datumKort(blok.start_datum)} tot {datumKort(blok.eind_datum)}
            {blok.deadline_top3 && status.top3.state === "action" ? <> · top 3 indienen vóór <b>{datumKort(blok.deadline_top3)}</b></> : null}
          </p>
        </div>
        {mee.length > 1 && (
          <nav className="bh-seg" aria-label="Blokstage">
            {mee.map((b) => <Link key={b.id} href={link({ blok: b.id })} className={b.id === blok.id ? "on" : undefined}>{b.naam}</Link>)}
          </nav>
        )}
      </header>

      {d.stageplaatsNaam && (
        <p className="bh-melding ok">Je stageplaats: <b>{d.stageplaatsNaam}</b>{d.dossier.mentor_naam ? <> · mentor {d.dossier.mentor_naam}</> : null}</p>
      )}

      <ol className="pt-stappen">
        {STAPPEN.map((s, i) => {
          const st = status[s.k];
          const inhoud = (
            <>
              <span className={`pt-bol ${st.state}`}>{ICOON[st.state] || i + 1}</span>
              <span className="t"><b>{s.t}</b><small>{st.label}</small></span>
            </>
          );
          return (
            <li key={s.k} className={`${st.state}${s.k === stap ? " on" : ""}`}>
              {st.state === "locked" ? <span className="pt-stap">{inhoud}</span> : (
                <Link className="pt-stap" href={link({ blok: blok.id, stap: s.k })} aria-current={s.k === stap ? "step" : undefined}>{inhoud}</Link>
              )}
            </li>
          );
        })}
      </ol>

      {stap === "top3" && (
        <section className="pt-paneel">
          <div className="pt-paneel-kop">
            <h2>Top 3</h2>
            <p>Kies drie stageplaatsen in volgorde van voorkeur. De stagebegeleiding keurt er één of twee goed; daarna ga je langs en vul je de aanvraag in.</p>
          </div>
          {status.top3.code === "geregeld" && <p className="bh-melding ok">Je stageplaats is al geregeld met de school. Je hoeft geen top 3 in te vullen.</p>}
          {b3?.status === "aanpassen" && status.top3.state === "fix" && (
            <div className="pt-feedback"><b>Aanpassing gevraagd</b>{b3.feedback && <p>{b3.feedback}</p>}<small>Pas je top 3 aan en dien hem opnieuw in.</small></div>
          )}
          {b3?.status === "goedgekeurd" && (
            <div className="pt-feedback ok">
              <b>{goedgekeurd.length > 1 ? `Keuzes ${goedgekeurd.join(" en ")} zijn goedgekeurd` : `Keuze ${goedgekeurd[0]} is goedgekeurd`}</b>
              {b3.feedback && <p>{b3.feedback}</p>}
              <small>Ga langs, stel jezelf voor en vul daarna samen met de stagementor de <Link href={link({ blok: blok.id, stap: "aanvraag" })}>aanvraag</Link> in.</small>
            </div>
          )}
          {status.top3.state === "wait" && (
            <p className="bh-melding">Ingediend op {datumKort(d.top3?.ingediend_op)}. De stagebegeleiding bekijkt je top 3. Je krijgt bericht.</p>
          )}
          {top3Bewerkbaar ? (
            <Top3Formulier dossierId={d.dossier.id} leerlingId={leerling.id} profielStart={d.profiel} keuzesStart={d.top3?.keuzes ?? []} plaatsen={d.plaatsen} />
          ) : d.top3 ? (
            <div className="bh-card"><div className="bd"><Top3Samenvatting keuzes={d.top3.keuzes} goedgekeurd={goedgekeurd} /></div></div>
          ) : null}
        </section>
      )}

      {stap === "aanvraag" && (
        <section className="pt-paneel">
          <div className="pt-paneel-kop">
            <h2>Aanvraag</h2>
            <p>Met deze gegevens maakt de school je stagecontract op.</p>
          </div>
          {status.aanvraag.code === "geregeld" && <p className="bh-melding ok">Je stageplaats is al geregeld met de school. Je hoeft geen aanvraag in te vullen.</p>}
          {ba?.status === "aanpassen" && status.aanvraag.state === "fix" && (
            <div className="pt-feedback"><b>Aanpassing gevraagd</b>{ba.feedback && <p>{ba.feedback}</p>}<small>Pas de aanvraag aan en dien ze opnieuw in.</small></div>
          )}
          {ba?.status === "goedgekeurd" && (
            <div className="pt-feedback ok"><b>Je aanvraag is goedgekeurd</b>{ba.feedback && <p>{ba.feedback}</p>}<small>De school maakt nu je stagecontract op.</small></div>
          )}
          {status.aanvraag.state === "wait" && <p className="bh-melding">Ingediend op {datumKort(d.aanvraag?.ingediend_op)}. De stagebegeleiding kijkt je aanvraag na.</p>}
          {status.aanvraag.state === "locked" && <p className="bh-melding">De aanvraag opent zodra je top 3 is goedgekeurd.</p>}
          {aanvraagBewerkbaar ? (
            <AanvraagFormulier
              dossierId={d.dossier.id}
              keuzes={d.top3?.keuzes ?? []}
              goedgekeurd={goedgekeurd}
              profiel={d.profiel}
              startNr={d.aanvraag?.keuze_nr ?? null}
              startGegevens={d.aanvraag?.gegevens ?? null}
              startBlok={blok.start_datum}
              blokUren={{ uren: blok.uren, perWeek: blok.uren_per_week }}
            />
          ) : d.aanvraag && status.aanvraag.code !== "geregeld" ? (
            <div className="bh-card"><div className="bd"><AanvraagSamenvatting g={d.aanvraag.gegevens} /></div></div>
          ) : null}
        </section>
      )}

      {["infomail", "contract", "rooster"].includes(stap) && (
        <section className="pt-paneel">
          <div className="pt-paneel-kop"><h2>{STAPPEN.find((s) => s.k === stap)?.t}</h2></div>
          <p className="bh-melding">Deze stap volgt binnenkort op dit platform.</p>
        </section>
      )}
    </>
  );
}
