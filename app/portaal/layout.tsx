import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { huidigeGebruiker } from "@/lib/supabase/server";

export const metadata: Metadata = { title: { default: "Mijn stage", template: "%s | Retail2Sale" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PortaalLayout({ children }: { children: React.ReactNode }) {
  const { user } = await huidigeGebruiker();
  if (!user) redirect("/inloggen?rol=stagiair");
  return (
    <div className="pt">
      <header className="pt-balk">
        <Link href="/" className="pt-logos" aria-label="Naar de publieke site">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-spes-nostra.png" alt="Spes Nostra Heule" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-retail2sale.png" alt="Retail2Sale" />
        </Link>
        <b className="pt-merk">Mijn stage</b>
        <form action="/auth/uitloggen" method="post" className="pt-uit">
          <button type="submit" className="btn btn-line">Uitloggen</button>
        </form>
      </header>
      <main className="pt-main">{children}</main>
    </div>
  );
}
