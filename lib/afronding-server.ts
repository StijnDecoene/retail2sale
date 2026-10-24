import "server-only";
import type { serverClient } from "@/lib/supabase/server";
import { SCHOOL_CONTRACT } from "@/lib/contract";
import type { RoosterRij } from "@/lib/werkrooster";
import type { Afwezigheid, Inhaal } from "@/lib/tijdens";
import type { EvaluatieRij, Resultaat } from "@/lib/evaluaties";
import { controlelijst, urenBerekening, type Afronding, type Check, type Uren } from "@/lib/afronding";

type Sb = Awaited<ReturnType<typeof serverClient>>;

/** Wat op het attest staat; wordt bij het afronden vastgelegd in stage.afrondingen.attest. */
export type AttestGegevens = {
  code: string;
  datum: string;
  leerling: { voornaam: string; naam: string; klas: string };
  blok: { naam: string; schooljaar: string; start_datum: string; eind_datum: string; uren: number };
  stage: "sales" | "onthaal" | "";
  winkel: string;
  adres: string;
  mentor: string;
  u: Uren;
  team: string[];
  directeur: string;
};

export type AfrondingStand = {
  dossier_id: string;
  u: Uren;
  checks: Check[];
  afronding: Afronding | null;
  evaluaties: EvaluatieRij[];
};

/** Stand van de afronding voor een lijst dossiers van één blokstage (beheer). */
export async function afrondingVoorDossiers(sb: Sb, ids: string[], blok: { uren: number; eind_datum: string }, vandaag: string) {
  const per = new Map<string, AfrondingStand>();
  if (!ids.length) return { per, fout: false };
  const [rR, aR, iR, eR, sR, fR] = await Promise.all([
    sb.from("roosters").select("*").in("dossier_id", ids),
    sb.from("afwezigheden").select("*").in("dossier_id", ids),
    sb.from("inhaalmomenten").select("*").in("dossier_id", ids),
    sb.from("evaluaties").select("*").in("dossier_id", ids),
    sb.from("evaluatie_resultaten").select("*").in("dossier_id", ids),
    sb.from("afrondingen").select("*").in("dossier_id", ids),
  ]);
  const rooster = (rR.data ?? []) as RoosterRij[];
  const afw = (aR.data ?? []) as Afwezigheid[];
  const inh = ((iR.data ?? []) as Inhaal[]).map((i) => ({ ...i, afw: i.afw ?? [] }));
  const ev = (eR.data ?? []) as EvaluatieRij[];
  const res = (sR.data ?? []) as Resultaat[];
  const afr = (fR.data ?? []) as Afronding[];
  for (const id of ids) {
    const r = rooster.find((x) => x.dossier_id === id) ?? null;
    const a = afw.filter((x) => x.dossier_id === id);
    const i = inh.filter((x) => x.dossier_id === id);
    const u = urenBerekening(blok, r, a, i, vandaag);
    const evaluaties = ev.filter((x) => x.dossier_id === id);
    per.set(id, {
      dossier_id: id,
      u,
      checks: controlelijst({ blok, vandaag, rooster: r, u, teBeoordelen: a.filter((x) => x.gewettigd === null).length, evaluaties, resultaat: res.find((x) => x.dossier_id === id) ?? null }),
      afronding: afr.find((x) => x.dossier_id === id) ?? null,
      evaluaties,
    });
  }
  return { per, fout: !!fR.error };
}

/** Gegevens voor het attest en de mails, rechtstreeks uit de databank (beheer). */
export async function attestBasis(sb: Sb, dossierId: string) {
  const { data: d } = await sb.from("dossiers").select("id, leerling_id, blok_id, stageplaats_id, mentor_naam, mentor_email").eq("id", dossierId).maybeSingle();
  if (!d) return null;
  const [lR, bR, aR, cR, pR, gR, tR] = await Promise.all([
    sb.from("leerlingen").select("voornaam, naam, klas, email").eq("id", d.leerling_id).single(),
    sb.from("blokken").select("naam, schooljaar, start_datum, eind_datum, uren").eq("id", d.blok_id).single(),
    sb.from("aanvragen").select("gegevens").eq("dossier_id", dossierId).maybeSingle(),
    sb.from("contracten").select("gegevens").eq("dossier_id", dossierId).maybeSingle(),
    d.stageplaats_id ? sb.from("stageplaatsen").select("naam, straat, postcode, gemeente").eq("id", d.stageplaats_id).maybeSingle() : Promise.resolve({ data: null }),
    sb.from("contract_partijen").select("token, email").eq("dossier_id", dossierId).eq("rol", "stagegever").maybeSingle(),
    sb.from("begeleiders").select("naam, rol").eq("actief", true).order("naam"),
  ]);
  type A = { bedrijf?: { naam?: string; soort?: string; straat?: string; postcode?: string; gemeente?: string }; mentor?: { naam?: string; email?: string } };
  const a = (aR.data?.gegevens ?? {}) as A;
  const c = (cR.data?.gegevens ?? {}) as { winkel_naam?: string; winkel_adres?: string; mentor?: string; ondertekenaar?: string; winkel_email?: string };
  const p = pR.data as { naam?: string; straat?: string; postcode?: string; gemeente?: string } | null;
  const adresAanvraag = [a.bedrijf?.straat, [a.bedrijf?.postcode, a.bedrijf?.gemeente].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const adresPlaats = p ? [p.straat, [p.postcode, p.gemeente].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "";
  const g = gR.data as { token: string | null; email: string | null } | null;
  return {
    leerling: lR.data as { voornaam: string; naam: string; klas: string; email: string | null },
    blok: bR.data as AttestGegevens["blok"],
    stage: ((a.bedrijf?.soort as "sales" | "onthaal" | undefined) ?? "") as AttestGegevens["stage"],
    winkel: c.winkel_naam || a.bedrijf?.naam || p?.naam || "",
    adres: c.winkel_adres || adresAanvraag || adresPlaats,
    mentor: c.mentor || a.mentor?.naam || d.mentor_naam || "",
    aanspreking: c.ondertekenaar || c.mentor || a.mentor?.naam || "",
    stagegeverToken: g?.token ?? null,
    stagegeverEmail: (g?.email || a.mentor?.email || d.mentor_email || c.winkel_email || "").toLowerCase() || null,
    team: ((tR.data ?? []) as { naam: string; rol: string }[]).filter((x) => x.rol !== "directie").map((x) => x.naam),
    directeur: SCHOOL_CONTRACT.directeur,
  };
}
