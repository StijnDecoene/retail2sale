import { antwoordTekst, type EvaluatieRij, type Formulier } from "@/lib/evaluaties";

const TOON: Record<string, string> = { Onvoldoende: "bad", Voldoende: "warn", Goed: "ok", "Zeer goed": "ok", "Niet van toepassing": "mut" };

/** Ingevulde evaluatie tonen (alleen lezen). */
export default function EvaluatieWeergave({ f, e, titel }: { f: Formulier; e: EvaluatieRij; titel?: string }) {
  return (
    <section className="bh-card ev-weergave">
      <div className="hd">
        <h2>{titel ?? f.titel}</h2>
        <small className="sm">{e.naam ? `${e.naam} · ` : ""}{e.ingediend_op ? `ingediend op ${new Date(e.ingediend_op).toLocaleDateString("nl-BE", { timeZone: "Europe/Brussels" })}` : "concept"}</small>
      </div>
      <div className="bd">
        {f.delen.map((d) => (
          <div key={d.titel} className="ev-wdeel">
            <h3>{d.titel}</h3>
            {d.vragen.map((v) => {
              const t = antwoordTekst(v, e.antwoorden[v.id]);
              return v.t === "tekst" ? (
                <div key={v.id} className="ev-wlang"><small>{v.label}</small><p>{t}</p></div>
              ) : (
                <div key={v.id} className="ev-wrij"><span>{v.label}</span>{v.t === "rubric" ? <span className={`pill ${TOON[t] ?? "mut"}`}>{t}</span> : <b>{t}</b>}</div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
