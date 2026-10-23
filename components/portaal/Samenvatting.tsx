import { KLEDIJ, type AanvraagGegevens, type Keuze, type Profiel } from "@/lib/portaal";

/** Alleen-lezen weergave van een top 3 (portaal en beheer). */
export function Top3Samenvatting({ keuzes, goedgekeurd = [], profiel }: { keuzes: Keuze[]; goedgekeurd?: number[]; profiel?: Profiel }) {
  return (
    <div className="pt-sam">
      {keuzes.map((k, i) => (
        <article key={i} className={`pt-samkeuze${goedgekeurd.includes(i + 1) ? " ok" : ""}`}>
          <header>
            <span className="nr">{i + 1}</span>
            <div>
              <b>{k.winkel || "—"}</b>
              <small>{[k.adres, [k.postcode, k.gemeente].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</small>
            </div>
            {k.type && <span className={`pill ${k.type === "sales" ? "in" : "mut"}`}>{k.type === "sales" ? "Sales" : "Onthaal"}</span>}
            {goedgekeurd.includes(i + 1) && <span className="pill ok">Goedgekeurd</span>}
          </header>
          <dl className="bh-meta">
            {k.branche && <><dt>Soort zaak</dt><dd>{k.branche}</dd></>}
            {k.web && <><dt>Website</dt><dd>{k.web}</dd></>}
            {k.contact && <><dt>Contact</dt><dd>{k.contact}</dd></>}
            {k.vervoer && <><dt>Vervoer</dt><dd>{k.vervoer}</dd></>}
            {k.motivatie && <><dt>Waarom</dt><dd className="pt-pre">{k.motivatie}</dd></>}
          </dl>
        </article>
      ))}
      {profiel && (
        <dl className="bh-meta pt-profiel">
          {profiel.gsm && <><dt>Gsm</dt><dd>{profiel.gsm}</dd></>}
          {(profiel.straat || profiel.gemeente) && <><dt>Adres</dt><dd>{[profiel.straat, [profiel.postcode, profiel.gemeente].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</dd></>}
          {profiel.ouder_naam && <><dt>Ouder</dt><dd>{profiel.ouder_naam}{profiel.ouder_gsm ? ` · ${profiel.ouder_gsm}` : ""}{profiel.ouder_email ? ` · ${profiel.ouder_email}` : ""}</dd></>}
          {profiel.rijbewijs && <><dt>Rijbewijs</dt><dd>{profiel.rijbewijs}</dd></>}
          {profiel.talen && <><dt>Talen</dt><dd>{profiel.talen}</dd></>}
          {profiel.aandacht && <><dt>Aandacht</dt><dd className="pt-pre">{profiel.aandacht}</dd></>}
        </dl>
      )}
    </div>
  );
}

const rij = (label: string, waarde?: string | null) => (waarde ? <><dt>{label}</dt><dd>{waarde}</dd></> : null);

/** Alleen-lezen weergave van een aanvraag (portaal en beheer). */
export function AanvraagSamenvatting({ g }: { g: AanvraagGegevens }) {
  const b = g.bedrijf ?? {}, m = g.mentor ?? {}, v = g.verantwoordelijke ?? {}, w = g.werkvloer ?? {}, s = g.stagiair ?? {};
  const kledij = (w.kledij ?? []).map((k) => KLEDIJ.find(([x]) => x === k)?.[1] ?? k).join(", ");
  return (
    <div className="pt-sam pt-sam2">
      <div>
        <h3 className="bh-h3">Stageplaats</h3>
        <dl className="bh-meta">
          {rij("Naam", b.naam)}
          {rij("Officieel", b.juridisch)}
          {rij("Ondernemingsnr.", b.kbo)}
          {rij("Soort", b.soort === "onthaal" ? "Onthaal" : b.soort === "sales" ? "Sales" : "")}
          {rij("Adres", [b.straat, [b.postcode, b.gemeente].filter(Boolean).join(" ")].filter(Boolean).join(", "))}
          {rij("Telefoon", b.tel)}
          {rij("Website", b.web)}
        </dl>
      </div>
      <div>
        <h3 className="bh-h3">Mentor</h3>
        <dl className="bh-meta">
          {rij("Naam", m.naam)}
          {rij("Functie", m.functie)}
          {rij("E-mail", m.email)}
          {rij("Telefoon", m.tel)}
          {v.zelfde === false ? rij("Tekent contract", [v.naam, v.functie, v.email, v.tel].filter(Boolean).join(" · ")) : rij("Tekent contract", "de mentor")}
        </dl>
      </div>
      <div>
        <h3 className="bh-h3">Werkvloer</h3>
        <dl className="bh-meta">
          {rij("Taken", w.taken)}
          {rij("Startuur", w.startuur)}
          {rij("Melden bij", w.melden)}
          {rij("Kledij", kledij)}
        </dl>
      </div>
      <div>
        <h3 className="bh-h3">Stagiair</h3>
        <dl className="bh-meta">
          {rij("Geboortedatum", s.geboortedatum)}
          {rij("Gsm", s.gsm)}
          {rij("Bij nood", [s.nood_naam, s.nood_tel].filter(Boolean).join(" · "))}
        </dl>
      </div>
    </div>
  );
}
