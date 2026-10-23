import Link from "next/link";

export default function Logos({ className = "logos" }: { className?: string }) {
  return (
    <Link href="/" className={className} aria-label="Retail2Sale – Spes Nostra Heule, naar de homepagina">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/logo-spes-nostra.png" alt="Spes Nostra Heule" width={255} height={292} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/logo-retail2sale.png" alt="Retail2Sale – onthaal, organisatie en sales" width={900} height={598} />
    </Link>
  );
}
