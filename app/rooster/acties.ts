"use server";

import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase/server";
import { laadRooster, type Sleutel } from "@/lib/werkrooster-server";
import { controle, indienFouten, naarMin, totaalMin, type Dagen } from "@/lib/werkrooster";
import { roosterIngediendMailen } from "@/lib/werkrooster-mails";

export type RoosterResultaat = { ok?: string; fout?: string } | null;
type Actie = "bewaren" | "indienen" | "intrekken" | "aanpassen" | "annuleren";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
function schoon(dagen: Dagen): Dagen {
  const uit: Dagen = {};
  for (const [k, d] of Object.entries(dagen ?? {}).slice(0, 120)) {
    if (!ISO.test(k) || !d) continue;
    const aan = naarMin(d.aan) !== null ? d.aan : "", ver = naarMin(d.ver) !== null ? d.ver : "";
    uit[k] = { aan, ver, pau: Math.min(240, Math.max(0, Math.round(Number(d.pau) || 0))) };
  }
  return uit;
}

const FOUT: Record<string, string> = {
  onbekend: "Dit rooster kan je niet (meer) openen. Vraag een nieuwe link aan de stagebegeleiding.",
  vergrendeld: "Het rooster is ingediend of goedgekeurd en kan nu niet gewijzigd worden.",
  naam: "Vul de naam van de stagegever in.",
  niet_ingediend: "Het rooster is niet (meer) ingediend.",
  niet_goedgekeurd: "Het rooster is nog niet goedgekeurd.",
  geen_wijziging: "Er is geen wijziging om te annuleren.",
};

export async function roosterActie(
  k: Sleutel,
  actie: Actie,
  inhoud?: { dagen: Dagen; opmerkingen: string; naam?: string; vakAkkoord?: boolean },
): Promise<RoosterResultaat> {
  const sb = await serverClient();
  const s = { p_token: k.token ?? null, p_dossier: k.token ? null : (k.dossier ?? null) };
  let res: { data: unknown; error: unknown };
  if (actie === "bewaren" || actie === "indienen") {
    const dagen = schoon(inhoud?.dagen ?? {});
    const opm = String(inhoud?.opmerkingen ?? "").trim().slice(0, 2000);
    if (actie === "indienen") {
      const ctx = await laadRooster(sb, k);
      if (!ctx) return { fout: FOUT.onbekend };
      const c = controle(dagen, ctx.blok, ctx.uitzonderingen, ctx.meerderjarig);
      const f = indienFouten(c);
      if (f.length) return { fout: f.join(" ") };
      if (c.overleg.length && !inhoud?.vakAkkoord) return { fout: "Bevestig dat de stage op vakantie- of feestdagen of op zondag in overleg is afgesproken." };
      const naam = String(inhoud?.naam ?? "").trim().slice(0, 200);
      if (!naam) return { fout: FOUT.naam };
      res = await sb.rpc("rooster_indienen", { ...s, p_dagen: dagen, p_opmerkingen: opm, p_totaal: c.totaal, p_naam: naam, p_vak_akkoord: !!inhoud?.vakAkkoord });
      if (!res.error && res.data === "ok") await roosterIngediendMailen(ctx, naam, !!ctx.rooster?.vorige).catch(() => null);
    } else {
      res = await sb.rpc("rooster_bewaren", { ...s, p_dagen: dagen, p_opmerkingen: opm, p_totaal: totaalMin(dagen) });
    }
  } else {
    res = await sb.rpc(`rooster_${actie}`, s);
  }
  if (res.error) return { fout: "Bewaren lukte niet. Probeer opnieuw." };
  if (res.data !== "ok") return { fout: FOUT[String(res.data)] ?? "Dat lukte niet." };
  revalidatePath("/portaal");
  if (k.token) revalidatePath(`/rooster/${k.token}`);
  if (k.dossier) revalidatePath(`/beheer/dossiers/${k.dossier}`);
  return {
    ok: {
      bewaren: "Bewaard.",
      indienen: "Ingediend. De stagebegeleiding kijkt het rooster na.",
      intrekken: "De indiening is ingetrokken. Je kan het rooster weer aanpassen.",
      aanpassen: "Je kan het rooster nu aanpassen. Het goedgekeurde rooster blijft gelden tot de wijziging is goedgekeurd.",
      annuleren: "De wijziging is geannuleerd. Het goedgekeurde rooster geldt opnieuw.",
    }[actie],
  };
}
