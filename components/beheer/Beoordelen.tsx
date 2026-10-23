"use client";

import { useActionState, useState, type ReactNode } from "react";
import type { Resultaat } from "@/app/beheer/acties";

type Props = {
  actie: (vorig: Resultaat, fd: FormData) => Promise<Resultaat>;
  dossierId: string;
  /** Top 3: de keuzes die je kan aanvinken. */
  keuzes?: { nr: number; label: string }[];
  goedLabel: string;
  uitleg?: string;
  /** Extra velden die enkel bij goedkeuren verschijnen (bv. bevestiging mailen). */
  extra?: ReactNode;
  /** Tekst van de knop bij terugsturen en voor wie het bericht is. */
  terugLabel?: string;
  voorWie?: string;
};

/** Goedkeuren of laten aanpassen, met feedback voor de leerling. */
export default function Beoordelen({ actie, dossierId, keuzes, goedLabel, uitleg, extra, terugLabel = "Terugsturen naar de leerling", voorWie = "de leerling" }: Props) {
  const [res, verzend, bezig] = useActionState(actie, null);
  const [besluit, setBesluit] = useState<"goedkeuren" | "aanpassen">("goedkeuren");
  return (
    <form action={verzend} className="bh-form bh-beoordeel">
      <input type="hidden" name="dossier_id" value={dossierId} />
      <input type="hidden" name="besluit" value={besluit} />
      <div className="bh-seg" role="radiogroup" aria-label="Besluit">
        <button type="button" role="radio" aria-checked={besluit === "goedkeuren"} className={besluit === "goedkeuren" ? "on" : ""} onClick={() => setBesluit("goedkeuren")}>Goedkeuren</button>
        <button type="button" role="radio" aria-checked={besluit === "aanpassen"} className={besluit === "aanpassen" ? "on" : ""} onClick={() => setBesluit("aanpassen")}>Laten aanpassen</button>
      </div>
      {besluit === "goedkeuren" && keuzes && (
        <fieldset className="bh-klassen">
          <legend>Welke keuzes keur je goed? (één of twee)</legend>
          <div>
            {keuzes.map((k) => (
              <label key={k.nr}><input type="checkbox" name="keuzes" value={k.nr} defaultChecked={k.nr === 1} /> {k.nr}. {k.label}</label>
            ))}
          </div>
        </fieldset>
      )}
      {besluit === "goedkeuren" && uitleg && <p className="hint">{uitleg}</p>}
      {besluit === "goedkeuren" && extra}
      <label className="f">
        {besluit === "aanpassen" ? `Wat moet er aangepast worden? Dit bericht ziet ${voorWie}. (verplicht)` : `Bericht voor ${voorWie} (optioneel)`}
        <textarea name="feedback" required={besluit === "aanpassen"} />
      </label>
      <div className="bh-form-voet">
        <button type="submit" className={`bh-btn ${besluit === "goedkeuren" ? "pri" : ""}`} disabled={bezig}>
          {bezig ? "Bezig…" : besluit === "goedkeuren" ? goedLabel : terugLabel}
        </button>
        {res?.ok && <span className="bh-ok" role="status">{res.ok}</span>}
        {res?.fout && <span className="bh-fout" role="alert">{res.fout}</span>}
      </div>
    </form>
  );
}
