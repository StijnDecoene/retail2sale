import "server-only";
import type { serverClient } from "@/lib/supabase/server";
import { doetMee, vandaagIso, type Blok, type Dossier, type Leerling } from "@/lib/beheer";
import { geldendRooster, type RoosterRij } from "@/lib/werkrooster";
import { VERTREK_STANDAARD, type Beschikbaarheid, type Bezoek, type BezoekData, type BLln, type Instellingen, type Route } from "@/lib/bezoeken";

type Sb = Awaited<ReturnType<typeof serverClient>>;

/** Alles voor de module Stagebezoeken van één blokstage. */
export async function laadBezoeken(sb: Sb, blok: Blok): Promise<BezoekData & { fout?: string }> {
  const [dR, insR, beR, rR, gR] = await Promise.all([
    sb.from("dossiers").select("*").eq("blok_id", blok.id),
    sb.from("bezoek_instellingen").select("*").eq("blok_id", blok.id).maybeSingle(),
    sb.from("bezoek_beschikbaarheid").select("*").eq("blok_id", blok.id),
    sb.from("bezoek_routes").select("*").eq("blok_id", blok.id).order("nr"),
    sb.from("begeleiders").select("id, naam, kleur, rol, actief").eq("actief", true).order("naam"),
  ]);
  const dossiers = (dR.data ?? []) as Dossier[];
  const ids = dossiers.map((d) => d.id);
  const lIds = [...new Set(dossiers.map((d) => d.leerling_id))];
  const pIds = [...new Set(dossiers.map((d) => d.stageplaats_id).filter((x): x is string => !!x))];
  const [lR, pR, roR, afR, bzR] = ids.length
    ? await Promise.all([
        sb.from("leerlingen").select("*").in("id", lIds),
        pIds.length ? sb.from("stageplaatsen").select("id, naam, straat, postcode, gemeente, telefoon, lat, lng").in("id", pIds) : Promise.resolve({ data: [] }),
        sb.from("roosters").select("dossier_id, dagen, status, vorige, opmerkingen").in("dossier_id", ids),
        sb.from("afwezigheden").select("dossier_id, datum").in("dossier_id", ids),
        sb.from("bezoeken").select("*").in("dossier_id", ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const leerlingen = new Map(((lR.data ?? []) as Leerling[]).map((l) => [l.id, l]));
  const plaatsen = new Map(((pR.data ?? []) as NonNullable<BLln["plaats"]>[]).map((p) => [p.id, p]));
  const roosters = new Map(((roR.data ?? []) as (Pick<RoosterRij, "dossier_id" | "dagen" | "status" | "vorige" | "opmerkingen">)[]).map((r) => [r.dossier_id, r]));
  const afw = new Map<string, string[]>();
  for (const a of (afR.data ?? []) as { dossier_id: string; datum: string }[]) afw.set(a.dossier_id, [...(afw.get(a.dossier_id) ?? []), a.datum]);
  const bezoeken = new Map(((bzR.data ?? []) as Bezoek[]).map((b) => [b.dossier_id, b]));

  const lijst: BLln[] = [];
  for (const d of dossiers) {
    const l = leerlingen.get(d.leerling_id);
    if (!l || !["actief", "ziek"].includes(l.status) || !doetMee(blok, l.klas)) continue;
    const ro = roosters.get(d.id);
    const dagen = ro ? geldendRooster(ro as RoosterRij) : null;
    lijst.push({
      dossier_id: d.id, leerling_id: l.id, voornaam: l.voornaam, naam: l.naam, klas: l.klas, status: l.status,
      status_van: l.status_van ?? null, status_tot: l.status_tot ?? null, email: l.email ?? null, gsm: l.gsm ?? null,
      plaats: d.stageplaats_id ? plaatsen.get(d.stageplaats_id) ?? null : null,
      mentor: { naam: d.mentor_naam ?? null, tel: d.mentor_telefoon ?? null, email: d.mentor_email ?? null },
      rooster: dagen && Object.keys(dagen).length ? dagen : null,
      roosterBron: !dagen ? null : ro?.opmerkingen?.startsWith("Overgenomen uit de mail") ? "mail" : "platform",
      afwezig: afw.get(d.id) ?? [],
      bezoek: bezoeken.get(d.id) ?? null,
    });
  }
  lijst.sort((a, b) => a.klas.localeCompare(b.klas) || a.naam.localeCompare(b.naam) || a.voornaam.localeCompare(b.voornaam));

  const ins = insR.data as Partial<Instellingen> | null;
  const instellingen: Instellingen = {
    blok_id: blok.id,
    start_datum: ins?.start_datum ?? blok.start_datum,
    eind_datum: ins?.eind_datum ?? blok.eind_datum,
    vertrek: { ...VERTREK_STANDAARD, ...(ins?.vertrek ?? {}) },
    max_per_route: ins?.max_per_route ?? 8,
    geblokkeerd: ins?.geblokkeerd ?? {},
  };
  const begeleiders = ((gR.data ?? []) as { id: string; naam: string; kleur: string | null; rol: string }[]).filter((g) => g.rol !== "directie").map(({ id, naam, kleur }) => ({ id, naam, kleur }));
  return {
    blok: { id: blok.id, naam: blok.naam, start_datum: blok.start_datum, eind_datum: blok.eind_datum },
    instellingen,
    beschikbaarheid: ((beR.data ?? []) as Beschikbaarheid[]).map((b) => ({ ...b, overslaan: b.overslaan ?? [] })),
    routes: ((rR.data ?? []) as Route[]).map((r) => ({ ...r, volgorde: r.volgorde ?? [] })),
    leerlingen: lijst,
    begeleiders,
    vandaag: vandaagIso(),
    fout: rR.error ? "De databank mist nog de tabellen voor de stagebezoeken. Voer de migratie 20261029090000_bezoeken.sql uit." : undefined,
  };
}
