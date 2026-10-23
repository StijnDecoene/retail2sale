import { ROL_LABEL, SCHOOL_CONTRACT, effectief, magTekenen, nodigeRollen, partij, type ContractData, type Rol } from "@/lib/contract";

const tijd = (iso: string) =>
  new Date(iso).toLocaleString("nl-BE", { timeZone: "Europe/Brussels", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Overzicht van wie al tekende en wie nog moet. */
export default function Ondertekening({ d, ik }: { d: ContractData; ik?: Rol }) {
  const g = effectief(d);
  const rollen = nodigeRollen(d.contract.meerderjarig);
  return (
    <ol className="ct-partijen">
      {rollen.map((r, i) => {
        const p = partij(d, r);
        const naam =
          p?.getekend_naam ||
          (r === "stagegever" ? g.ondertekenaar : r === "stagiair" ? `${d.leerling.voornaam} ${d.leerling.naam}` : r === "directie" ? SCHOOL_CONTRACT.directeur : "ouder of voogd");
        const status = p?.getekend_op ? "ok" : magTekenen(d, r) ? "beurt" : "wacht";
        return (
          <li key={r} className={`${status}${r === ik ? " ik" : ""}`}>
            <span className="n"><span className="bol">{p?.getekend_op ? "✓" : i + 1}</span>{ROL_LABEL[r]}{r === ik ? " · jij" : ""}</span>
            <b>{naam}</b>
            {p?.handtekening ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.handtekening} alt={`Handtekening ${naam}`} className="ct-sig" />
            ) : null}
            <small>
              {p?.getekend_op ? `Getekend op ${tijd(p.getekend_op)}${p.plaats ? ` te ${p.plaats}` : ""}` : status === "beurt" ? "Kan nu tekenen" : r === "directie" ? "Tekent als laatste" : "Na de stagegever"}
            </small>
          </li>
        );
      })}
    </ol>
  );
}
