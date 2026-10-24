"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MODULES = [
  { href: "/beheer", label: "Overzicht", ic: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/beheer/meldingen", label: "Meldingen", ic: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0" },
  { href: "/beheer/leerlingen", label: "Leerlingen", ic: "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.9.7 3.1 2.5 3.5 5.2" },
  { href: "/beheer/dossiers", label: "Stagedossiers", ic: "M6 3h9l4 4v14H6zM14 3v5h5M9 13l2 2 4-4" },
  { href: "/beheer/afwezigheden", label: "Afwezigheden", ic: "M4 5h16v15H4zM4 9h16M8 3v4M16 3v4M9 13l6 4M15 13l-6 4" },
  { href: "/beheer/bezoeken", label: "Stagebezoeken", ic: "M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
  { href: "/beheer/evaluaties", label: "Evaluaties", ic: "M5 3h14v18H5zM9 8h6M9 12h6M9 16h3" },
  { href: "/beheer/afronding", label: "Afronding", ic: "M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8-4.3-4.1 5.9-.9z" },
  { href: "/beheer/stageplaatsen", label: "Stageplaatsen", ic: "M4 3h12v18H4zM16 9h4v12h-4M8 7h1M11 7h1M8 11h1M11 11h1M8 15h1M11 15h1" },
  { href: "/beheer/vragen", label: "Vragen", ic: "M3 5h18v14H3zM3 7l9 6 9-6" },
  { href: "/beheer/instellingen", label: "Instellingen", ic: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M16 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0M8 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0M16 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0" },
];

export default function Zijbalk({ tellers }: { tellers: Partial<Record<string, number>> }) {
  const pad = usePathname();
  return (
    <nav className="bh-nav" aria-label="Beheer">
      {MODULES.map((m) => {
        const actief = m.href === "/beheer" ? pad === "/beheer" : pad.startsWith(m.href);
        const n = tellers[m.href];
        return (
          <Link key={m.href} href={m.href} className={actief ? "on" : undefined} aria-current={actief ? "page" : undefined}>
            <span className="lab">
              <svg className="i" viewBox="0 0 24 24" aria-hidden="true"><path d={m.ic} /></svg>
              {m.label}
            </span>
            {n ? <span className={`n${m.href !== "/beheer/leerlingen" ? " alert" : ""}`}>{n}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
