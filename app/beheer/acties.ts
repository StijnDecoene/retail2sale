"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import { leegNaarNull, schooljaarVan, PLAATS_IMPORT_VELDEN, type PlaatsImportRij, type PlaatsImportVeld } from "@/lib/beheer";

export type Resultaat = { ok?: string; fout?: string } | null;

type DbFout = { code?: string; message?: string } | null;

function vertaal(e: DbFout, wat = "Bewaren"): Resultaat {
  if (!e) return null;
  if (e.code === "42501") return { fout: "Je hebt hiervoor geen rechten." };
  if (e.code === "23505") return { fout: "Dit bestaat al." };
  if (e.code === "23514") return { fout: "Een van de velden heeft een ongeldige waarde." };
  if (e.code === "PGRST204" || e.code === "42703") {
    return { fout: "De databank mist nog een kolom. Voer de nieuwste migratie uit in Supabase (SQL Editor)." };
  }
  if (e.code === "PGRST106" || e.message?.includes("schema")) {
    return { fout: "De databank is nog niet klaar: het schema 'stage' is niet zichtbaar via de Data API." };
  }
  return { fout: `${wat} lukte niet. Probeer opnieuw.` };
}

const s = (fd: FormData, k: string) => leegNaarNull(fd.get(k));

// ---------------------------------------------------------------------------
// Leerlingen
// ---------------------------------------------------------------------------
function leerlingVelden(fd: FormData) {
  return {
    voornaam: s(fd, "voornaam") ?? "",
    naam: s(fd, "naam") ?? "",
    klas: (s(fd, "klas") ?? "").toUpperCase(),
    smartschool_gebruikersnaam: s(fd, "smartschool_gebruikersnaam"),
    email: s(fd, "email")?.toLowerCase() ?? null,
    gsm: s(fd, "gsm"),
  };
}

export async function leerlingToevoegen(_: Resultaat, fd: FormData): Promise<Resultaat> {
  const v = leerlingVelden(fd);
  if (!v.voornaam || !v.naam || !v.klas) return { fout: "Vul voornaam, naam en klas in." };
  const sb = await serverClient();
  const { error } = await sb.from("leerlingen").insert({ ...v, schooljaar: s(fd, "schooljaar") ?? schooljaarVan() });
  if (error) return vertaal(error);
  revalidatePath("/beheer", "layout");
  return { ok: `${v.voornaam} ${v.naam} is toegevoegd.` };
}

export async function leerlingBewaren(_: Resultaat, fd: FormData): Promise<Resultaat> {
  const id = String(fd.get("id"));
  const v = leerlingVelden(fd);
  if (!v.voornaam || !v.naam || !v.klas) return { fout: "Vul voornaam, naam en klas in." };
  const status = String(fd.get("status") ?? "actief");
  const sb = await serverClient();
  const { error } = await sb
    .from("leerlingen")
    .update({
      ...v,
      status,
      status_van: status === "actief" ? null : s(fd, "status_van"),
      status_tot: status === "ziek" ? s(fd, "status_tot") : null,
      notities: s(fd, "notities"),
    })
    .eq("id", id);
  if (error) return vertaal(error);
  revalidatePath("/beheer", "layout");
  return { ok: "Bewaard." };
}

export async function leerlingVerwijderen(fd: FormData) {
  const sb = await serverClient();
  await sb.from("leerlingen").delete().eq("id", String(fd.get("id")));
  revalidatePath("/beheer", "layout");
  redirect("/beheer/leerlingen");
}

export async function dossierBewaren(_: Resultaat, fd: FormData): Promise<Resultaat> {
  const sb = await serverClient();
  const rij = {
    leerling_id: String(fd.get("leerling_id")),
    blok_id: String(fd.get("blok_id")),
    stageplaats_id: s(fd, "stageplaats_id"),
    begeleider_id: s(fd, "begeleider_id"),
    mentor_naam: s(fd, "mentor_naam"),
    mentor_telefoon: s(fd, "mentor_telefoon"),
    mentor_email: s(fd, "mentor_email")?.toLowerCase() ?? null,
  };
  const { error } = await sb.from("dossiers").upsert(rij, { onConflict: "leerling_id,blok_id" });
  if (error) return vertaal(error);
  revalidatePath("/beheer", "layout");
  return { ok: "Stagegegevens bewaard." };
}

