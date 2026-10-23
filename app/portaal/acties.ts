"use server";

import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase/server";
import { aanvraagFouten, top3Fouten, type AanvraagGegevens, type Keuze, type Profiel } from "@/lib/portaal";

export type PortaalResultaat = { ok?: string; fout?: string; velden?: Record<string, string> } | null;

type DbFout = { code?: string; message?: string } | null;
function vertaal(e: DbFout): PortaalResultaat {
  if (!e) return null;
  if (e.code === "42501" || e.message?.includes("row-level security")) {
    return { fout: "Dit kan je nu niet meer wijzigen. Is het al ingediend of goedgekeurd? Vraag het aan de stagebegeleiding." };
  }
  return { fout: "Bewaren lukte niet. Probeer opnieuw." };
}

const tekst = (v: unknown, max = 2000) => String(v ?? "").trim().slice(0, max);
const nu = () => new Date().toISOString();

function schoonProfiel(p: Profiel): Profiel {
  return {
    gsm: tekst(p.gsm, 40), straat: tekst(p.straat, 200), postcode: tekst(p.postcode, 10), gemeente: tekst(p.gemeente, 100),
    ouder_naam: tekst(p.ouder_naam, 200), ouder_gsm: tekst(p.ouder_gsm, 40), ouder_email: tekst(p.ouder_email, 200).toLowerCase(),
    rijbewijs: tekst(p.rijbewijs, 40), talen: tekst(p.talen, 200), aandacht: tekst(p.aandacht, 2000), toestemming: !!p.toestemming,
  };
}
function schoonKeuze(k: Keuze): Keuze {
  return {
    type: k.type === "onthaal" ? "onthaal" : k.type === "sales" ? "sales" : "",
    branche: tekst(k.branche, 100), winkel: tekst(k.winkel, 200), adres: tekst(k.adres, 200), postcode: tekst(k.postcode, 10),
    gemeente: tekst(k.gemeente, 100), web: tekst(k.web, 300), contact: tekst(k.contact, 200), vervoer: tekst(k.vervoer, 60),
    motivatie: tekst(k.motivatie, 2000),
  };
}

/** Top 3 bewaren als concept, of indienen (dan eerst alles controleren). Het profiel wordt mee bewaard. */
export async function top3Bewaren(
  dossierId: string,
  leerlingId: string,
  profiel: Profiel,
  keuzes: Keuze[],
  indienen: boolean,
): Promise<PortaalResultaat> {
  const p = schoonProfiel(profiel);
  const k = [0, 1, 2].map((i) => schoonKeuze(keuzes[i] ?? {}));
  if (indienen) {
    const velden = top3Fouten(p, k);
    if (Object.keys(velden).length) return { fout: "Nog niet alles is ingevuld. Kijk de rode velden na.", velden };
  }
  const sb = await serverClient();
  const { error: pFout } = await sb.from("leerling_profielen").upsert({ leerling_id: leerlingId, gegevens: p });
  if (pFout) return vertaal(pFout);
  const { error } = await sb
    .from("top3")
    .upsert({ dossier_id: dossierId, keuzes: k, status: indienen ? "ingediend" : "concept", ...(indienen ? { ingediend_op: nu() } : {}) });
  if (error) return vertaal(error);
  revalidatePath("/portaal");
  revalidatePath("/beheer", "layout");
  return { ok: indienen ? "Je top 3 is ingediend. Je krijgt bericht zodra de stagebegeleiding hem bekeken heeft." : "Bewaard als concept." };
}

function schoonAanvraag(g: AanvraagGegevens): AanvraagGegevens {
  const s = g.stagiair ?? {}, b = g.bedrijf ?? {}, m = g.mentor ?? {}, v = g.verantwoordelijke ?? {}, w = g.werkvloer ?? {}, a = g.akkoord ?? {};
  return {
    stagiair: { geboortedatum: tekst(s.geboortedatum, 10), gsm: tekst(s.gsm, 40), nood_naam: tekst(s.nood_naam, 200), nood_tel: tekst(s.nood_tel, 40) },
    bedrijf: {
      naam: tekst(b.naam, 200), juridisch: tekst(b.juridisch, 200), kbo: tekst(b.kbo, 30), sector: tekst(b.sector, 100), straat: tekst(b.straat, 200),
      postcode: tekst(b.postcode, 10), gemeente: tekst(b.gemeente, 100), tel: tekst(b.tel, 40), web: tekst(b.web, 300),
      soort: b.soort === "onthaal" ? "onthaal" : b.soort === "sales" ? "sales" : "",
    },
    mentor: { naam: tekst(m.naam, 200), functie: tekst(m.functie, 100), email: tekst(m.email, 200).toLowerCase(), tel: tekst(m.tel, 40) },
    verantwoordelijke: v.zelfde === false
      ? { zelfde: false, naam: tekst(v.naam, 200), functie: tekst(v.functie, 100), email: tekst(v.email, 200).toLowerCase(), tel: tekst(v.tel, 40) }
      : { zelfde: true },
    werkvloer: { taken: tekst(w.taken, 2000), kledij: (w.kledij ?? []).map((x) => tekst(x, 30)).slice(0, 10), startuur: tekst(w.startuur, 5), melden: tekst(w.melden, 200) },
    akkoord: { uren: !!a.uren, maandag: !!a.maandag, familie: !!a.familie },
  };
}

/** Aanvraag bewaren als concept, of indienen. */
export async function aanvraagBewaren(
  dossierId: string,
  keuzeNr: number | null,
  gegevens: AanvraagGegevens,
  startBlok: string,
  indienen: boolean,
): Promise<PortaalResultaat> {
  const g = schoonAanvraag(gegevens);
  if (indienen) {
    const velden = aanvraagFouten(g, String(startBlok).slice(0, 10));
    if (!keuzeNr) velden["keuze_nr"] = "Kies de stageplaats.";
    if (Object.keys(velden).length) return { fout: "Nog niet alles is ingevuld. Kijk de rode velden na.", velden };
  }
  const sb = await serverClient();
  const { error } = await sb.from("aanvragen").upsert({
    dossier_id: dossierId,
    keuze_nr: keuzeNr && keuzeNr >= 1 && keuzeNr <= 3 ? keuzeNr : null,
    gegevens: g,
    status: indienen ? "ingediend" : "concept",
    ...(indienen ? { ingediend_op: nu() } : {}),
  });
  if (error) return vertaal(error);
  revalidatePath("/portaal");
  revalidatePath("/beheer", "layout");
  return { ok: indienen ? "Je aanvraag is ingediend. De stagebegeleiding kijkt ze na." : "Bewaard als concept." };
}
