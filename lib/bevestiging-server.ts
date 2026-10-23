import "server-only";
import type { serverClient } from "@/lib/supabase/server";
import type { Blok, Uitzondering } from "@/lib/beheer";
import type { AanvraagGegevens } from "@/lib/portaal";
import type { BevestigingData } from "@/lib/bevestiging";

type Sb = Awaited<ReturnType<typeof serverClient>>;

/** Alle gegevens voor de bevestiging van één dossier, of null als er (nog) geen aanvraag is. */
export async function laadBevestiging(sb: Sb, dossierId: string, site?: string): Promise<BevestigingData | null> {
  const { data: d } = await sb.from("dossiers").select("id, leerling_id, blok_id, begeleider_id").eq("id", dossierId).maybeSingle();
  if (!d) return null;
  const [lR, bR, uR, aR, gR] = await Promise.all([
    sb.from("leerlingen").select("voornaam, naam, klas, email, gsm, schooljaar").eq("id", d.leerling_id).single(),
    sb.from("blokken").select("*").eq("id", d.blok_id).single(),
    sb.from("uitzonderingen").select("van, tot, naam, soort").eq("blok_id", d.blok_id).order("van"),
    sb.from("aanvragen").select("gegevens").eq("dossier_id", dossierId).maybeSingle(),
    sb.from("begeleiders").select("id, naam, telefoon, email, rol, actief").eq("actief", true).order("naam"),
  ]);
  if (!lR.data || !bR.data || !aR.data) return null;
  const blok = bR.data as Blok;
  const begeleiders = (gR.data ?? []) as { id: string; naam: string; telefoon: string | null; email: string; rol: string }[];
  const team = begeleiders.filter((g) => g.rol !== "directie").map(({ naam, telefoon, email }) => ({ naam, telefoon, email }));
  const eigen = begeleiders.find((g) => g.id === d.begeleider_id);
  const g = (aR.data.gegevens ?? {}) as AanvraagGegevens;
  // Link van de stagegever naar het contract (tabel bestaat pas na de contractmigratie).
  const { data: cp } = site ? await sb.from("contract_partijen").select("token").eq("dossier_id", dossierId).eq("rol", "stagegever").maybeSingle() : { data: null };
  return {
    schooljaar: blok.schooljaar,
    blok,
    uitzonderingen: (uR.data ?? []) as Uitzondering[],
    leerling: {
      voornaam: lR.data.voornaam, naam: lR.data.naam, klas: lR.data.klas,
      email: lR.data.email, gsm: g.stagiair?.gsm || lR.data.gsm,
    },
    aanvraag: g,
    begeleider: eigen ? { naam: eigen.naam, telefoon: eigen.telefoon, email: eigen.email } : null,
    team,
    contractLink: cp?.token && site ? `${site}/contract/${cp.token}` : null,
  };
}
