import { serverClient } from "@/lib/supabase/server";
import { schooljaarVan, vandaagIso, type Blok } from "@/lib/beheer";
import { laadBezoeken } from "@/lib/bezoeken-server";
import BezoekenApp from "@/components/bezoeken/BezoekenApp";

export const metadata = { title: "Stagebezoeken" };
const TABS = ["routes", "leerlingen", "kalender", "instellingen"] as const;

export default async function Bezoeken({ searchParams }: { searchParams: Promise<{ blok?: string; tab?: string }> }) {
  const { blok: blokId, tab } = await searchParams;
  const sb = await serverClient();
  const vandaag = vandaagIso();
  const { data } = await sb.from("blokken").select("*").eq("schooljaar", schooljaarVan()).order("start_datum");
  const blokken = (data ?? []) as Blok[];
  const blok = blokken.find((b) => b.id === blokId) ?? blokken.find((b) => b.eind_datum >= vandaag) ?? blokken.at(-1);
  if (!blok) return <p className="bh-leeg">Er is nog geen blokstage. Voeg ze toe bij Instellingen.</p>;
  const d = await laadBezoeken(sb, blok);
  return (
    <>
      {d.fout && <p className="bh-melding">{d.fout}</p>}
      <BezoekenApp d={d} tab={(TABS as readonly string[]).includes(tab ?? "") ? (tab as (typeof TABS)[number]) : "routes"} blokken={blokken.map((b) => ({ id: b.id, naam: b.naam }))} />
    </>
  );
}
