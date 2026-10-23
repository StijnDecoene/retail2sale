// Controle en opmaak van telefoonnummers en e-mailadressen (portaal en beheer, client en server).

/** Belgisch nummer naar cijfers met een 0 vooraan; buitenlands nummer als "+cijfers". */
function cijfers(v: string): string {
  const t = v.trim().replace(/[\s./()-]/g, "");
  if (/^(\+|00)32/.test(t)) return "0" + t.replace(/^(\+|00)32/, "").replace(/^0/, "");
  if (/^(\+|00)\d/.test(t)) return "+" + t.replace(/^(\+|00)/, "");
  return t;
}

/** Is dit een Belgisch gsm-nummer (04xx xx xx xx)? */
const isGsm = (c: string) => /^04[5-9]\d{7}$/.test(c);
/** Belgisch vast nummer: 9 cijfers, zone 01x–09x. */
const isVast = (c: string) => /^0[1-9]\d{7}$/.test(c);
/** Buitenlands nummer in internationale vorm (bv. Frankrijk +33 6…). */
const isBuitenland = (c: string) => /^\+[1-9]\d{7,13}$/.test(c);

/**
 * Foutmelding voor een telefoonnummer, of undefined als het klopt (of leeg is).
 * `gsm`: enkel een gsm-nummer aanvaarden.
 */
export function telFout(v: string | undefined | null, opt: { gsm?: boolean } = {}): string | undefined {
  if (!v || !v.trim()) return undefined;
  if (/[a-z]/i.test(v)) return "Enkel cijfers, bv. 0470 12 34 56.";
  const c = cijfers(v);
  if (isGsm(c) || isBuitenland(c)) return undefined;
  if (!opt.gsm && isVast(c)) return undefined;
  if (/^04\d{7}$/.test(c) && opt.gsm) return "Een gsm-nummer heeft 10 cijfers, bv. 0470 12 34 56.";
  if (/^0\d+$/.test(c) && c.length < (opt.gsm ? 10 : 9)) return "Er ontbreken cijfers.";
  if (/^0\d+$/.test(c) && c.length > 10) return "Er staan te veel cijfers in.";
  return opt.gsm ? "Geen geldig gsm-nummer, bv. 0470 12 34 56." : "Geen geldig telefoonnummer, bv. 0470 12 34 56 of 056 12 34 56.";
}

/** Nummer netjes schrijven (0470 12 34 56, 056 12 34 56, 02 123 45 67); ongeldig blijft zoals getypt. */
export function telMooi(v: string | undefined | null): string {
  const t = (v ?? "").trim();
  if (!t) return "";
  const c = cijfers(t);
  if (isGsm(c)) return `${c.slice(0, 4)} ${c.slice(4, 6)} ${c.slice(6, 8)} ${c.slice(8)}`;
  if (isVast(c)) {
    return /^0[2349]/.test(c)
      ? `${c.slice(0, 2)} ${c.slice(2, 5)} ${c.slice(5, 7)} ${c.slice(7)}`
      : `${c.slice(0, 3)} ${c.slice(3, 5)} ${c.slice(5, 7)} ${c.slice(7)}`;
  }
  if (isBuitenland(c)) return c;
  return t;
}

const TIKFOUTEN: Record<string, string> = {
  "gmail.con": "gmail.com", "gmail.co": "gmail.com", "gmial.com": "gmail.com", "gmal.com": "gmail.com", "gmai.com": "gmail.com",
  "gamil.com": "gmail.com", "gmail.be": "gmail.com", "gmaill.com": "gmail.com", "gnail.com": "gmail.com",
  "hotmail.con": "hotmail.com", "hotmial.com": "hotmail.com", "hotmal.com": "hotmail.com", "hotmai.com": "hotmail.com",
  "outlook.con": "outlook.com", "outlok.com": "outlook.com", "outloo.com": "outlook.com",
  "telenet.b": "telenet.be", "telenet.com": "telenet.be", "skynet.b": "skynet.be", "icloud.con": "icloud.com", "yahoo.con": "yahoo.com",
};

/** Foutmelding voor een e-mailadres, of undefined als het klopt (of leeg is). */
export function mailFout(v: string | undefined | null): string | undefined {
  if (!v || !v.trim()) return undefined;
  const m = v.trim().toLowerCase();
  if (/\s/.test(m)) return "Een e-mailadres heeft geen spaties.";
  const delen = m.split("@");
  if (delen.length !== 2 || !delen[0] || !delen[1]) return "Een e-mailadres heeft één @, bv. naam@winkel.be.";
  const [lokaal, domein] = delen;
  if (lokaal.startsWith(".") || lokaal.endsWith(".") || m.includes("..")) return "Kijk de puntjes na.";
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(lokaal)) return "Er staat een ongeldig teken in.";
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(domein)) return "Kijk het deel na de @ na, bv. winkel.be.";
  if (TIKFOUTEN[domein]) return `Bedoel je ${lokaal}@${TIKFOUTEN[domein]}?`;
  return undefined;
}