export type ImportRij = {
  voornaam: string;
  naam: string;
  klas: string;
  smartschool_gebruikersnaam: string | null;
  email: string | null;
};

const sleutel = (x: { voornaam: string; naam: string; klas: string }) =>
  `${x.voornaam} ${x.naam} ${x.klas}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Klaslijst uit Smartschool: nieuwe leerlingen toevoegen, gekende bijwerken (klas, e-mail, gebruikersnaam). */
export async function leerlingenImporteren(
  schooljaar: string,
  rijen: ImportRij[],
): Promise<{ fout?: string; nieuw?: number; bijgewerkt?: number; ongewijzigd?: number }> {
  if (!/^\d{4}-\d{4}$/.test(schooljaar)) return { fout: "Ongeldig schooljaar." };
  const geldig = rijen
    .map((r) => ({
      voornaam: r.voornaam.trim(),
      naam: r.naam.trim(),
      klas: r.klas.trim().toUpperCase(),
      smartschool_gebruikersnaam: r.smartschool_gebruikersnaam?.trim() || null,
      email: r.email?.trim().toLowerCase() || null,
    }))
    .filter((r) => r.voornaam && r.naam && r.klas);
  if (!geldig.length) return { fout: "Er staan geen geldige rijen in de lijst." };
  if (geldig.length > 1000) return { fout: "Maximaal 1000 leerlingen per import." };

  const sb = await serverClient();
  const { data: bestaand, error: leesFout } = await sb
    .from("leerlingen")
    .select("id, voornaam, naam, klas, smartschool_gebruikersnaam, email")
    .eq("schooljaar", schooljaar);
  if (leesFout) return { fout: vertaal(leesFout, "Lezen")?.fout };

  const opGebruiker = new Map<string, (typeof bestaand)[number]>();
  const opMail = new Map<string, (typeof bestaand)[number]>();
  const opNaam = new Map<string, (typeof bestaand)[number]>();
  for (const b of bestaand ?? []) {
    if (b.smartschool_gebruikersnaam) opGebruiker.set(b.smartschool_gebruikersnaam.toLowerCase(), b);
    if (b.email) opMail.set(b.email, b);
    opNaam.set(sleutel(b), b);
  }

  const nieuw: (ImportRij & { schooljaar: string })[] = [];
  let bijgewerkt = 0;
  let ongewijzigd = 0;
  for (const r of geldig) {
    const b =
      (r.smartschool_gebruikersnaam && opGebruiker.get(r.smartschool_gebruikersnaam.toLowerCase())) ||
      (r.email && opMail.get(r.email)) ||
      opNaam.get(sleutel(r));
    if (!b) {
      nieuw.push({ ...r, schooljaar });
      continue;
    }
    const wijziging: Partial<ImportRij> = {};
    if (r.klas !== b.klas) wijziging.klas = r.klas;
    if (r.email && r.email !== b.email) wijziging.email = r.email;
    if (r.smartschool_gebruikersnaam && r.smartschool_gebruikersnaam !== b.smartschool_gebruikersnaam)
      wijziging.smartschool_gebruikersnaam = r.smartschool_gebruikersnaam;
    if (Object.keys(wijziging).length) {
      const { error } = await sb.from("leerlingen").update(wijziging).eq("id", b.id);
      if (error) return { fout: vertaal(error)?.fout };
      bijgewerkt++;
    } else ongewijzigd++;
  }
  if (nieuw.length) {
    const { error } = await sb.from("leerlingen").insert(nieuw);
    if (error) return { fout: vertaal(error, "Importeren")?.fout };
  }
  revalidatePath("/beheer", "layout");
  return { nieuw: nieuw.length, bijgewerkt, ongewijzigd };
}

export type KoppelRij = {
  leerling_id: string;
  stageplaats_id: string;
  begeleider_id: string;
  mentor_naam: string;
  mentor_telefoon: string;
  mentor_email: string;
  gsm: string;
};

/**
 * Stageplaats, mentor en begeleider per leerling in het dossier van één blokstage zetten (bv. uit een stagelijst).
 * Enkel lege velden worden ingevuld. Heeft het dossier al een andere stageplaats, dan blijft die staan (met melding)
 * en worden ook de mentorgegevens niet overgenomen; de begeleider wordt wel aangevuld als die nog leeg is.
 * Ook de gsm van de leerling wordt aangevuld als die nog leeg is.
 */
export async function dossiersKoppelen(
  blokId: string,
  rijen: KoppelRij[],
): Promise<{ fout?: string; gekoppeld?: number; aangevuld?: number; ongewijzigd?: number; anders?: string[] }> {
  if (!rijen.length) return { fout: "Er zijn geen leerlingen om te koppelen." };
  if (rijen.length > 1000) return { fout: "Maximaal 1000 rijen per keer." };
  const sb = await serverClient();

  const ids = [...new Set(rijen.map((r) => r.leerling_id))];
  const [bR, dR, lR, pR, gR] = await Promise.all([
    sb.from("blokken").select("id").eq("id", blokId).maybeSingle(),
    sb.from("dossiers").select("*").eq("blok_id", blokId).in("leerling_id", ids),
    sb.from("leerlingen").select("id, voornaam, naam, gsm").in("id", ids),
    sb.from("stageplaatsen").select("id, naam"),
    sb.from("begeleiders").select("id"),
  ]);
  const leesFout = bR.error ?? dR.error ?? lR.error ?? pR.error ?? gR.error;
  if (leesFout) return { fout: vertaal(leesFout, "Lezen")?.fout };
  if (!bR.data) return { fout: "Deze blokstage bestaat niet." };

  const dossiers = new Map((dR.data ?? []).map((d) => [d.leerling_id as string, d]));
  const leerlingen = new Map((lR.data ?? []).map((l) => [l.id as string, l]));
  const plaatsen = new Map((pR.data ?? []).map((p) => [p.id as string, p.naam as string]));
  const begeleiders = new Set((gR.data ?? []).map((g) => g.id as string));

  let gekoppeld = 0, aangevuld = 0, ongewijzigd = 0;
  const anders: string[] = [];
  for (const r of rijen) {
    const l = leerlingen.get(r.leerling_id);
    const plaats = plaatsen.has(r.stageplaats_id) ? r.stageplaats_id : null;
    const begeleider = begeleiders.has(r.begeleider_id) ? r.begeleider_id : null;
    if (!l || (!plaats && !begeleider)) continue;
    const d = dossiers.get(r.leerling_id);
    const mentor = {
      mentor_naam: r.mentor_naam.trim() || null,
      mentor_telefoon: r.mentor_telefoon.trim() || null,
      mentor_email: r.mentor_email.trim().toLowerCase() || null,
    };

    if (!d) {
      const { error } = await sb.from("dossiers").insert({
        leerling_id: r.leerling_id, blok_id: blokId, stageplaats_id: plaats, begeleider_id: begeleider, ...(plaats ? mentor : {}),
      });
      if (error) return { fout: vertaal(error)?.fout };
      if (plaats) gekoppeld++; else aangevuld++;
    } else {
      const w: Record<string, string | null> = {};
      const anderePlaats = !!(plaats && d.stageplaats_id && d.stageplaats_id !== plaats);
      if (anderePlaats) anders.push(`${l.voornaam} ${l.naam}: staat al bij ${plaatsen.get(d.stageplaats_id) ?? "een andere stageplaats"}`);
      if (plaats && !d.stageplaats_id) w.stageplaats_id = plaats;
      if (plaats && !anderePlaats) for (const [k, v] of Object.entries(mentor)) if (v && !d[k]) w[k] = v;
      if (begeleider && !d.begeleider_id) w.begeleider_id = begeleider;
      if (Object.keys(w).length) {
        const { error } = await sb.from("dossiers").update(w).eq("id", d.id);
        if (error) return { fout: vertaal(error)?.fout };
        if (w.stageplaats_id) gekoppeld++; else aangevuld++;
      } else if (!anderePlaats) ongewijzigd++;
    }
    if (r.gsm.trim() && !l.gsm) {
      await sb.from("leerlingen").update({ gsm: r.gsm.trim() }).eq("id", l.id);
    }
  }
  revalidatePath("/beheer", "layout");
  return { gekoppeld, aangevuld, ongewijzigd, anders };
}

// ---------------------------------------------------------------------------
// Stageplaatsen
// ---------------------------------------------------------------------------
function plaatsVelden(fd: FormData) {
  const max = Number(fd.get("max_stagiairs") ?? 1);
  const score = Number(fd.get("beoordeling") ?? 0);
  return {
    naam: s(fd, "naam") ?? "",
    juridische_naam: s(fd, "juridische_naam"),
    kbo: s(fd, "kbo"),
    sector: s(fd, "sector"),
    status: String(fd.get("status") ?? "actief"),
    straat: s(fd, "straat"),
    postcode: s(fd, "postcode"),
    gemeente: s(fd, "gemeente"),
    telefoon: s(fd, "telefoon"),
    email: s(fd, "email")?.toLowerCase() ?? null,
    website: s(fd, "website"),
    contactpersoon: s(fd, "contactpersoon"),
    max_stagiairs: Number.isFinite(max) ? Math.max(0, Math.min(20, Math.round(max))) : 1,
    beoordeling: score >= 1 && score <= 5 ? Math.round(score) : null,
    notities: s(fd, "notities"),
  };
}

export async function plaatsToevoegen(_: Resultaat, fd: FormData): Promise<Resultaat> {
  const v = plaatsVelden(fd);
  if (!v.naam) return { fout: "Vul de naam van de stageplaats in." };
  const sb = await serverClient();
  const { data, error } = await sb.from("stageplaatsen").insert(v).select("id").single();
  if (error) return vertaal(error);
  revalidatePath("/beheer", "layout");
  redirect(`/beheer/stageplaatsen/${data.id}?nieuw=1`);
}

export async function plaatsBewaren(_: Resultaat, fd: FormData): Promise<Resultaat> {
  const v = plaatsVelden(fd);
  if (!v.naam) return { fout: "Vul de naam van de stageplaats in." };
  const sb = await serverClient();
  const { error } = await sb.from("stageplaatsen").update(v).eq("id", String(fd.get("id")));
  if (error) return vertaal(error);
  revalidatePath("/beheer", "layout");
  return { ok: "Bewaard." };
}

export async function plaatsVerwijderen(fd: FormData) {
  const sb = await serverClient();
  await sb.from("stageplaatsen").delete().eq("id", String(fd.get("id")));
  revalidatePath("/beheer", "layout");
  redirect("/beheer/stageplaatsen");
}

const plaatsSleutel = (naam: string, gemeente: string | null) =>
  `${naam} | ${gemeente ?? ""}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9|]+/g, " ").trim();
