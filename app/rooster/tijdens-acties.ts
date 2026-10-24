"use server";

import { revalidatePath } from "next/cache";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import { laadRooster, type Sleutel } from "@/lib/werkrooster-server";
import { laadTijdens } from "@/lib/tijdens-server";
import { gemistUitRooster, inhaalControle, inhaalTermijn, stand, REDENEN } from "@/lib/tijdens";
import { geldendRooster, naarMin } from "@/lib/werkrooster";
import { vandaagIso } from "@/lib/beheer";
import { afwezigheidMailen } from "@/lib/werkrooster-mails";

export type TijdensResultaat = { ok?: string; fout?: string; vraag?: string } | null;

const FOUT: Record<string, string> = {
  onbekend: "Dit kan je niet (meer) openen. Vraag een nieuwe link aan de stagebegeleiding.",
  dubbel: "Voor die dag is er al een afwezigheid gemeld.",
  reden: "Kies een reden.",
  beoordeeld: "De school heeft deze afwezigheid al beoordeeld. Vraag het aan de stagebegeleiding.",
  ingehaald: "Er is al een bevestigde inhaalstage aan gekoppeld.",
  koppeling: "De gekozen afwezigheid hoort niet bij dit dossier.",
  geen_rechten: "Enkel de stagegever bevestigt een inhaalstage.",
  naam: "Vul je naam in.",
  niet_mogelijk: "Dat kan niet (meer): is de inhaalstage al bevestigd of geannuleerd, of ligt ze nog in de toekomst?",
};
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const tekst = (v: unknown, max = 1000) => String(v ?? "").trim().slice(0, max);
const tijd = (v: unknown) => (naarMin(String(v ?? "")) !== null ? String(v) : "");

function herlaad(k: Sleutel) {
  revalidatePath("/portaal");
  if (k.token) revalidatePath(`/rooster/${k.token}`);
  if (k.dossier) revalidatePath(`/beheer/dossiers/${k.dossier}`);
  revalidatePath("/beheer/dossiers");
}
const sleutel = (k: Sleutel) => ({ p_token: k.token ?? null, p_dossier: k.token ? null : (k.dossier ?? null) });
async function antwoord(k: Sleutel, p: PromiseLike<{ data: unknown; error: unknown }>, ok: string): Promise<TijdensResultaat> {
  const { data, error } = await p;
  if (error) return { fout: "Bewaren lukte niet. Probeer opnieuw." };
  if (data !== "ok") return { fout: FOUT[String(data)] ?? "Dat lukte niet." };
  herlaad(k);
  return { ok };
}

export async function afwezigheidMelden(
  k: Sleutel,
  x: { datum: string; soort: "hele" | "deel"; aan?: string; ver?: string; gemist_min: number; reden: string; opm?: string; naam: string },
): Promise<TijdensResultaat> {
  const sb = await serverClient();
  const ctx = await laadRooster(sb, k);
  if (!ctx) return { fout: FOUT.onbekend };
  if (!ISO.test(x.datum) || x.datum < ctx.blok.start_datum || x.datum > ctx.blok.eind_datum) return { fout: "Kies een dag van de blokstage." };
  if (!REDENEN.includes(x.reden)) return { fout: FOUT.reden };
  if (!tekst(x.naam)) return { fout: FOUT.naam };
  const soort = x.soort === "deel" ? "deel" : "hele";
  const dag = geldendRooster(ctx.rooster)?.[x.datum];
  const berekend = gemistUitRooster(dag, soort, x.aan, x.ver);
  const gemist = Math.round(Number(x.gemist_min));
  if (!Number.isFinite(gemist) || gemist <= 0 || gemist > 16 * 60) return { fout: "Vul het aantal gemiste uren in." };
  const res = await antwoord(k, sb.rpc("afwezigheid_melden", {
    ...sleutel(k), p_datum: x.datum, p_soort: soort, p_aan: soort === "deel" ? tijd(x.aan) || null : null, p_ver: soort === "deel" ? tijd(x.ver) || null : null,
    p_gemist: gemist, p_gepland: dag ? { ...dag, min: berekend !== null && soort === "hele" ? berekend : gemistUitRooster(dag, "hele") } : null,
    p_auto: berekend === gemist, p_reden: x.reden, p_opm: tekst(x.opm), p_naam: tekst(x.naam, 200),
  }), "Afwezigheid gemeld. De stagebegeleiding is verwittigd.");
  if (res?.ok && ctx.wie !== "school") {
    await afwezigheidMailen(ctx, { ...x, soort, gemist_min: gemist, naam: tekst(x.naam, 200) }, ctx.wie).catch(() => null);
  }
  return res;
}

