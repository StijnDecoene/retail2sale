import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/**
 * Supabase-client voor server components, route handlers en server actions.
 * Werkt met de inlogsessie uit de cookies; de rechten worden in de databank bewaakt (RLS).
 * `schema` = "stage" voor het stageplatform, "public" voor bv. de tabel `vragen`.
 */
export async function serverClient(schema: "stage" | "public" = "stage") {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    db: { schema },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(lijst) {
        try {
          lijst.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // In een server component kan je geen cookies zetten; de proxy ververst de sessie.
        }
      },
    },
  });
}

export type Begeleider = {
  id: string;
  email: string;
  naam: string;
  rol: "begeleider" | "beheerder" | "directie";
  telefoon: string | null;
  kleur: string | null;
  actief: boolean;
};

/** De ingelogde gebruiker en, als die op de lijst staat, de bijhorende begeleider. */
export async function huidigeGebruiker() {
  const sb = await serverClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { user: null, begeleider: null as Begeleider | null };
  const email = (user.email ?? "").toLowerCase();
  const { data } = await sb.from("begeleiders").select("*").eq("email", email).eq("actief", true).maybeSingle();
  return { user, begeleider: (data as Begeleider | null) ?? null };
}