const kboCijfers = (k: string | null) => (k ?? "").replace(/\D/g, "");

/**
 * Stageplaatsen importeren (bv. uit een oud overzicht). Een gekende plaats wordt herkend aan het ondernemingsnummer,
 * anders aan naam en gemeente. Bij een gekende plaats worden enkel lege velden aangevuld: niets wordt overschreven
 * of verwijderd. Dubbele rijen in het bestand worden samengevoegd.
 */
export async function stageplaatsenImporteren(
  rijen: PlaatsImportRij[],
): Promise<{ fout?: string; nieuw?: number; aangevuld?: number; ongewijzigd?: number }> {
  const schoon = rijen
    .map((r) => {
      const o = {} as Record<PlaatsImportVeld, string | null>;
      for (const k of PLAATS_IMPORT_VELDEN) o[k] = String(r[k] ?? "").trim() || null;
      if (o.email) o.email = o.email.toLowerCase();
      return o;
    })
    .filter((r) => r.naam);
  if (!schoon.length) return { fout: "Er staan geen rijen met een naam in de lijst." };
  if (schoon.length > 2000) return { fout: "Maximaal 2000 stageplaatsen per import." };

  const sb = await serverClient();
  const { data: bestaand, error: leesFout } = await sb.from("stageplaatsen").select("*");
  if (leesFout) return { fout: vertaal(leesFout, "Lezen")?.fout };

  type Rij = Record<string, unknown> & { id?: string };
  const opKbo = new Map<string, Rij>();
  const opNaam = new Map<string, Rij>();
  const zonderGemeente = new Map<string, Rij[]>();
  const onthoud = (p: Rij) => {
    const k = kboCijfers(p.kbo as string | null);
    if (k.length >= 9) opKbo.set(k, p);
    opNaam.set(plaatsSleutel(p.naam as string, p.gemeente as string | null), p);
    const n = plaatsSleutel(p.naam as string, null);
    zonderGemeente.set(n, [...(zonderGemeente.get(n) ?? []), p]);
  };
  (bestaand ?? []).forEach((p) => onthoud({ ...p }));

  const nieuw: Rij[] = [];
  const aanTeVullen = new Map<string, { origineel: Rij; wijziging: Rij }>();
  let ongewijzigd = 0;

  for (const r of schoon) {
    const k = kboCijfers(r.kbo);
    let p =
      (k.length >= 9 && opKbo.get(k)) ||
      opNaam.get(plaatsSleutel(r.naam!, r.gemeente)) ||
      // Gemeente ontbreekt aan één kant: enkel op naam koppelen als die naam maar één keer voorkomt.
      (() => {
        const zelfde = zonderGemeente.get(plaatsSleutel(r.naam!, null)) ?? [];
        return zelfde.length === 1 && (!r.gemeente || !zelfde[0].gemeente) ? zelfde[0] : undefined;
      })();

    if (!p) {
      const rij: Rij = { ...r, status: "actief" };
      nieuw.push(rij);
      onthoud(rij); // volgende dubbele rijen in het bestand vullen deze aan
      continue;
    }
    let veranderd = false;
    for (const veld of PLAATS_IMPORT_VELDEN) {
      if (veld === "naam" || !r[veld]) continue;
      const huidig = p[veld];
      if (huidig !== null && huidig !== undefined && String(huidig).trim() !== "") continue;
      p[veld] = r[veld];
      veranderd = true;
      if (p.id) {
        const a = aanTeVullen.get(p.id) ?? { origineel: p, wijziging: {} };
        a.wijziging[veld] = r[veld];
        aanTeVullen.set(p.id, a);
      }
    }
    if (!veranderd && p.id && !aanTeVullen.has(p.id)) ongewijzigd++;
  }

  for (const [id, { wijziging }] of aanTeVullen) {
    const { error } = await sb.from("stageplaatsen").update(wijziging).eq("id", id);
    if (error) return { fout: vertaal(error)?.fout };
  }
  if (nieuw.length) {
    const { error } = await sb.from("stageplaatsen").insert(nieuw);
    if (error) return { fout: vertaal(error, "Importeren")?.fout };
  }
  revalidatePath("/beheer", "layout");
  return { nieuw: nieuw.length, aangevuld: aanTeVullen.size, ongewijzigd };
}

