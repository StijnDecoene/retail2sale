import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import type { serverClient } from "@/lib/supabase/server";
import type { AanvraagGegevens } from "@/lib/portaal";
import type { Activiteit } from "@/lib/activiteiten";
import { contractPlat, isMeerderjarig, type ContractData, type ContractGegevens, type Partij, type Rol } from "@/lib/contract";

type Sb = Awaited<ReturnType<typeof serverClient>>;

export const nieuweLink = () => randomBytes(24).toString("base64url"); // 32 tekens
export const tekstHash = (d: ContractData) => createHash("sha256").update(contractPlat(d)).digest("hex");

export async function bezoeker() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;
  return { ip, browser: h.get("user-agent") };
}

/** Schooleigen activiteitenlijst (actieve activiteiten). Leeg als de tabel nog niet bestaat. */
export async function laadCatalogus(sb: Sb, ookInactief = false): Promise<Activiteit[]> {
  let q = sb.from("activiteiten").select("*").order("volgorde");
  if (!ookInactief) q = q.eq("actief", true);
  const { data, error } = await q;
  return error ? [] : ((data ?? []) as Activiteit[]);
}

/** Contract zoals de partij met deze link het ziet (zonder login). */
export async function contractViaLink(sb: Sb, token: string): Promise<(ContractData & { rol: Rol }) | null> {
  if (!token || token.length < 30) return null;
  const { data, error } = await sb.rpc("contract_via_link", { p_token: token });
  if (error || !data) return null;
  return { ...(data as ContractData & { rol: Rol }), catalogus: await laadCatalogus(sb) };
}

export type PartijBeheer = Partij & { token: string | null; email: string | null; uitgenodigd_op: string | null; geopend_op: string | null; ip: string | null };

/** Contract voor het beheer (begeleiders), met de persoonlijke links. */
export async function contractBeheer(sb: Sb, dossierId: string): Promise<(ContractData & { partijenBeheer: PartijBeheer[]; log: { op: string; wie: string; wat: string }[] }) | null> {
  const { data: c } = await sb.from("contracten").select("*").eq("dossier_id", dossierId).maybeSingle();
  if (!c) return null;
  const { data: d } = await sb.from("dossiers").select("id, leerling_id, blok_id").eq("id", dossierId).single();
  const [lR, bR, uR, aR, gR, pR, logR, catalogus] = await Promise.all([
    sb.from("leerlingen").select("voornaam, naam, klas, email, gsm").eq("id", d!.leerling_id).single(),
    sb.from("blokken").select("naam, code, schooljaar, start_datum, eind_datum, uren, uren_per_week").eq("id", d!.blok_id).single(),
    sb.from("uitzonderingen").select("van, tot, naam, soort").eq("blok_id", d!.blok_id).order("van"),
    sb.from("aanvragen").select("gegevens").eq("dossier_id", dossierId).maybeSingle(),
    sb.from("begeleiders").select("naam, telefoon, email, rol").eq("actief", true).order("naam"),
    sb.from("contract_partijen").select("*").eq("dossier_id", dossierId),
    sb.from("contract_log").select("op, wie, wat").eq("dossier_id", dossierId).order("op", { ascending: false }).limit(50),
    laadCatalogus(sb),
  ]);
  const partijen = (pR.data ?? []) as PartijBeheer[];
  return {
    dossier_id: dossierId,
    leerling: lR.data!,
    blok: bR.data!,
    uitzonderingen: uR.data ?? [],
    aanvraag: ((aR.data?.gegevens ?? {}) as AanvraagGegevens),
    team: ((gR.data ?? []) as { naam: string; telefoon: string | null; email: string; rol: string }[]).filter((g) => g.rol !== "directie"),
    contract: { gegevens: (c.gegevens ?? {}) as ContractGegevens, meerderjarig: c.meerderjarig, afgerond_op: c.afgerond_op },
    partijen,
    partijenBeheer: partijen,
    catalogus,
    log: logR.data ?? [],
  };
}

/** Contract klaarzetten voor een dossier met een goedgekeurde aanvraag (doet niets als het al bestaat). */
export async function contractKlaarzetten(sb: Sb, dossierId: string, door: string): Promise<{ ok?: string; fout?: string; nieuw?: boolean }> {
  const { data: bestaat } = await sb.from("contracten").select("dossier_id").eq("dossier_id", dossierId).maybeSingle();
  if (bestaat) return { ok: "Het contract bestaat al.", nieuw: false };
  const [{ data: d }, { data: a }] = await Promise.all([
    sb.from("dossiers").select("id, leerling_id, blok_id").eq("id", dossierId).single(),
    sb.from("aanvragen").select("gegevens").eq("dossier_id", dossierId).maybeSingle(),
  ]);
  if (!d || !a) return { fout: "Er is nog geen aanvraag voor dit dossier." };
  const [{ data: l }, { data: b }] = await Promise.all([
    sb.from("leerlingen").select("email").eq("id", d.leerling_id).single(),
    sb.from("blokken").select("start_datum").eq("id", d.blok_id).single(),
  ]);
  const g = (a.gegevens ?? {}) as AanvraagGegevens;
  const meerderjarig = isMeerderjarig(g.stagiair?.geboortedatum, b!.start_datum);
  const ondertekenaarMail = g.verantwoordelijke?.zelfde === false ? g.verantwoordelijke.email : g.mentor?.email;
  const { error } = await sb.from("contracten").insert({ dossier_id: dossierId, meerderjarig });
  if (error) return { fout: error.code === "42P01" || error.code === "PGRST205" ? "De databank mist nog de contracttabellen. Voer de migratie uit." : "Klaarzetten lukte niet." };
  const rijen: { dossier_id: string; rol: Rol; token: string | null; email: string | null }[] = [
    { dossier_id: dossierId, rol: "stagegever", token: nieuweLink(), email: (ondertekenaarMail ?? "").toLowerCase() || null },
    { dossier_id: dossierId, rol: "stagiair", token: nieuweLink(), email: l?.email ?? null },
    ...(meerderjarig ? [] : [{ dossier_id: dossierId, rol: "ouder" as Rol, token: nieuweLink(), email: null }]),
    { dossier_id: dossierId, rol: "directie", token: null, email: null },
  ];
  const { error: pe } = await sb.from("contract_partijen").insert(rijen);
  if (pe) return { fout: "Klaarzetten lukte niet." };
  await sb.from("contract_log").insert({ dossier_id: dossierId, wie: door, wat: `contract klaargezet${meerderjarig ? " (meerderjarige stagiair: 3 handtekeningen)" : ""}` });
  return { ok: "Contract klaargezet.", nieuw: true };
}

/** Link naar de contractpagina. */
export const contractUrl = (site: string, token: string) => `${site}/contract/${token}`;
