// Publieke instellingen voor Supabase. NEXT_PUBLIC_-waarden komen in de browser terecht en zijn niet geheim.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Supabase noemt de publieke sleutel nu "publishable key"; de oudere naam "anon key" werkt ook.
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabaseIngesteld = () => Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Toon de knop "Inloggen met Microsoft" pas als de koppeling in Supabase klaarstaat. */
export const MICROSOFT_LOGIN_AAN = process.env.NEXT_PUBLIC_MICROSOFT_LOGIN === "aan";

/** Enkel deze e-maildomeinen kunnen een inloglink voor het beheer aanvragen. */
export const SCHOOL_DOMEINEN = ["snh.be"];
