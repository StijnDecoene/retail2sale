import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Zijbalk from "@/components/beheer/Zijbalk";
import { huidigeGebruiker, serverClient } from "@/lib/supabase/server";
import { schooljaarVan } from "@/lib/beheer";
import { teBeoordelen } from "@/lib/dossiers-server";
import { nieuweMeldingen } from "@/lib/meldingen-server";
import MeldBalk from "@/components/beheer/MeldBalk";

export const metadata: Metadata = { title: { default: "Beheer", template: "%s | Beheer Retail2Sale" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function BeheerLayout({ children }: { children: React.ReactNode }) {
  const { user, begeleider } = await huidigeGebruiker();
  if (!user) redirect("/inloggen?rol=school");

  if (!begeleider) {
    return (
      <main className="bh-geen-toegang">
        <div>
          <span className="eyebrow">Beheer Retail2Sale</span>
          <h1>Geen toegang</h1>
          <p>
            Je bent ingelogd als <b>{user.email}</b>, maar dat adres staat niet op de lijst van begeleiders. Vraag de
            stagebegeleiding om je toe te voegen.
          </p>
          <p className="klein">
            Zie je deze melding terwijl je wél op de lijst staat? Dan is de databank nog niet volledig ingesteld (schema
            &lsquo;stage&rsquo;).
          </p>
          <form action="/auth/uitloggen" method="post">
            <button className="btn btn-line" type="submit">Uitloggen</button>
          </form>
        </div>
      </main>
    );
  }

  const sbPub = await serverClient("public");
  const sb = await serverClient();
  const [{ count: nieuweVragen }, { count: leerlingen }, nakijken, meld] = await Promise.all([
    sbPub.from("vragen").select("id", { count: "exact", head: true }).eq("status", "nieuw"),
    sb.from("leerlingen").select("id", { count: "exact", head: true }).eq("schooljaar", schooljaarVan()),
    teBeoordelen(sb),
    nieuweMeldingen(sb, begeleider.id),
  ]);

  return (
    <div className="bh">
      <aside className="bh-zij">
        <Link href="/" className="bh-logos" aria-label="Naar de publieke site">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-spes-nostra.png" alt="Spes Nostra Heule" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-retail2sale.png" alt="Retail2Sale" />
        </Link>
        <div className="bh-merk">
          <b>Stagebeheer</b>
          <span>Onthaal, organisatie en sales</span>
        </div>
        <Zijbalk tellers={{ "/beheer/vragen": nieuweVragen ?? 0, "/beheer/leerlingen": leerlingen ?? 0, "/beheer/dossiers": nakijken.totaal, "/beheer/afwezigheden": nakijken.afwezig + nakijken.losInhaal, "/beheer/meldingen": meld.totaal }} />
        <div className="bh-wie">
          <span className="av" style={{ background: begeleider.kleur ?? "#1D5BAA" }} aria-hidden="true">
            {begeleider.naam.split(" ").map((d) => d[0]).join("").slice(0, 2)}
          </span>
          <span className="t">
            <b>{begeleider.naam}</b>
            <small>{begeleider.rol === "begeleider" ? "Stagebegeleider" : begeleider.rol === "beheerder" ? "Beheerder" : "Directie"}</small>
          </span>
          <form action="/auth/uitloggen" method="post">
            <button type="submit" className="bh-uit">Uitloggen</button>
          </form>
        </div>
      </aside>
      <main className="bh-main">
        <MeldBalk totaal={meld.totaal} perSoort={meld.perSoort} />
        {children}
      </main>
    </div>
  );
}
