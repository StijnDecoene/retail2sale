"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { SCHOOL } from "@/lib/stage";
import { IcSluit, IcVink } from "./Icons";

type Rol = "stagegever" | "ouder" | "leerling" | "andere";

const ROLLEN: { id: Rol; label: string }[] = [
  { id: "stagegever", label: "Stagegever" },
  { id: "ouder", label: "Ouder" },
  { id: "leerling", label: "Leerling" },
  { id: "andere", label: "Andere" },
];

const ONDERWERPEN: Record<Rol, string[]> = {
  stagegever: ["Een stageplaats aanbieden", "Aanvraag of stagecontract", "Werkrooster", "Afwezigheid of inhaalstage", "Evaluatie", "Inloggen op het portaal", "Andere vraag"],
  ouder: ["Algemene info over de stage", "Een stageplaats zoeken", "Afwezigheid van mijn kind", "Andere vraag"],
  leerling: ["Een stageplaats zoeken", "Werkrooster of uren", "Afwezigheid of inhaalstage", "Inloggen op het portaal", "Andere vraag"],
  andere: ["Info over de opleiding", "Samenwerking", "Andere vraag"],
};

const STAGE_MAIL = "retail2sale@snh.be";

export default function VraagKnop({ className, children }: { className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {/* Via een portal naar <body>: de kopbalk (backdrop-filter) zou het venster anders insluiten. */}
      {open && createPortal(<VraagDialoog onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function VraagDialoog({ onClose }: { onClose: () => void }) {
  const [rol, setRol] = useState<Rol>("stagegever");
  const [status, setStatus] = useState<"invullen" | "bezig" | "verstuurd">("invullen");
  const [fout, setFout] = useState<string | null>(null);
  const eersteVeld = useRef<HTMLInputElement>(null);

  useEffect(() => {
    eersteVeld.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    const vorige = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = vorige;
    };
  }, [onClose]);

  async function versturen(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFout(null);
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();

    if (v("website")) {
      setStatus("verstuurd"); // honingpot: stil negeren
      return;
    }
    if (!v("naam") || !v("email") || !v("vraag")) {
      setFout("Vul je naam, e-mailadres en je vraag in.");
      return;
    }
    if (!f.get("akkoord")) {
      setFout("Vink aan dat we je gegevens mogen gebruiken om je vraag te beantwoorden.");
      return;
    }

    const rij = {
      rol,
      naam: v("naam"),
      email: v("email"),
      telefoon: v("telefoon") || null,
      organisatie: v("organisatie") || null,
      klas: v("klas") || null,
      leerling: v("leerling") || null,
      onderwerp: v("onderwerp") || null,
      vraag: v("vraag"),
      antwoord_via: v("via") || "e-mail",
    };

    const sb = supabase();
    if (!sb) {
      setFout(`Het formulier is nog niet gekoppeld. Mail je vraag naar ${STAGE_MAIL} of bel ${SCHOOL.tel}.`);
      return;
    }
    setStatus("bezig");
    const { error } = await sb.from("vragen").insert(rij);
    if (error) {
      setStatus("invullen");
      setFout(`Versturen lukte niet. Probeer opnieuw, of mail naar ${STAGE_MAIL}.`);
      return;
    }
    setStatus("verstuurd");
  }

  const toonOrganisatie = rol === "stagegever" || rol === "andere";
  const toonKlas = rol === "ouder" || rol === "leerling";
  const leerlingLabel =
    rol === "stagegever" ? "Naam van de stagiair (optioneel)" : rol === "ouder" ? "Naam van je kind" : "Je stageplaats (optioneel)";

  return (
    <div className="dialoog-achter">
      <button type="button" className="dialoog-sluit-vlak" aria-label="Venster sluiten" onClick={onClose} />
      <div className="dialoog" role="dialog" aria-modal="true" aria-labelledby="vraagtitel">
        <div className="dialoog-kop">
          <div>
            <span className="eyebrow">Retail2Sale · Spes Nostra Heule</span>
            <h2 id="vraagtitel">Stel ons een vraag</h2>
            <span className="sub">We antwoorden binnen twee schooldagen.</span>
          </div>
          <button type="button" className="icoonknop" aria-label="Sluiten" onClick={onClose}>
            <IcSluit />
          </button>
        </div>

        {status === "verstuurd" ? (
          <div className="bedankt">
            <div className="vink"><IcVink size={30} /></div>
            <h3>Bedankt, je vraag is verstuurd</h3>
            <p>Fien of Stijn neemt binnen twee schooldagen contact met je op.</p>
            <button type="button" className="btn btn-dark" onClick={onClose}>Sluiten</button>
          </div>
        ) : (
          <form className="formulier" onSubmit={versturen} noValidate>
            <fieldset>
              <legend>Ik ben</legend>
              <div className="segment" role="group" aria-label="Ik ben">
                {ROLLEN.map((r) => (
                  <button key={r.id} type="button" aria-pressed={rol === r.id} onClick={() => setRol(r.id)}>
                    {r.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="velden">
              <div className="veld">
                <label htmlFor="f-naam">Voor- en achternaam</label>
                <input ref={eersteVeld} id="f-naam" name="naam" type="text" autoComplete="name" required />
              </div>
              <div className="veld">
                <label htmlFor="f-mail">E-mailadres</label>
                <input id="f-mail" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="veld">
                <label htmlFor="f-tel">Telefoon <small>(optioneel)</small></label>
                <input id="f-tel" name="telefoon" type="tel" autoComplete="tel" />
              </div>
              {toonOrganisatie && (
                <div className="veld">
                  <label htmlFor="f-org">{rol === "stagegever" ? "Bedrijf of organisatie" : "Organisatie (optioneel)"}</label>
                  <input id="f-org" name="organisatie" type="text" autoComplete="organization" />
                </div>
              )}
              {toonKlas && (
                <div className="veld">
                  <label htmlFor="f-klas">Klas</label>
                  <select id="f-klas" name="klas" defaultValue="">
                    <option value="">Kies een klas</option>
                    <option>4de jaar</option>
                    <option>5de jaar</option>
                    <option>6de jaar</option>
                  </select>
                </div>
              )}
            </div>

            {rol !== "andere" && (
              <div className="veld">
                <label htmlFor="f-lln">{leerlingLabel}</label>
                <input id="f-lln" name="leerling" type="text" />
              </div>
            )}

            <div className="veld">
              <label htmlFor="f-ond">Onderwerp</label>
              <select id="f-ond" name="onderwerp" defaultValue="" key={rol}>
                <option value="">Kies een onderwerp</option>
                {ONDERWERPEN[rol].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>

            <div className="veld">
              <label htmlFor="f-msg">Je vraag</label>
              <textarea
                id="f-msg"
                name="vraag"
                rows={4}
                placeholder="Beschrijf kort je vraag. Vermeld bij een stagevraag ook de blokstage (1 of 2)."
                required
              />
            </div>

            <div className="veld">
              <span className="lbl">Bij voorkeur antwoord via</span>
              <div className="keuzes">
                <label><input type="radio" name="via" value="e-mail" defaultChecked /> E-mail</label>
                <label><input type="radio" name="via" value="telefoon" /> Telefoon</label>
              </div>
            </div>

            <div className="honing" aria-hidden="true">
              <label htmlFor="f-web">Website</label>
              <input id="f-web" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <label className="vinkje">
              <input type="checkbox" name="akkoord" />
              <span>
                Ik ga akkoord dat Spes Nostra Heule mijn gegevens gebruikt om mijn vraag te beantwoorden, volgens de{" "}
                <a href="/privacy">privacyverklaring</a>.
              </span>
            </label>

            {fout && <p className="fout" role="alert">{fout}</p>}

            <div className="form-voet">
              <span>
                Liever bellen? <a href={`tel:${SCHOOL.telLink}`} style={{ fontWeight: 600 }}>{SCHOOL.tel}</a>
              </span>
              <div>
                <button type="button" className="btn btn-line" onClick={onClose}>Annuleren</button>
                <button type="submit" className="btn btn-blue" disabled={status === "bezig"}>
                  {status === "bezig" ? "Versturen…" : "Vraag versturen"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