// ---------------------------------------------------------------------------
// Vragen
// ---------------------------------------------------------------------------
export async function vraagBijwerken(fd: FormData) {
  const sb = await serverClient("public");
  const { begeleider } = await huidigeGebruiker();
  const status = String(fd.get("status"));
  await sb
    .from("vragen")
    .update({
      status,
      notitie: leegNaarNull(fd.get("notitie")),
      behandeld_door: status === "nieuw" ? null : begeleider?.naam ?? null,
    })
    .eq("id", String(fd.get("id")));
  revalidatePath("/beheer", "layout");
}

// ---------------------------------------------------------------------------
// Instellingen
// ---------------------------------------------------------------------------
export async function blokBewaren(_: Resultaat, fd: FormData): Promise<Resultaat> {
  const start = s(fd, "start_datum");
  const eind = s(fd, "eind_datum");
  if (!start || !eind) return { fout: "Vul begin- en einddatum in." };
  if (eind < start) return { fout: "De einddatum ligt vóór de begindatum." };
  // Klassen die meedoen: alle aangevinkt = null (ook klassen die later bijkomen doen dan mee).
  const aangeboden = fd.getAll("klassen_aangeboden").map(String);
  const gekozen = fd.getAll("klassen").map(String).filter((k) => aangeboden.includes(k));
  if (aangeboden.length && !gekozen.length) return { fout: "Vink minstens één klas aan die meedoet." };
  const klassen = !aangeboden.length || gekozen.length === aangeboden.length ? null : gekozen;
  const sb = await serverClient();
  const { error } = await sb
    .from("blokken")
    .update({
      klassen,
      naam: s(fd, "naam") ?? "Blokstage",
      start_datum: start,
      eind_datum: eind,
      uren: Number(fd.get("uren")) || 120,
      uren_per_week: Number(fd.get("uren_per_week")) || 24,
      deadline_top3: s(fd, "deadline_top3"),
    })
    .eq("id", String(fd.get("id")));
  if (error) return vertaal(error);
  revalidatePath("/beheer", "layout");
  return { ok: "Bewaard." };
}

