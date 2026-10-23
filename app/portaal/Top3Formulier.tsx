"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BRANCHES, RIJBEWIJS, VERVOER, type Keuze, type Profiel } from "@/lib/portaal";
import type { PubliekePlaats } from "@/lib/portaal-server";
import { top3Bewaren, type PortaalResultaat } from "./acties";
import { Veld, Vink, Voet } from "./Velden";

const LEEG: Keuze = { type: "", branche: "", winkel: "", adres: "", postcode: "", gemeente: "", web: "", contact: "", vervoer: "", motivatie: "" };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

export default function Top3Formulier({
  dossierId,
  leerlingId,
  profielStart,
  keuzesStart,
  plaatsen,
}: {
  dossierId: string;
  leerlingId: string;
  profielStart: Profiel;
  keuzesStart: Keuze[];
  plaatsen: PubliekePlaats[];
}) {
  const router = useRouter();
  const [profiel, setProfiel] = useState<Profiel>(profielStart);
  const [keuzes, setKeuzes] = useState<Keuze[]>([0, 1, 2].map((i) => ({ ...LEEG, ...(keuzesStart[i] ?? {}) })));
  const [res, setRes] = useState<PortaalResultaat>(null);
  const [bezig, start] = useTransition();
  const f = res?.velden ?? {};

  const zetP = (k: keyof Profiel, v: string | boolean) => setProfiel((p) => ({ ...p, [k]: v }));
  const zetK = (i: number, k: keyof Keuze, v: string) =>
    setKeuzes((ks) => ks.map((x, j) => {
      if (j !== i) return x;
      const n = { ...x, [k]: v };
      if (k === "type") n.branche = "";
      // Een gekende stageplaats gekozen? Dan het adres al invullen.
      if (k === "winkel") {
        const p = plaatsen.find((p) => norm(p.naam) === norm(v));
        if (p) Object.assign(n, { adres: x.adres || p.straat || "", postcode: x.postcode || p.postcode || "", gemeente: x.gemeente || p.gemeente || "", web: x.web || p.website || "" });
      }
      return n;
    }));

  function verstuur(indienen: boolean) {
    if (indienen && !window.confirm("Je top 3 indienen? Daarna kan je hem niet meer wijzigen, tenzij de stagebegeleiding om een aanpassing vraagt.")) return;
    start(async () => {
      const r = await top3Bewaren(dossierId, leerlingId, profiel, keuzes, indienen);
      setRes(r);
      if (r?.ok) router.refresh();
      else if (r?.velden) document.querySelector(".pt-fout")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <div className="pt-form">
      <datalist id="pt-plaatsen">
        {plaatsen.map((p) => <option key={p.naam + p.gemeente} value={p.naam}>{p.gemeente ?? ""}</option>)}
      </datalist>

      <section className="bh-card">
        <div className="hd"><h2>Over jou</h2><span className="sm">Dit moet je maar één keer invullen.</span></div>
        <div className="bd bh-fg">
          <Veld label="Je gsm-nummer" fout={f["profiel.gsm"]}><input type="tel" value={profiel.gsm ?? ""} onChange={(e) => zetP("gsm", e.target.value)} /></Veld>
          <Veld label="Rijbewijs"><select value={profiel.rijbewijs ?? ""} onChange={(e) => zetP("rijbewijs", e.target.value)}><option value="">Kies…</option>{RIJBEWIJS.map((r) => <option key={r}>{r}</option>)}</select></Veld>
          <Veld label="Straat en nummer"><input value={profiel.straat ?? ""} onChange={(e) => zetP("straat", e.target.value)} /></Veld>
          <div className="bh-fg2-in">
            <Veld label="Postcode"><input inputMode="numeric" value={profiel.postcode ?? ""} onChange={(e) => zetP("postcode", e.target.value)} /></Veld>
            <Veld label="Gemeente"><input value={profiel.gemeente ?? ""} onChange={(e) => zetP("gemeente", e.target.value)} /></Veld>
          </div>
          <Veld label="Naam ouder of voogd *" fout={f["profiel.ouder_naam"]}><input value={profiel.ouder_naam ?? ""} onChange={(e) => zetP("ouder_naam", e.target.value)} /></Veld>
          <Veld label="Gsm ouder of voogd *" fout={f["profiel.ouder_gsm"]}><input type="tel" value={profiel.ouder_gsm ?? ""} onChange={(e) => zetP("ouder_gsm", e.target.value)} /></Veld>
          <Veld label="E-mail ouder of voogd"><input type="email" value={profiel.ouder_email ?? ""} onChange={(e) => zetP("ouder_email", e.target.value)} /></Veld>
          <Veld label="Talen die je spreekt" hint="Bv. Nederlands, Frans, Engels"><input value={profiel.talen ?? ""} onChange={(e) => zetP("talen", e.target.value)} /></Veld>
          <Veld label="Iets waar we rekening mee moeten houden?" hint="Bv. allergie, medicatie, een afspraak met de school. Enkel de stagebegeleiding ziet dit." full>
            <textarea value={profiel.aandacht ?? ""} onChange={(e) => zetP("aandacht", e.target.value)} />
          </Veld>
          <div className="f full">
            <Vink checked={!!profiel.toestemming} onChange={(v) => zetP("toestemming", v)} fout={!!f["profiel.toestemming"]}>
              Mijn ouders weten welke stageplaatsen ik kies en gaan akkoord. *
            </Vink>
          </div>
        </div>
      </section>

      {keuzes.map((k, i) => {
        const p = `keuze${i + 1}.`;
        const bekend = k.winkel ? plaatsen.find((x) => norm(x.naam) === norm(k.winkel ?? "")) : undefined;
        return (
          <section className="bh-card" key={i}>
            <div className="hd">
              <h2>Keuze {i + 1}{i === 0 ? " · je favoriet" : ""}</h2>
              <span className="sm">{i < 2 ? "Verplicht" : "Reserve: adres volstaat"}</span>
            </div>
            <div className="bd bh-fg">
              <div className="f full">
                <span>Soort stage *</span>
                <div className={`pt-keuze${f[p + "type"] ? " pt-fout" : ""}`} role="radiogroup">
                  {(["sales", "onthaal"] as const).map((t) => (
                    <button type="button" key={t} role="radio" aria-checked={k.type === t} className={k.type === t ? "on" : ""} onClick={() => zetK(i, "type", t)}>
                      <b>{t === "sales" ? "Sales" : "Onthaal"}</b>
                      <small>{t === "sales" ? "Winkel, verkoop, kassa" : "Receptie, balie, ontvangst"}</small>
                    </button>
                  ))}
                </div>
                {f[p + "type"] && <small className="pt-foutmelding">{f[p + "type"]}</small>}
              </div>
              <Veld label="Soort zaak">
                <select value={k.branche ?? ""} onChange={(e) => zetK(i, "branche", e.target.value)} disabled={!k.type}>
                  <option value="">{k.type ? "Kies…" : "Kies eerst sales of onthaal"}</option>
                  {k.type && BRANCHES[k.type].map((b) => <option key={b}>{b}</option>)}
                </select>
              </Veld>
              <Veld label="Naam van de winkel of het bedrijf *" fout={f[p + "winkel"]} hint="Begin te typen: gekende stageplaatsen verschijnen.">
                <input list="pt-plaatsen" value={k.winkel ?? ""} onChange={(e) => zetK(i, "winkel", e.target.value)} />
              </Veld>
              {bekend?.bezet && (
                <p className="bh-melding full">Op deze stageplaats loopt in deze periode al iemand stage. Je mag ze kiezen, maar de stagebegeleiding kijkt of er nog plaats is.</p>
              )}
              <Veld label="Straat en nummer *" fout={f[p + "adres"]}><input value={k.adres ?? ""} onChange={(e) => zetK(i, "adres", e.target.value)} /></Veld>
              <div className="bh-fg2-in">
                <Veld label="Postcode *" fout={f[p + "postcode"]}><input inputMode="numeric" maxLength={4} value={k.postcode ?? ""} onChange={(e) => zetK(i, "postcode", e.target.value)} /></Veld>
                <Veld label="Gemeente *" fout={f[p + "gemeente"]}><input value={k.gemeente ?? ""} onChange={(e) => zetK(i, "gemeente", e.target.value)} /></Veld>
              </div>
              <Veld label="Website"><input value={k.web ?? ""} onChange={(e) => zetK(i, "web", e.target.value)} /></Veld>
              <Veld label="Contactpersoon (als je die al kent)"><input value={k.contact ?? ""} onChange={(e) => zetK(i, "contact", e.target.value)} /></Veld>
              <Veld label="Hoe geraak je er?">
                <select value={k.vervoer ?? ""} onChange={(e) => zetK(i, "vervoer", e.target.value)}><option value="">Kies…</option>{VERVOER.map((v) => <option key={v}>{v}</option>)}</select>
              </Veld>
              <Veld label={`Waarom deze stageplaats?${i < 2 ? " *" : ""}`} fout={f[p + "motivatie"]} full>
                <textarea value={k.motivatie ?? ""} onChange={(e) => zetK(i, "motivatie", e.target.value)} />
              </Veld>
            </div>
          </section>
        );
      })}

      <Voet bezig={bezig} bewaar={() => verstuur(false)} dien={() => verstuur(true)} dienLabel="Top 3 indienen" ok={res?.ok} fout={res?.fout} />
    </div>
  );
}
