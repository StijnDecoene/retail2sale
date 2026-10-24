import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { laadCatalogus } from "@/lib/contract-server";
import ActiviteitenEditor from "@/components/contract/ActiviteitenEditor";

export const metadata = { title: "Activiteitenlijst" };

export default async function ActiviteitenPagina() {
  const sb = await serverClient();
  const { error } = await sb.from("activiteiten").select("id", { count: "exact", head: true });
  const lijst = await laadCatalogus(sb, true);
  return (
    <>
      <p className="bh-kruimel"><Link href="/beheer/instellingen">← Instellingen</Link></p>
      <header className="bh-top">
        <div>
          <h1>Activiteitenlijst</h1>
          <p className="sub">Schooleigen lijst · startvoorstel voor de activiteitenlijst bij elk stagecontract</p>
        </div>
      </header>
      {error && <p className="bh-melding">De databank mist nog de tabel voor de activiteitenlijst. Voer de migratie 20261101090000_activiteitenlijst.sql uit.</p>}
      <p className="bh-melding">
        De activiteitenlijst is een verplicht onderdeel van de stageovereenkomst (omzendbrief SO/2015/01). Bij elk contract krijgt de stagegever
        de activiteiten van zijn soort stage (en &lsquo;voor elke stage&rsquo;) als voorstel. Wat <b>standaard</b> aangevinkt is, staat al aangeduid;
        de stagegever vinkt aan of af, duidt toezicht aan en voegt eigen activiteiten toe. Een wijziging hier verandert geen bestaande contracten.
      </p>
      <ActiviteitenEditor start={lijst} />
    </>
  );
}
