"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MODULES = [
  { href: "/beheer", label: "Overzicht", ic: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/beheer/leerlingen", label: "Leerlingen", ic: "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.9.7 3.1 2.5 3.5 5.2" },
  { href: "/beheer/dossiers", label: "Stagedossiers", ic: "M6 3h9l4 4v14H6zM14 3v5h5M9 13l2 2 4-4" },
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
            {n ? <span className={`n${m.href === "/beheer/vragen" || m.href === "/beheer/dossiers" ? " alert" : ""}`}>{n}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
