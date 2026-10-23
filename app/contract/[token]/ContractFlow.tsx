"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ContractTekst from "@/components/contract/ContractTekst";
import Handtekening from "@/components/contract/Handtekening";
import Ondertekening from "@/components/contract/Ondertekening";
import { Veld, Vink } from "@/app/portaal/Velden";
import { HOEDANIGHEDEN, effectief, getekend, magTekenen, type ContractData, type ContractGegevens, type Rol, type Sectie } from "@/lib/contract";
import { contractBewaren, contractOndertekenen, type ContractResultaat } from "./acties";

type Stap = "lezen" | "gegevens" | "tekenen";
const STAP_LABEL: Record<Stap, string> = { lezen: "Contract lezen", gegevens: "Gegevens aanvullen", tekenen: "Ondertekenen" };

export default function ContractFlow({
  d, token, secties, status,
}: {
  d: ContractData & { rol: Rol };
  token: string;
  secties: Sectie[];
  status: { klaar: number; totaal: number; afgerond: boolean };
}) {
  const router = useRouter();
  const rol = d.rol;
  const ikGetekend = getekend(d, rol);
  const ouderNodig = !d.contract.meerderjarig;
  // Na de stagiair kan de ouder meteen op hetzelfde toestel tekenen.
  const ouderHier = rol === "stagiair" && ikGetekend && ouderNodig && !getekend(d, "ouder");
  const tekenRol: Rol = ouderHier ? "ouder" : rol;
  const kan = magTekenen(d, tekenRol);
  const stappen: Stap[] = rol === "stagegever" && !ikGetekend ? ["lezen", "gegevens", "tekenen"] : ["lezen", "tekenen"];
  const [stap, setStap] = useState<Stap>(ikGetekend && !ouderHier ? "lezen" : ouderHier ? "tekenen" : "lezen");
  const toonFlow = (!ikGetekend || ouderHier) && rol !== "directie";

  return (
    <>
      {status.afgerond ? (
        <div className="pt-feedback ok"><b>Het contract is volledig ondertekend</b><small>Alle partijen hebben getekend. Download het contract hieronder als pdf.</small></div>
      ) : ikGetekend && !ouderHier ? (
        <div className="pt-feedback ok"><b>Je hebt dit contract ondertekend</b><small>Zodra iedereen getekend heeft, ontvang je het volledige contract als pdf.</small></div>
      ) : !kan ? (
        <div className="pt-feedback"><b>Je kan nog niet tekenen</b><small>De stagegever tekent eerst. Je krijgt bericht zodra het jouw beurt is. Je kan het contract intussen al lezen.</small></div>
      ) : null}

      {toonFlow ? (
        <section className="bh-card ct-kaart">
          <nav className="ct-stappen" aria-label="Stappen">
            {stappen.map((s, i) => (
              <button key={s} type="button" aria-current={s === stap ? "step" : undefined} onClick={() => setStap(s)} disabled={s !== "lezen" && !kan}>
                <small>Stap {i + 1}</small><b>{STAP_LABEL[s]}</b>
              </button>
            ))}
          </nav>
          {stap === "lezen" && (
            <div className="ct-paneel">
              <div className="ct-paneel-kop">
                <p>Lees het contract rustig door. Je kan ook meteen verder: het contract blijft altijd raadpleegbaar. Gele vakjes zijn nog niet ingevuld.</p>
                {kan && <button type="button" className="btn btn-line ct-klein" onClick={() => setStap(stappen[1])}>Lezen overslaan en meteen verder</button>}
              </div>
              <ContractTekst secties={secties} />
              {kan && <div className="pt-voet"><button type="button" className="btn btn-blue" onClick={() => { setStap(stappen[1]); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Verder</button></div>}
            </div>
          )}
          {stap === "gegevens" && kan && <Gegevens d={d} token={token} verder={() => { setStap("tekenen"); router.refresh(); }} />}
          {stap === "tekenen" && kan && <Tekenen key={tekenRol} d={d} token={token} rol={tekenRol} terug={() => setStap("lezen")} klaar={() => router.refresh()} />}
        </section>
      ) : (
        <details className="bh-card ct-kaart ct-teruglezen">
          <summary>Het contract opnieuw lezen</summary>
          <div className="ct-paneel"><ContractTekst secties={secties} /></div>
        </details>
      )}

      <section className="bh-card">
        <div className="hd">
          <h2>Ondertekening</h2>
          <span className={`pill ${status.afgerond ? "ok" : "in"}`}>{status.klaar} van {status.totaal} getekend</span>
        </div>
        <div className="bd">
          <p className="pt-hint" style={{ marginBottom: 10 }}>
            De stagegever tekent eerst. Daarna tekenen de stagiair{ouderNodig ? " en een ouder of voogd" : ""}. De school tekent als laatste.
          </p>
          <Ondertekening d={d} ik={rol} />
          <p style={{ marginTop: 12 }}><a className="btn btn-line ct-klein" href={`/contract/${token}/pdf`} target="_blank" rel="noreferrer">Contract als pdf</a></p>
        </div>
      </section>
    </>
  );
}

function Gegevens({ d, token, verder }: { d: ContractData; token: string; verder: () => void }) {
  const start = effectief(d);
  const [g, setG] = useState<ContractGegevens>(start);
  const [res, setRes] = useState<ContractResultaat>(null);
  const [bezig, run] = useTransition();
  const f = { ...(res?.velden ?? {}) };
  const zet = (k: keyof ContractGegevens, v: string) => setG((x) => ({ ...x, [k]: v }));
  const veld = (k: keyof ContractGegevens, label: string, o: { type?: string; hint?: string; full?: boolean; uitAanvraag?: boolean } = {}) => (
    <Veld label={label} fout={f[k]} hint={o.hint} full={o.full}>
      <input type={o.type ?? "text"} value={String(g[k] ?? "")} onChange={(e) => zet(k, e.target.value)} />
    </Veld>
  );
  const verplicht: Record<string, string> = {};
  if (!g.ondertekenaar?.trim()) verplicht.ondertekenaar = "Vul de naam in van wie ondertekent.";
  if (!g.hoedanigheid?.trim()) verplicht.hoedanigheid = "Kies de hoedanigheid.";
  if (!g.mentor?.trim()) verplicht.mentor = "Vul de naam van de mentor in.";

  function bewaar() {
    if (Object.keys(verplicht).length) { setRes({ fout: "Vul de verplichte velden in.", velden: verplicht }); return; }
    run(async () => {
      const r = await contractBewaren(token, g);
      setRes(r);
      if (r?.ok) { verder(); window.scrollTo({ top: 0, behavior: "smooth" }); }
    });
  }

  return (
    <div className="ct-paneel">
      <div className="ct-paneel-kop"><p>De gegevens uit de stage-aanvraag staan al ingevuld. Kijk ze na en vul aan wat ontbreekt. Velden met * zijn verplicht.</p></div>
      <div className="ct-groep">
        <h3>Wie ondertekent</h3>
        <div className="bh-fg">
          {veld("ondertekenaar", "Naam ondertekenaar *")}
          <Veld label="In de hoedanigheid van *" fout={f.hoedanigheid}>
            <select value={g.hoedanigheid ?? ""} onChange={(e) => zet("hoedanigheid", e.target.value)}>
              <option value="">Kies…</option>
              {HOEDANIGHEDEN.map((h) => <option key={h}>{h}</option>)}
            </select>
          </Veld>
        </div>
      </div>
      <div className="ct-groep">
        <h3>Stageplaats</h3>
        <div className="bh-fg">
          {veld("winkel_naam", "Naam winkel of bedrijf")}
          {veld("winkel_adres", "Adres (zetel)")}
          {veld("winkel_tel", "Telefoon", { type: "tel" })}
          {veld("winkel_email", "E-mailadres", { type: "email" })}
          {veld("kbo", "Ondernemingsnummer", { hint: "Bv. 0123.456.789" })}
          {veld("pc", "Paritair comité of NACE-code", { hint: "Vraag het na bij je boekhouder als je het niet zeker weet." })}
          {veld("rsz", "RSZ-kengetal", { hint: "Indien gekend. Je boekhouder of sociaal secretariaat kan dit opzoeken." })}
        </div>
      </div>
      <div className="ct-groep">
        <h3>Mentor op de werkvloer</h3>
        <div className="bh-fg">
          {veld("mentor", "Naam mentor *")}
          {veld("mentor_tel", "Gsm mentor", { type: "tel", hint: "Zo bereiken de stagebegeleiders de mentor rechtstreeks." })}
        </div>
      </div>
      <div className="ct-groep">
        <h3>Risicoanalyse</h3>
        <p className="pt-hint">Artikel 6. Duid aan wat van toepassing is. Klik nogmaals om je keuze ongedaan te maken.</p>
        <div className="pt-keuze" role="radiogroup">
          {([["heb", "Ik heb een risicoanalyse of werkpostfiche", "Ik bezorg die digitaal vóór de start van de stage."], ["stuur", "Ik heb geen werknemers", "Stuur mij een werkpostfiche die ik zelf invul."]] as const).map(([k, t, s]) => (
            <button key={k} type="button" role="radio" aria-checked={g.risico === k} className={g.risico === k ? "on" : ""} onClick={() => zet("risico", g.risico === k ? "" : k)}>
              <b>{t}</b><small>{s}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="ct-groep">
        <h3>Bijzondere afspraken</h3>
        <div className="bh-fg">
          <Veld label="Toestellen of taken die de stagiair niet mag gebruiken of uitvoeren" hint="Stagereglement artikel 9 § 2. Laat leeg als er geen beperkingen zijn." full>
            <textarea value={g.toestellen ?? ""} onChange={(e) => zet("toestellen", e.target.value)} placeholder="bv. geen gebruik van de snijmachine, geen kassa-afsluiting" />
          </Veld>
          <Veld label="Andere afspraken" full>
            <textarea value={g.afspraken ?? ""} onChange={(e) => zet("afspraken", e.target.value)} placeholder="bv. zwarte broek en wit hemd, pauze van 30 minuten om 12u30" />
          </Veld>
        </div>
      </div>
      <div className="pt-voet">
        <button type="button" className="btn btn-blue" disabled={bezig} onClick={bewaar}>{bezig ? "Bezig…" : "Bewaren en verder"}</button>
        {res?.fout && <span className="bh-fout" role="alert">{res.fout}</span>}
      </div>
    </div>
  );
}

const vandaag = () => new Date().toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" });

function Tekenen({ d, token, rol, terug, klaar }: { d: ContractData; token: string; rol: Rol; terug: () => void; klaar: () => void }) {
  const g = effectief(d);
  const [naam, setNaam] = useState(rol === "stagegever" ? g.ondertekenaar : rol === "stagiair" ? `${d.leerling.voornaam} ${d.leerling.naam}` : "");
  const [relatie, setRelatie] = useState("moeder");
  const [adres, setAdres] = useState(g.stagiair_adres);
  const [plaats, setPlaats] = useState("");
  const [akkoord, setAkkoord] = useState(false);
  const [png, setPng] = useState("");
  const [res, setRes] = useState<ContractResultaat>(null);
  const [bezig, run] = useTransition();
  const f = res?.velden ?? {};

  function teken() {
    run(async () => {
      const r = await contractOndertekenen(token, rol, { naam, plaats, handtekening: png, relatie, adres, akkoord });
      setRes(r);
      if (r?.ok) { klaar(); window.scrollTo({ top: 0, behavior: "smooth" }); }
    });
  }

  return (
    <div className="ct-paneel">
      <div className="ct-paneel-kop">
        {rol === "ouder" ? (
          <p><b>Nu tekent een ouder of voogd.</b> Dat kan meteen op dit toestel. Lukt het nu niet, dan kan de ouder later tekenen via dezelfde link.</p>
        ) : (
          <p>Kijk de gegevens na, vink het akkoord aan en zet je handtekening.</p>
        )}
      </div>
      <div className="ct-groep">
        <div className="bh-fg">
          <Veld label={rol === "ouder" ? "Naam ouder of voogd *" : "Je naam *"} fout={f.naam}>
            <input value={naam} onChange={(e) => setNaam(e.target.value)} autoComplete="name" />
          </Veld>
          {rol === "ouder" && (
            <Veld label="Relatie tot de stagiair">
              <select value={relatie} onChange={(e) => setRelatie(e.target.value)}>
                {["moeder", "vader", "voogd", "pleegouder"].map((x) => <option key={x}>{x}</option>)}
              </select>
            </Veld>
          )}
          {rol === "stagiair" && (
            <Veld label="Je adres *" fout={f.adres} hint="Straat, nummer, postcode en gemeente. Dit komt in het contract." full>
              <input value={adres} onChange={(e) => setAdres(e.target.value)} autoComplete="street-address" />
            </Veld>
          )}
          <Veld label="Opgemaakt te *" fout={f.plaats} hint="De gemeente waar je nu tekent.">
            <input value={plaats} onChange={(e) => setPlaats(e.target.value)} />
          </Veld>
          <Veld label="Datum"><input value={vandaag()} readOnly /></Veld>
        </div>
      </div>
      <div className="ct-groep">
        <Vink checked={akkoord} onChange={setAkkoord} fout={!!f.akkoord}>
          Ik ga akkoord met de stageovereenkomst en het stagereglement.{" "}
          <button type="button" className="ct-link" onClick={terug}>Contract opnieuw lezen</button>
        </Vink>
      </div>
      <div className="ct-groep">
        <h3>Handtekening</h3>
        <Handtekening onChange={setPng} fout={f.handtekening} />
      </div>
      <div className="pt-voet">
        <button type="button" className="btn btn-blue" disabled={bezig} onClick={teken}>{bezig ? "Bezig…" : "Ondertekenen"}</button>
        {res?.fout && <span className="bh-fout" role="alert">{res.fout}</span>}
      </div>
    </div>
  );
}