export async function uitzonderingToevoegen(_: Resultaat, fd: FormData): Promise<Resultaat> {
  const van = s(fd, "van");
  const tot = s(fd, "tot") ?? van;
  const naam = s(fd, "naam");
  if (!van || !naam) return { fout: "Vul een datum en een omschrijving in." };
  if (tot && tot < van) return { fout: "De einddatum ligt vóór de begindatum." };
  const sb = await serverClient();
  const { error } = await sb
    .from("uitzonderingen")
    .insert({ blok_id: String(fd.get("blok_id")), van, tot, naam, soort: String(fd.get("soort") ?? "vakantie") });
  if (error) return vertaal(error);
  revalidatePath("/beheer/instellingen");
  return { ok: "Toegevoegd." };
}

export async function uitzonderingVerwijderen(fd: FormData) {
  const sb = await serverClient();
  await sb.from("uitzonderingen").delete().eq("id", String(fd.get("id")));
  revalidatePath("/beheer/instellingen");
}

export async function begeleiderToevoegen(_: Resultaat, fd: FormData): Promise<Resultaat> {
  const email = s(fd, "email")?.toLowerCase();
  const naam = s(fd, "naam");
  if (!email || !naam) return { fout: "Vul naam en e-mailadres in." };
  const sb = await serverClient();
  const { error } = await sb
    .from("begeleiders")
    .insert({ email, naam, rol: String(fd.get("rol") ?? "begeleider"), telefoon: s(fd, "telefoon") });
  if (error) return vertaal(error);
  revalidatePath("/beheer/instellingen");
  return { ok: `${naam} kan nu inloggen met ${email}.` };
}

export async function begeleiderActiefZetten(fd: FormData) {
  const sb = await serverClient();
  await sb
    .from("begeleiders")
    .update({ actief: fd.get("actief") === "true" })
    .eq("id", String(fd.get("id")));
  revalidatePath("/beheer/instellingen");
}

