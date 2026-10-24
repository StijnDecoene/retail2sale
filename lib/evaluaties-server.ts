import "server-only";
import type { serverClient } from "@/lib/supabase/server";
import type { Sleutel } from "@/lib/werkrooster-server";
import { PUNTEN_STANDAARD, type EvaluatieRij, type Puntenschema, type Resultaat } from "@/lib/evaluaties";

type Sb = Awaited<ReturnType<typeof serverClient>>;

export type EvalContext = {
  wie: "stagegever" | "stagiair" | "school";
  dossier_id: string;
  vrijgegeven: boolean;
  stage: "sales" | "onthaal" | "";
  leerling: { voornaam: string; naam: string; klas: string; email?: string | null };
  winkel: string | null;
  mentor: string | null;
  mentorEmail?: string | null;
  blok: { id?: string; naam: string; start_datum: string; eind_datum: string; uren: number };
  evaluaties: EvaluatieRij[];
  eindpunt: number | null;
  opmerking: string | null;
  resultaat?: Resultaat | null;
  punten?: Puntenschema;
};

/** Voor de stagegeverlink en het portaal (via de databankfunctie: enkel wat die partij mag zien). */
export async function laadEvaluatie(sb: Sb, k: Sleutel): Promise<EvalContext | null> {
  const { data, error } = await sb.rpc("evaluatie_laden", { p_token: k.token ?? null, p_dossier: k.token ? null : (k.dossier ?? null) });
  if (error || !data) return null;
  const c = data as EvalContext;
  c.evaluaties ??= [];
  return c;
}

/** Voor het beheer: alles, ook zonder contract. */
export async function laadEvaluatieSchool(sb: Sb, dossierId: string): Promise<EvalContext | null> {
  const { data: d } = await sb.from("dossiers").select("id, leerling_id, blok_id, mentor_naam, mentor_email, stageplaats_id").eq("id", dossierId).maybeSingle();
  if (!d) return null;
  const [lR, bR, aR, cR, eR, rR, iR, pR] = await Promise.all([
    sb.from("leerlingen").select("voornaam, naam, klas, email").eq("id", d.leerling_id).single(),
    sb.from("blokken").select("id, naam, start_datum, eind_datum, uren").eq("id", d.blok_id).single(),
    sb.from("aanvragen").select("gegevens").eq("dossier_id", dossierId).maybeSingle(),
    sb.from("contracten").select("gegevens").eq("dossier_id", dossierId).maybeSingle(),
    sb.from("evaluaties").select("*").eq("dossier_id", dossierId),
    sb.from("evaluatie_resultaten").select("*").eq("dossier_id", dossierId).maybeSingle(),
    sb.from("evaluatie_instellingen").select("punten").eq("blok_id", d.blok_id).maybeSingle(),
    d.stageplaats_id ? sb.from("stageplaatsen").select("naam").eq("id", d.stageplaats_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const a = (aR.data?.gegevens ?? {}) as { bedrijf?: { naam?: string; soort?: string }; mentor?: { naam?: string; email?: string } };
  const c = (cR.data?.gegevens ?? {}) as { winkel_naam?: string; mentor?: string };
  const res = (rR.data as Resultaat | null) ?? null;
  return {
    wie: "school",
    dossier_id: dossierId,
    vrijgegeven: !!res?.vrijgegeven_op,
    stage: (a.bedrijf?.soort as "sales" | "onthaal" | undefined) ?? "",
    leerling: lR.data as EvalContext["leerling"],
    winkel: c.winkel_naam || a.bedrijf?.naam || (pR.data as { naam: string } | null)?.naam || null,
    mentor: c.mentor || a.mentor?.naam || d.mentor_naam || null,
    mentorEmail: a.mentor?.email || d.mentor_email || null,
    blok: bR.data as EvalContext["blok"],
    evaluaties: (eR.data ?? []) as EvaluatieRij[],
    eindpunt: res?.eindpunt ?? null,
    opmerking: res?.opmerking ?? null,
    resultaat: res,
    punten: { ...PUNTEN_STANDAARD, ...((iR.data?.punten as Partial<Puntenschema> | undefined) ?? {}) },
  };
}
