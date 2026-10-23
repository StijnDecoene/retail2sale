import "server-only";
import { redirect } from "next/navigation";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import { doetMee, schooljaarVan, vandaagIso, type Blok, type Leerling } from "@/lib/beheer";
import { stapStatus, type AanvraagRij, type Beoordeling, type ContractStand, type Profiel, type Top3Rij } from "@/lib/portaal";

export type PubliekePlaats = { naam: string; straat: string | null; postcode: string | null; gemeente: string | null; website: string | null; sector: string | null; bezet: boolean };

/**
 * Wie bekijkt het portaal? Een leerling ziet het eigen dossier. Een begeleider kan met ?leerling=<id>
 * het dossier van een leerling bekijken en invullen zoals de leerling het ziet ("Bekijk als leerling").
 */
export async function portaalGebruiker(leerlingParam?: string) {
  const { user, begeleider } = await huidigeGebruiker();
  if (!user) redirect("/inloggen?rol=stagiair");
  const sb = await serverClient();
  const sj = schooljaarVan();

  if (begeleider) {
    if (!leerlingParam) return { sb, user, begeleider, leerling: null as Leerling | null, voorbeeld: true };
    const { data } = await sb.from("leerlingen").select("*").eq("id", leerlingParam).maybeSingle();
    return { sb, user, begeleider, leerling: (data as Leerling | null) ?? null, voorbeeld: true };
  }
  // Een leerling ziet via de toegangsregels enkel de eigen fiche(s).
  const { data } = await sb.from("leerlingen").select("*").eq("schooljaar", sj).limit(1);
  return { sb, user, begeleider: null, leerling: ((data ?? [])[0] as Leerling | undefined) ?? null, voorbeeld: false };
}

/** Blokstages van het schooljaar van de leerling, enkel die waar de klas aan meedoet. Standaard: de eerste die nog niet voorbij is. */
export function kiesBlok(blokken: Blok[], klas: string, gevraagd?: string) {
  const mee = blokken.filter((b) => doetMee(b, klas));
  const vandaag = vandaagIso();
  const blok = mee.find((b) => b.id === gevraagd) ?? mee.find((b) => b.eind_datum >= vandaag) ?? mee.at(-1) ?? null;
  return { mee, blok };
}

/** Alles wat het portaal toont voor één leerling en één blokstage. Maakt het dossier aan als het nog niet bestaat. */
export async function laadDossier(sb: Awaited<ReturnType<typeof serverClient>>, leerling: Leerling, blok: Blok, alsBegeleider: boolean) {
  let dossierId: string | null = null;
  if (alsBegeleider) {
    await sb.from("dossiers").upsert({ leerling_id: leerling.id, blok_id: blok.id }, { onConflict: "leerling_id,blok_id", ignoreDuplicates: true });
    const { data } = await sb.from("dossiers").select("id").eq("leerling_id", leerling.id).eq("blok_id", blok.id).maybeSingle();
    dossierId = (data?.id as string | undefined) ?? null;
  } else {
    const { data } = await sb.rpc("mijn_dossier", { p_blok: blok.id });
    dossierId = (data as string | null) ?? null;
  }
  if (!dossierId) return null;

  const [dR, tR, aR, bR, pR, plR] = await Promise.all([
    sb.from("dossiers").select("id, stageplaats_id, mentor_naam").eq("id", dossierId).single(),
    sb.from("top3").select("*").eq("dossier_id", dossierId).maybeSingle(),
    sb.from("aanvragen").select("*").eq("dossier_id", dossierId).maybeSingle(),
    sb.from("beoordelingen").select("*").eq("dossier_id", dossierId),
    sb.from("leerling_profielen").select("gegevens").eq("leerling_id", leerling.id).maybeSingle(),
    sb.rpc("publieke_stageplaatsen", { p_blok: blok.id }),
  ]);
  const dossier = dR.data as { id: string; stageplaats_id: string | null; mentor_naam: string | null };
  // Contract: stand en de link van de stagiair (begeleider in voorbeeld: rechtstreeks; leerling: via eigen functies).
  let contract: ContractStand = null;
  let contractLink: string | null = null;
  if (alsBegeleider) {
    const [{ data: c }, { data: ps }] = await Promise.all([
      sb.from("contracten").select("meerderjarig, afgerond_op").eq("dossier_id", dossierId).maybeSingle(),
      sb.from("contract_partijen").select("rol, token, getekend_op").eq("dossier_id", dossierId),
    ]);
    if (c) {
      contract = { meerderjarig: c.meerderjarig, afgerond_op: c.afgerond_op, getekend: (ps ?? []).filter((p) => p.getekend_op).map((p) => p.rol as string) };
      contractLink = ((ps ?? []).find((p) => p.rol === "stagiair")?.token as string | undefined) ?? null;
    }
  } else {
    const [{ data: c }, { data: t }] = await Promise.all([
      sb.rpc("mijn_contract_status", { p_dossier: dossierId }),
      sb.rpc("mijn_contract_link", { p_dossier: dossierId }),
    ]);
    contract = (c as ContractStand) ?? null;
    contractLink = (t as string | null) ?? null;
  }
  const top3 = (tR.data as Top3Rij | null) ?? null;
  const aanvraag = (aR.data as AanvraagRij | null) ?? null;
  const beoordelingen = (bR.data ?? []) as Beoordeling[];
  let stageplaatsNaam: string | null = null;
  if (dossier.stageplaats_id) {
    // Een leerling mag de tabel stageplaatsen niet lezen (notities, score): naam via een aparte functie.
    const { data } = await sb.rpc("stageplaats_van_dossier", { p_dossier: dossierId });
    const p = ((data ?? []) as { naam: string; gemeente: string | null }[])[0];
    stageplaatsNaam = p ? `${p.naam}${p.gemeente ? `, ${p.gemeente}` : ""}` : null;
  }
  return {
    dossier,
    top3,
    aanvraag,
    beoordelingen,
    profiel: ((pR.data?.gegevens as Profiel | undefined) ?? {}) as Profiel,
    plaatsen: (plR.data ?? []) as PubliekePlaats[],
    status: stapStatus({ stageplaats_id: dossier.stageplaats_id, top3, aanvraag, beoordelingen, contract }),
    stageplaatsNaam,
    contract,
    contractLink,
  };
}
