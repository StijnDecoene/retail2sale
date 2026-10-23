"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { telMooi } from "@/lib/contactcheck";
import { AANVRAAG_CONTACT, KLEDIJ, aanvraagVoorinvullen, contactVeldFout, type AanvraagGegevens, type Keuze, type Profiel } from "@/lib/portaal";
import { aanvraagBewaren, type PortaalResultaat } from "./acties";
import { Datumkeuze, Veld, Vink, Voet } from "./Velden";

type Sectie = "stagiair" | "bedrijf" | "mentor" | "verantwoordelijke" | "werkvloer";

export default function AanvraagFormulier({
  dossierId,
  keuzes,
  goedgekeurd,
  profiel,
  startNr,
  startGegevens,
  startBlok,
  blokUren,
}: {
  dossierId: string;
  keuzes: Keuze[];
  /** Goedgekeurde keuzes uit de top 3 (1, 2 of 3). */
  goedgekeurd: number[];
  profiel: Profiel;
  startNr: number | null;
  startGegevens: AanvraagGegevens | null;
  startBlok: string;
  /** Uren van de blokstage, bv. { uren: 120, perWeek: 24 }. */
  blokUren: { uren: number; perWeek: number };
}) {
  const router = useRouter();
  const eerste = startNr ?? (goedgekeurd.length === 1 ? goedgekeurd[0] : null);
  const [nr, setNr] = useState<number | null>(eerste);
  const [g, setG] = useState<AanvraagGegevens>(() =>
    startGegevens ?? (eerste ? aanvraagVoorinvullen(keuzes[eerste - 1] ?? {}, profiel) : aanvraagVoorinvullen({}, profiel)),
  );
  const [res, setRes] = useState<PortaalResultaat>(null);
  const [bezig, start] = useTransition();
  const f = res?.velden ?? {};

  const zet = <S extends Sectie>(s: S, k: string, v: unknown) => setG((x) => ({ ...x, [s]: { ...(x[s] as object), [k]: v } }));
  const zetA = (k: "uren" | "maandag" | "familie", x: boolean) => setG((y) => ({ ...y, akkoord: { ...y.akkoord, [k]: x } }));
  const v = (s: Sectie, k: string) => String(((g[s] ?? {}) as Record<string, unknown>)[k] ?? "");

  function kies(n: number) {
    setNr(n);
    setG((x) => aanvraagVoorinvullen(keuzes[n - 1] ?? {}, profiel, x));
  }

  function verstuur(indienen: boolean) {
    if (indienen && !window.confirm("De aanvraag indienen? Kijk eerst samen met je stagementor of alles klopt.")) return;
    start(async () => {
      const r = await aanvraagBewaren(dossierId, nr, g, startBlok, indienen);
      setVerlaten({});
      setRes(r);
      if (r?.ok) router.refresh();
      else if (r?.velden) document.querySelector(".pt-fout")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  // Telefoon en e-mail: meteen controleren zodra je het veld verlaat.
  const [verlaten, setVerlaten] = useState<Record<string, boolean>>({});
  const tekst = (s: Sectie, k: string, label: string, opt: { type?: string; full?: boolean; hint?: string } = {}) => {
    const sleutel = `${s}.${k}`;
    const contact = AANVRAAG_CONTACT.find((c) => c.k === sleutel);
    const direct = contact && verlaten[sleutel] ? contactVeldFout(contact.soort, v(s, k)) : undefined;
    return (
      <Veld label={label} fout={direct ?? (contact && verlaten[sleutel] ? undefined : f[sleutel])} full={opt.full} hint={opt.hint}>
        <input
          type={opt.type ?? "text"}
          inputMode={contact && contact.soort !== "mail" ? "tel" : contact ? "email" : undefined}
          autoComplete="off"
          value={v(s, k)}
          onChange={(e) => zet(s, k, e.target.value)}
          onBlur={() => {
            if (!contact) return;
            setVerlaten((x) => ({ ...x, [sleutel]: true }));
            if (contact.soort === "mail") zet(s, k, v(s, k).trim().toLowerCase());
            else if (!contactVeldFout(contact.soort, v(s, k))) zet(s, k, telMooi(v(s, k)));
          }}
        />
      </Veld>
    );
  };
  const kledij = g.werkvloer?.kledij ?? [];
  const zelfde = g.verantwoordelijke?.zelfde !== false;

  return (
    <div className="pt-form">
      <p className="pt-intro">
        Vul deze aanvraag <b>samen met je stagementor</b> in, bv. tijdens je kennismakingsgesprek. Je kan tussendoor bewaren
        en later verder werken.
      </p>

      {goedgekeurd.length > 1 && (
        <section className="bh-card">
          <div className="hd"><h2>Waar mag je stage lopen?</h2></div>
          <div className="bd">
            <p className="pt-hint" style={{ marginBottom: 10 }}>De stagebegeleiding keurde {goedgekeurd.length} keuzes goed. Duid aan waar je aangenomen bent.</p>
            <div className={`pt-keuze${f["keuze_nr"] ? " pt-fout" : ""}`} role="radiogroup">
              {goedgekeurd.map((n) => (
                <button type="button" key={n} role="radio" aria-checked={nr === n} className={nr === n ? "on" : ""} onClick={() => kies(n)}>
                  <b>{keuzes[n - 1]?.winkel || `Keuze ${n}`}</b>
                  <small>Keuze {n}{keuzes[n - 1]?.gemeente ? ` · ${keuzes[n - 1]?.gemeente}` : ""}</small>
                </button>
              ))}
            </div>
            {f["keuze_nr"] && <small className="pt-foutmelding">{f["keuze_nr"]}</small>}
          </div>
        </section>
      )}

      <section className="bh-card">
        <div className="hd"><h2>De stageplaats</h2><span className="sm">Vraag de officiële gegevens aan je mentor.</span></div>
        <div className="bd bh-fg">
          {tekst("bedrijf", "naam", "Naam van de winkel of het bedrijf *")}
          {tekst("bedrijf", "juridisch", "Officiële naam (als die anders is)", { hint: "Bv. de naam van de bv of nv" })}
          {tekst("bedrijf", "kbo", "Ondernemingsnummer", { hint: "Als je mentor het weet. Anders vult de stagegever het aan bij het contract." })}
          <Veld label="Soort stage *" fout={f["bedrijf.soort"]}>
            <select value={v("bedrijf", "soort")} onChange={(e) => zet("bedrijf", "soort", e.target.value)}>
              <option value="">Kies…</option><option value="sales">Sales</option><option value="onthaal">Onthaal</option>
            </select>
          </Veld>
          {tekst("bedrijf", "straat", "Straat en nummer *")}
          <div className="bh-fg2-in">
            {tekst("bedrijf", "postcode", "Postcode *")}
            {tekst("bedrijf", "gemeente", "Gemeente *")}
          </div>
          {tekst("bedrijf", "tel", "Telefoon van de zaak", { type: "tel" })}
          {tekst("bedrijf", "web", "Website")}
        </div>
      </section>

      <section className="bh-card">
        <div className="hd"><h2>Je stagementor</h2><span className="sm">De persoon die je op de werkvloer begeleidt.</span></div>
        <div className="bd bh-fg">
          {tekst("mentor", "naam", "Naam *")}
          {tekst("mentor", "functie", "Functie", { hint: "Bv. winkelverantwoordelijke" })}
          {tekst("mentor", "email", "E-mailadres *", { type: "email", hint: "Hierop krijgt de mentor later het contract en de evaluaties." })}
          {tekst("mentor", "tel", "Telefoon of gsm", { type: "tel" })}
          <div className="f full">
            <Vink checked={zelfde} onChange={(x) => zet("verantwoordelijke", "zelfde", x)}>
              De mentor tekent ook het contract (is de verantwoordelijke van de zaak).
            </Vink>
          </div>
          {!zelfde && (
            <>
              {tekst("verantwoordelijke", "naam", "Naam verantwoordelijke *")}
              {tekst("verantwoordelijke", "functie", "Functie")}
              {tekst("verantwoordelijke", "email", "E-mailadres", { type: "email" })}
              {tekst("verantwoordelijke", "tel", "Telefoon", { type: "tel" })}
            </>
          )}
        </div>
      </section>

      <section className="bh-card">
        <div className="hd"><h2>Op de werkvloer</h2></div>
        <div className="bd bh-fg">
          <Veld label="Welke taken zal je doen?" full><textarea value={v("werkvloer", "taken")} onChange={(e) => zet("werkvloer", "taken", e.target.value)} /></Veld>
          {tekst("werkvloer", "startuur", "Startuur op de eerste dag", { type: "time" })}
          {tekst("werkvloer", "melden", "Bij wie meld je je de eerste dag?")}
          <div className="f full">
            <span>Kledij</span>
            <div className="pt-chips">
              {KLEDIJ.map(([k, t]) => (
                <label key={k} className={kledij.includes(k) ? "on" : ""}>
                  <input type="checkbox" checked={kledij.includes(k)} onChange={(e) => zet("werkvloer", "kledij", e.target.checked ? [...kledij, k] : kledij.filter((x) => x !== k))} />
                  {t}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bh-card">
        <div className="hd"><h2>Over jou</h2></div>
        <div className="bd bh-fg">
          <Datumkeuze
            label="Je geboortedatum *"
            waarde={v("stagiair", "geboortedatum")}
            onChange={(iso) => zet("stagiair", "geboortedatum", iso)}
            fout={f["stagiair.geboortedatum"]}
            hint="Nodig voor het stagecontract."
            vanJaar={Number(startBlok.slice(0, 4)) - 25}
            totJaar={Number(startBlok.slice(0, 4)) - 14}
          />
          {tekst("stagiair", "gsm", "Je gsm-nummer *", { type: "tel", hint: "Bv. 0470 12 34 56" })}
          {tekst("stagiair", "nood_naam", "Te verwittigen bij nood: naam *")}
          {tekst("stagiair", "nood_tel", "Te verwittigen bij nood: telefoon *", { type: "tel" })}
        </div>
      </section>

      <section className={`bh-card${f["akkoord"] ? " pt-fout" : ""}`}>
        <div className="hd"><h2>Afspraken</h2><span className="sm">Lees ze samen met je mentor.</span></div>
        <div className="bd pt-akkoord">
          <Vink checked={!!g.akkoord?.uren} onChange={(x) => zetA( "uren", x)} fout={!!f["akkoord"]}>
            We plannen samen {blokUren.uren} stage-uren, gemiddeld {blokUren.perWeek} uur per week.
          </Vink>
          <Vink checked={!!g.akkoord?.maandag} onChange={(x) => zetA( "maandag", x)} fout={!!f["akkoord"]}>
            Op maandag is er geen stage: de stagiair is dan op school.
          </Vink>
          <Vink checked={!!g.akkoord?.familie} onChange={(x) => zetA( "familie", x)} fout={!!f["akkoord"]}>
            De stagegever is geen familie van de stagiair.
          </Vink>
          {f["akkoord"] && <small className="pt-foutmelding">{f["akkoord"]}</small>}
        </div>
      </section>

      <Voet bezig={bezig} bewaar={() => verstuur(false)} dien={() => verstuur(true)} dienLabel="Aanvraag indienen" ok={res?.ok} fout={res?.fout} />
    </div>
  );
}
