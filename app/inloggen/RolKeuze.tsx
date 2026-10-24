"use client";

import { useState, useTransition, type FormEvent } from "react";
import { stagegeverLinkAanvragen, type LinkResultaat } from "./acties";
import Link from "next/link";
import { IcMail, IcSmartschool } from "@/components/Icons";
import { browserClient } from "@/lib/supabase/browser";
import { MICROSOFT_LOGIN_AAN, SCHOOL_DOMEINEN, supabaseIngesteld } from "@/lib/supabase/env";

export type Rol = "stagegever" | "stagiair" | "school";

const LABELS: Record<Rol, string> = { stagegever: "Stagegever", stagiair: "Stagiair", school: "School" };

// Stagiair volgt later (Smartschool). Stagegever: persoonlijke link per mail, opnieuw aan te vragen met het mailadres.
const PORTAAL_OPEN = false;

export default function RolKeuze({ start, fout }: { start: Rol; fout?: string }) {
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

      {fout && rol === "school" && (
        <p className="fout" role="alert">
          Inloggen lukte niet: {fout}
        </p>
      )}

      {rol === "school" ? <SchoolLogin /> : rol === "stagegever" ? <StagegeverLogin /> : <NogNietOpen />}
    </div>
  );
}

function SchoolLogin() {
  const [status, setStatus] = useState<"invullen" | "bezig" | "verstuurd">("invullen");
  const [melding, setMelding] = useState<string | null>(null);

  if (!supabaseIngesteld()) {
    return <p className="info binnenkort">Het beheer is nog niet gekoppeld aan de databank.</p>;
  }

  async function metMicrosoft() {
    setMelding(null);
    const { error } = await browserClient().auth.signInWithOAuth({
      provider: "azure",
      options: { scopes: "email", redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setMelding("Inloggen met Microsoft is nog niet ingesteld. Gebruik de inloglink per e-mail.");
  }

  async function stuurLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMelding(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim().toLowerCase();
    const domein = email.split("@")[1] ?? "";
    if (!SCHOOL_DOMEINEN.includes(domein)) {
      setMelding(`Gebruik je schooladres (@${SCHOOL_DOMEINEN[0]}).`);
      return;
    }
    setStatus("bezig");
    const { error } = await browserClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("invullen");
      setMelding(
        error.status === 429
          ? "Er zijn net te veel inloglinks aangevraagd. Probeer het over een paar minuten opnieuw."
          : "De inloglink kon niet verstuurd worden. Probeer opnieuw.",
      );
      return;
    }
    setStatus("verstuurd");
  }

  return (
    <>
      {MICROSOFT_LOGIN_AAN && (
        <>
          <button type="button" className="btn btn-blue" onClick={metMicrosoft}>
            <IcMail color="#fff" />
            Inloggen met je Microsoft-schoolaccount
          </button>
          <div className="of">of</div>
        </>
      )}

      {status === "verstuurd" ? (
        <p className="info" role="status">
          <b>Kijk in je mailbox.</b> We stuurden je een inloglink. Klik erop in dezelfde browser; de link werkt één keer.
        </p>
      ) : (
        <form onSubmit={stuurLink} style={{ display: "flex", flexDirection: "column", gap: 16 }} noValidate>
          <div className="veld">
            <label htmlFor="school-mail">Je e-mailadres van school</label>
            <input id="school-mail" name="email" type="email" placeholder="voornaam.naam@snh.be" autoComplete="email" required />
          </div>
          <button type="submit" className={MICROSOFT_LOGIN_AAN ? "btn btn-line" : "btn btn-blue"} disabled={status === "bezig"} style={{ fontWeight: 600 }}>
            {status === "bezig" ? "Versturen…" : "Stuur mij een inloglink"}
          </button>
        </form>
      )}

      {melding && <p className="fout" role="alert">{melding}</p>}

      <p className="info">
        <b>Voor begeleiders en directie.</b> Na het inloggen opent het beheer. Alleen wie op de lijst van begeleiders staat,
        krijgt toegang.
      </p>
    </>
  );
}

function StagegeverLogin() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<LinkResultaat | null>(null);
  const [bezig, run] = useTransition();
  function verstuur(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    run(async () => setMsg(await stagegeverLinkAanvragen(email)));
  }
  return (
    <>
      <p className="info">
        <b>Geen wachtwoord nodig.</b> U werkt met een persoonlijke link die u per mail krijgt van retail2sale@snh.be. Link kwijt? Vul het
        mailadres in waarop u de mail over de stage kreeg: u krijgt meteen een overzicht van al uw stagiairs.
      </p>
      {msg?.ok ? (
        <p className="info" role="status"><b>Kijk in uw mailbox.</b> {msg.ok}</p>
      ) : (
        <form onSubmit={verstuur} style={{ display: "flex", flexDirection: "column", gap: 16 }} noValidate>
          <div className="veld">
            <label htmlFor="sg-mail">Uw e-mailadres</label>
            <input id="sg-mail" type="email" placeholder="naam@bedrijf.be" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-blue" disabled={bezig || !email.includes("@")}>{bezig ? "Versturen…" : "Stuur mij mijn links"}</button>
        </form>
      )}
      {msg?.fout && <p className="fout" role="alert">{msg.fout}</p>}
      <p className="info">
        <b>Eerste keer?</b> U krijgt een uitnodiging per mail zodra de stage van uw stagiair vastligt. Meer uitleg in de{" "}
        <Link href="/handleiding/stagegever" style={{ fontWeight: 600 }}>handleiding voor stagegevers</Link>.
      </p>
    </>
  );
}

function NogNietOpen() {
  const rol = "stagiair" as Rol;
  return (
    <>
      {!PORTAAL_OPEN && (
        <p className="info binnenkort">
          <b>Het nieuwe stageportaal is in opbouw.</b> Inloggen kan binnenkort. Tot dan verloopt alles zoals nu, via je
          stagebegeleider.
        </p>
      )}
      {rol === "stagiair" ? (
        <>
          <button type="button" className="btn btn-blue" disabled>
            <IcSmartschool color="#fff" />
            Inloggen met Smartschool
          </button>
          <div className="of">of</div>
          <button type="button" className="btn btn-line" disabled style={{ fontWeight: 600 }}>
            <IcMail />
            Met je Microsoft-schoolaccount
          </button>
          <p className="info">
            <b>Lukt het niet?</b> Alleen leerlingen van het 5de en 6de jaar Onthaal, organisatie en sales (en van het 4de jaar
            Organisatie en logistiek, voor hun top 3) staan op de lijst. Kom je er toch niet in, laat het dan weten aan de stagebegeleiding via Smartschool.
          </p>
        </>
      ) : null}
    </>
  );
}
