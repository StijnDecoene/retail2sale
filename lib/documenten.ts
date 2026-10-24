// Documenten bij een dossier: risicoanalyse of werkpostfiche van de stagegever (en andere bijlagen).
export type DocSoort = "risicoanalyse" | "werkpostfiche" | "ander";
export const DOC_SOORT_LABEL: Record<DocSoort, string> = { risicoanalyse: "Risicoanalyse", werkpostfiche: "Werkpostfiche", ander: "Ander document" };
export type DocRij = {
  id: string; soort: DocSoort; naam: string; type: string; grootte: number;
  door: "stagegever" | "school"; door_naam: string | null; op: string; nagekeken_op: string | null;
};
export const DOC_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
};
export const DOC_ACCEPT = ".pdf,.jpg,.jpeg,.png,.heic,.docx,.doc,application/pdf,image/*";
export const DOC_MAX = 4 * 1024 * 1024;
export const grootteTekst = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} kB`);
/** Is de risicoanalyse of werkpostfiche er? */
export const risicoOntvangen = (docs: Pick<DocRij, "soort">[]) => docs.some((d) => d.soort === "risicoanalyse" || d.soort === "werkpostfiche");

export const DOC_FOUT: Record<string, string> = {
  onbekend: "Deze link is niet (meer) geldig.",
  ongeldig: "Het bestand kon niet gelezen worden.",
  type: "Enkel pdf, Word of een foto (jpg, png).",
  grootte: "Het bestand is te groot (maximum 4 MB).",
  te_veel: "Er staan al zes documenten bij deze stage. Verwijder eerst een document.",
  vergrendeld: "Dit document is al nagekeken door de school en kan niet meer verwijderd worden.",
};
