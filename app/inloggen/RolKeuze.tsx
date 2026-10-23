"use client";

import { useState } from "react";
import Link from "next/link";
import { IcMail, IcSmartschool } from "@/components/Icons";

export type Rol = "stagegever" | "stagiair" | "school";

const LABELS: Record<Rol, string> = { stagegever: "Stagegever", stagiair: "Stagiair", school: "School" };

// Zolang het portaal nog in opbouw is, staan de knoppen uit.
// Fase 1 (technisch plan): inloggen met Smartschool en Microsoft, link per e-mail voor stagegevers.
const PORTAAL_OPEN = false;

export default function RolKeuze({ start }: { start: Rol }) {
  const [rol, setRol] = useState<Rol>(start);

  return (
    <div className="login-form">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2>Inloggen</h2>
        <p className="sub">Kies eerst wie je bent.</p>
      </div>

      <div className="segment" role="group" aria-label="Ik ben">
        {(Object.keys(LABELS) as Rol[]).map((r) => (
          <button key={r} type="button" aria-pressed={rol === r} onClick={() => setRol(r)}>
            {LABELS[r]}
          </button>
        ))}
      </div>

      {!PORTAAL_OPEN && (
        <p className="info binnenkort">
          <b>Het nieuwe stageportaal is in opbouw.</b> Inloggen kan binnenkort. Tot dan verloopt alles zoals nu, via je
          stagebegeleider.
        </p>
      )}

      {(rol === "stagiair" || rol === "school") && (
        <>
          <button type="button" className="btn btn-blue" disabled={!PORTAAL_OPEN}>
            <IcSmartschool color="#fff" />
            Inloggen met Smartschool
          </button>
          <div className="of">of</div>
          <button type="button" className="btn btn-line" disabled={!PORTAAL_OPEN} style={{ fontWeight: 600 }}>
            <IcMail />
            Met je Microsoft-schoolaccount
          </button>
          <p className="info">
            {rol === "stagiair" ? (
              <>
                <b>Lukt het niet?</b> Alleen leerlingen van het 4de, 5de en 6de jaar Onthaal, organisatie en sales staan op de
                lijst. Kom je er toch niet in, laat het dan weten aan de stagebegeleiding via Smartschool.
              </>
            ) : (
              <>
                <b>Voor begeleiders en directie.</b> Na het inloggen opent het beheer. Je rechten volgen uit de lijst van
                begeleiders en de directeur in de instellingen.
              </>
            )}
          </p>
        </>
      )}

      {rol === "stagegever" && (
        <>
          <div className="veld">
            <label htmlFor="mail">E-mailadres</label>
            <input id="mail" type="email" placeholder="naam@bedrijf.be" autoComplete="email" disabled={!PORTAAL_OPEN} />
          </div>
          <button type="button" className="btn btn-blue" disabled={!PORTAAL_OPEN}>
            Stuur mij een inloglink
          </button>
          <p className="info">
            <b>Eerste keer?</b> Als stagegever krijgt u een uitnodiging per e-mail zodra de aanvraag voor uw stagiair binnen
            is. Geen mail ontvangen? <Link href="/#contact" style={{ fontWeight: 600 }}>Laat het ons weten</Link>.
          </p>
        </>
      )}
    </div>
  );
}
