"use client";

import { useActionState, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { Resultaat } from "@/app/beheer/acties";

type Props = {
  actie: (vorig: Resultaat, fd: FormData) => Promise<Resultaat>;
  knop: string;
  children: ReactNode;
  className?: string;
  /** Verouderd: na een geslaagde bewaring wordt het formulier altijd opnieuw opgebouwd. */
  leegNaOk?: boolean;
};

/** Formulier met een server action: toont "Bewaard." of de foutmelding onder de knop. */
export default function Formulier({ actie, knop, children, className = "bh-form" }: Props) {
  const [res, verzend] = useActionState(actie, null);
  // Na een geslaagde bewaring het formulier opnieuw opbouwen met de nieuwe waarden van de server
  // (een "toevoegen"-formulier wordt zo weer leeg). Bij een fout blijft wat je typte staan.
  const versie = useRef({ res: null as typeof res, n: 0 });
  if (res !== versie.current.res) {
    if (res?.ok) versie.current.n++;
    versie.current.res = res;
  }
  return (
    <form action={verzend} className={className} key={versie.current.n}>
      {children}
      <div className="bh-form-voet">
        <Knop>{knop}</Knop>
        {res?.ok && <span className="bh-ok" role="status">{res.ok}</span>}
        {res?.fout && <span className="bh-fout" role="alert">{res.fout}</span>}
      </div>
    </form>
  );
}

function Knop({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="bh-btn pri" disabled={pending}>
      {pending ? "Bezig…" : children}
    </button>
  );
}

/** Knop voor een klein formulier zonder melding (bv. verwijderen, status wijzigen). */
export function ActieKnop({ children, className = "bh-btn", bevestig }: { children: ReactNode; className?: string; bevestig?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (bevestig && !window.confirm(bevestig)) e.preventDefault();
      }}
    >
      {pending ? "Bezig…" : children}
    </button>
  );
}
