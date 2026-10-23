"use client";

import { useState } from "react";

/** Knop die een tekst (bv. een persoonlijke link) naar het klembord kopieert. */
export default function Kopieer({ tekst, label = "Link kopiëren" }: { tekst: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="bh-btn sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(tekst);
          setOk(true);
          setTimeout(() => setOk(false), 1800);
        } catch {
          window.prompt("Kopieer deze link:", tekst);
        }
      }}
    >
      {ok ? "Gekopieerd" : label}
    </button>
  );
}
