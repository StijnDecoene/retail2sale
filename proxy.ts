import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Ververst de inlogsessie van Supabase bij elke aanvraag naar het beheer en het portaal,
 * en stuurt wie niet ingelogd is naar het inlogscherm.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(lijst) {
        lijst.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        lijst.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pad = request.nextUrl.pathname;
  if (!user && (pad.startsWith("/beheer") || pad.startsWith("/portaal"))) {
    const naar = request.nextUrl.clone();
    naar.pathname = "/inloggen";
    naar.search = pad.startsWith("/portaal") ? "?rol=stagiair" : "?rol=school";
    return NextResponse.redirect(naar);
  }
  return response;
}

export const config = {
  matcher: ["/beheer/:path*", "/portaal/:path*", "/auth/:path*"],
};
