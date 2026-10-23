import { PLAATS_STATUS, SECTOREN, type Stageplaats } from "@/lib/beheer";

/** De invulvelden van een stageplaats, voor toevoegen en bewerken. */
export default function PlaatsVelden({ p }: { p?: Partial<Stageplaats> }) {
  const sectoren = p?.sector && !SECTOREN.includes(p.sector) ? [p.sector, ...SECTOREN] : SECTOREN;
  return (
    <div className="bh-fg">
      <label className="f">Naam (zoals leerlingen ze kennen)<input name="naam" defaultValue={p?.naam ?? ""} required /></label>
      <label className="f">Juridische naam<input name="juridische_naam" defaultValue={p?.juridische_naam ?? ""} placeholder="bv. Voorbeeld BV" /></label>
      <label className="f">Ondernemingsnummer<input name="kbo" defaultValue={p?.kbo ?? ""} placeholder="0123.456.789" /></label>
      <label className="f">Sector
        <select name="sector" defaultValue={p?.sector ?? ""}>
          <option value="">Kies</option>
          {sectoren.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className="f">Straat en nummer<input name="straat" defaultValue={p?.straat ?? ""} /></label>
      <div className="bh-fg2-in">
        <label className="f">Postcode<input name="postcode" defaultValue={p?.postcode ?? ""} inputMode="numeric" /></label>
        <label className="f">Gemeente<input name="gemeente" defaultValue={p?.gemeente ?? ""} /></label>
      </div>
      <label className="f">Contactpersoon<input name="contactpersoon" defaultValue={p?.contactpersoon ?? ""} /></label>
      <label className="f">Telefoon<input name="telefoon" type="tel" defaultValue={p?.telefoon ?? ""} /></label>
      <label className="f">E-mailadres<input name="email" type="email" defaultValue={p?.email ?? ""} /></label>
      <label className="f">Website<input name="website" defaultValue={p?.website ?? ""} placeholder="www.…" /></label>
      <label className="f">Status
        <select name="status" defaultValue={p?.status ?? "actief"}>
          {Object.entries(PLAATS_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </label>
      <label className="f">Max. stagiairs per blok<input name="max_stagiairs" type="number" min={0} max={20} defaultValue={p?.max_stagiairs ?? 1} /></label>
      <label className="f">Beoordeling door de school
        <select name="beoordeling" defaultValue={p?.beoordeling ?? 0}>
          <option value={0}>Geen</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}{"☆".repeat(5 - n)}</option>)}
        </select>
      </label>
      <label className="f full">Notities (enkel voor begeleiders)<textarea name="notities" defaultValue={p?.notities ?? ""} /></label>
    </div>
  );
}
