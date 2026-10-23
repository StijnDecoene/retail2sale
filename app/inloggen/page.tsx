import type { Metadata } from "next";
import Logos from "@/components/Logos";
import { IcVink } from "@/components/Icons";
import { redirect } from "next/navigation";
import RolKeuze, { type Rol } from "./RolKeuze";
import { supabaseIngesteld } from "@/lib/supabase/env";
import { huidigeGebruiker } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inloggen" };

const ROLLEN: Rol[] = ["stagegever", "stagiair", "school"];

export default async function Inloggen({ searchParams }: { searchParams: Promise<{ rol?: string; fout?: string }> }) {
  const { rol, fout } = await searchParams;
  const start: Rol = ROLLEN.includes(rol as Rol) ? (rol as Rol) : "stagiair";

  // Al ingelogd als begeleider? Dan meteen naar het beheer.
  if (supabaseIngesteld()) {
    const { begeleider } = await huidigeGebruiker();
    if (begeleider) redirect("/beheer");
  }

  return (
    <main className="login">
      <div className="login-paneel">
        <div className="streepjes" aria-hidden="true" />
        <Logos />
        <div className="login-boodschap">
          <span className="eyebrow">Stageportaal</span>
          <h1>Alles voor de stage, op één plek.</h1>
          <p>Na het inloggen zie je meteen welke stap aan de beurt is en welk document je nog moet invullen.</p>
          <ul>
            <li><IcVink color="#8FB6EA" />Contract en werkrooster online invullen</li>
            <li><IcVink color="#8FB6EA" />Afwezigheid en inhaalstage in twee klikken</li>
            <li><IcVink color="#8FB6EA" />Evaluaties openen automatisch op tijd</li>
          </ul>
        </div>
        <span className="copy">© {new Date().getFullYear()} Spes Nostra Heule</span>
      </div>
      <div className="login-form-kant">
        <RolKeuze start={start} fout={fout} />
      </div>
    </main>
  );
}
