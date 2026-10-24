"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { documentNagekeken, documentVerwijderen } from "@/app/contract/document-acties";
import { DOC_ACCEPT, DOC_MAX, DOC_SOORT_LABEL, grootteTekst, risicoOntvangen, type DocRij, type DocSoort } from "@/lib/documenten";

const datum = (s: string) => new Date(s).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Brussels" });

/** Risicoanalyse of werkpostfiche: lijst, opladen, verwijderen en (school) nakijken. */
export default function Documenten({ modus, token, dossierId, docs, risico, naamStart }: {
  modus: "stagegever" | "school";
  token?: string;
  dossierId?: string;
  docs: DocRij[];
  risico?: string;
  naamStart?: string;
}) {
  const router = useRouter();
  const school = modus === "school";
  const basis = school ? `/beheer/dossiers/${dossierId}/document` : `/contract/${token}/document`;
  const sleutel = school ? { dossier: dossierId } : { token };
  const [soort, setSoort] = useState<DocSoort>(risico === "stuur" ? "werkpostfiche" : "risicoanalyse");
  const [naam, setNaam] = useState(naamStart ?? "");
  const [msg, setMsg] = useState<{ ok?: string; fout?: string } | null>(null);
  const [bezig, run] = useTransition();
  const [laden, setLaden] = useState(false);
  const bestand = useRef<HTMLInputElement>(null);
  const ontvangen = risicoOntvangen(docs);
  const vanSchool = docs.filter((d) => d.door === "school" && d.soort === "ander");
  const eigen = school ? docs : docs.filter((d) => !(d.door === "school" && d.soort === "ander"));

  async function opladen() {
    const f = bestand.current?.files?.[0];
    if (!f) { setMsg({ fout: "Kies een bestand." }); return; }
    if (f.size > DOC_MAX) { setMsg({ fout: "Het bestand is te groot (maximum 4 MB). Maak eventueel een pdf of een kleinere foto." }); return; }
    setLaden(true); setMsg(null);
    const fd = new FormData();
    fd.set("bestand", f); fd.set("soort", soort); fd.set("naam", naam);
    try {
      const r = await fetch(basis, { method: "POST", body: fd });
      const j = (await r.json().catch(() => ({ fout: "Opladen lukte niet." }))) as { ok?: string; fout?: string };
      setMsg(j);
      if (j.ok) { if (bestand.current) bestand.current.value = ""; router.refresh(); }
    } catch {
      setMsg({ fout: "Opladen lukte niet. Controleer je verbinding en probeer opnieuw." });
    } finally { setLaden(false); }
  }
  const doe = (f: () => Promise<{ ok?: string; fout?: string }>) => run(async () => { const r = await f(); setMsg(r); router.refresh(); });

  return (
    <div className="doc">
      {!school && (
        <p className="pt-hint">
          {risico === "stuur"
            ? "U hebt aangeduid dat u geen werknemers hebt. De school bezorgt u een werkpostfiche: vul die in en laad ze hier op, vóór de eerste stagedag."
            : "Laad vóór de eerste stagedag de risicoanalyse of de werkpostfiche op van de werkpost waar de stagiair werkt. Een pdf, Word-bestand of duidelijke foto volstaat."}
        </p>
      )}
      {!school && vanSchool.length > 0 && (
        <div className="doc-school">
          <b>Van de school</b>
          {vanSchool.map((d) => <a key={d.id} href={`${basis}/${d.id}`} target="_blank" rel="noreferrer">{d.naam} <small>({grootteTekst(d.grootte)})</small></a>)}
        </div>
      )}
      {eigen.length > 0 ? (
        <ul className="doc-lijst">
          {eigen.map((d) => (
            <li key={d.id}>
              <span className="doc-ic" aria-hidden="true">{d.type === "application/pdf" ? "PDF" : d.type.startsWith("image/") ? "IMG" : "DOC"}</span>
              <span className="doc-t">
                <a href={`${basis}/${d.id}`} target="_blank" rel="noreferrer">{d.naam}</a>
                <small>{DOC_SOORT_LABEL[d.soort]}{d.door === "school" && d.soort === "ander" ? " (voor de stagegever)" : ""} · {grootteTekst(d.grootte)} · {d.door === "school" ? "door de school" : `door ${d.door_naam || "de stagegever"}`} op {datum(d.op)}</small>
              </span>
              {d.nagekeken_op ? <span className="pill ok">Nagekeken</span> : d.soort !== "ander" ? <span className="pill in">{school ? "Na te kijken" : "Ontvangen"}</span> : null}
              {school && d.soort !== "ander" && (
                <button type="button" className="bh-btn sm" disabled={bezig} onClick={() => doe(() => documentNagekeken(dossierId!, d.id, !d.nagekeken_op))}>{d.nagekeken_op ? "Terug openzetten" : "In orde"}</button>
              )}
              {(school || !d.nagekeken_op) && (
                <button type="button" className="doc-weg" disabled={bezig} aria-label={`${d.naam} verwijderen`} onClick={() => doe(() => documentVerwijderen(sleutel, d.id))}>×</button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className={school ? "sm" : "bh-melding"}>{school ? "Nog geen risicoanalyse of werkpostfiche ontvangen." : "Nog niets opgeladen."}</p>
      )}
      <div className="doc-op">
        <label className="f">Soort
          <select value={soort} onChange={(e) => setSoort(e.target.value as DocSoort)}>
            <option value="risicoanalyse">Risicoanalyse</option>
            <option value="werkpostfiche">Werkpostfiche</option>
            <option value="ander">{school ? "Blanco werkpostfiche of ander document voor de stagegever" : "Ander document"}</option>
          </select>
        </label>
        <label className="f doc-bestand">Bestand (pdf, Word of foto, max. 4 MB)
          <input ref={bestand} type="file" accept={DOC_ACCEPT} />
        </label>
        {!school && <label className="f">Uw naam<input value={naam} onChange={(e) => setNaam(e.target.value)} autoComplete="name" /></label>}
        <button type="button" className={school ? "bh-btn pri" : "btn btn-blue"} disabled={laden} onClick={opladen}>{laden ? "Opladen…" : "Opladen"}</button>
      </div>
      {msg?.ok && <p className="bh-ok" role="status">{msg.ok}</p>}
      {msg?.fout && <p className="bh-fout" role="alert">{msg.fout}</p>}
      {!school && ontvangen && <p className="sm">De stagebegeleiding kijkt het document na. Daarna kan u het niet meer verwijderen.</p>}
    </div>
  );
}