export async function afwezigheidVerwijderen(k: Sleutel, id: string): Promise<TijdensResultaat> {
  const sb = await serverClient();
  return antwoord(k, sb.rpc("afwezigheid_verwijderen", { ...sleutel(k), p_id: id }), "Melding verwijderd.");
}

export async function inhaalPlannen(
  k: Sleutel,
  x: { datum: string; aan: string; ver: string; pau: number; afw: string[]; opm?: string; naam: string; zeker?: boolean },
): Promise<TijdensResultaat> {
  const sb = await serverClient();
  const [ctx, t] = await Promise.all([laadRooster(sb, k), laadTijdens(sb, k)]);
  if (!ctx || !t) return { fout: FOUT.onbekend };
  if (!tekst(x.naam)) return { fout: FOUT.naam };
  const afw = (x.afw ?? []).filter((id) => t.afwezigheden.some((a) => a.id === id));
  const st = stand(t, ctx.blok, vandaagIso());
  const c = inhaalControle({ ...x, afw }, { blok: ctx.blok, uitz: ctx.uitzonderingen, meerderjarig: ctx.meerderjarig, rooster: geldendRooster(ctx.rooster), inhaal: t.inhaal, st });
  if (c.fouten.length) return { fout: c.fouten.join(" ") };
  if (!afw.length && !x.zeker) return { vraag: "Deze inhaalstage is niet gekoppeld aan een afwezigheid: de uren tellen dan niet mee. Klik nog eens om toch te bewaren, of kies de afwezigheid die je inhaalt." };
  const pau = Math.max(0, Math.min(240, Math.round(Number(x.pau) || 0)));
  const min = naarMin(x.ver)! - naarMin(x.aan)! - pau;
  return antwoord(k, sb.rpc("inhaal_plannen", {
    ...sleutel(k), p_datum: x.datum, p_aan: x.aan, p_ver: x.ver, p_pau: pau, p_min: min, p_afw: afw, p_opm: tekst(x.opm), p_naam: tekst(x.naam, 200),
  }), `Inhaalstage gepland (uiterlijk in te halen tegen ${inhaalTermijn(ctx.blok).split("-").reverse().join("/")}).`);
}

export async function inhaalKoppelen(k: Sleutel, id: string, afw: string[]): Promise<TijdensResultaat> {
  const sb = await serverClient();
  return antwoord(k, sb.rpc("inhaal_koppelen", { ...sleutel(k), p_id: id, p_afw: afw }), "Koppeling bewaard.");
}

export async function inhaalBevestigen(k: Sleutel, id: string, x: { naam: string; aan: string; ver: string; pau: number }): Promise<TijdensResultaat> {
  const a = naarMin(x.aan), v = naarMin(x.ver), pau = Math.max(0, Math.round(Number(x.pau) || 0));
  if (a === null || v === null || v <= a || pau >= v - a) return { fout: "Vul de werkelijke uren correct in." };
  const sb = await serverClient();
  return antwoord(k, sb.rpc("inhaal_bevestigen", { ...sleutel(k), p_id: id, p_naam: tekst(x.naam, 200), p_aan: x.aan, p_ver: x.ver, p_pau: pau, p_min: v - a - pau }), "Bevestigd: de uren tellen als ingehaald.");
}

export async function inhaalAnnuleren(k: Sleutel, id: string, naam: string): Promise<TijdensResultaat> {
  const sb = await serverClient();
  return antwoord(k, sb.rpc("inhaal_annuleren", { ...sleutel(k), p_id: id, p_naam: tekst(naam, 200) }), "Gemarkeerd als niet doorgegaan.");
}

/** School: afwezigheid gewettigd of niet (of terug op "wordt beoordeeld"). */
export async function afwezigheidWettigen(dossierId: string, id: string, waarde: "ja" | "nee" | ""): Promise<TijdensResultaat> {
  const { begeleider } = await huidigeGebruiker();
  if (!begeleider) return { fout: "Je hebt hiervoor geen rechten." };
  const sb = await serverClient();
  const gewettigd = waarde === "ja" ? true : waarde === "nee" ? false : null;
  const { error } = await sb.from("afwezigheden")
    .update({ gewettigd, gewettigd_op: gewettigd === null ? null : new Date().toISOString(), gewettigd_door: gewettigd === null ? null : begeleider.id })
    .eq("id", id).eq("dossier_id", dossierId);
  if (error) return { fout: "Bewaren lukte niet." };
  herlaad({ dossier: dossierId });
  return { ok: gewettigd === null ? "Terug op 'wordt beoordeeld'." : gewettigd ? "Gewettigd: moet niet worden ingehaald." : "Niet gewettigd: moet worden ingehaald." };
}
