import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";

/**
 * Terugkeerpunt na inloggen met Microsoft of na een klik op de inloglink in de mail.
 * Supabase stuurt een eenmalige `code` mee; die ruilen we in voor een sessie (cookies).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const volgende = searchParams.get("volgende");
  const doel = volgende && volgende.startsWith("/") && !volgende.startsWith("//") ? volgende : "/beheer";

  const fout = searchParams.get("error_description") || searchParams.get("error");
  if (fout) {
    return NextResponse.redirect(`${origin}/inloggen?rol=school&fout=${encodeURIComponent(fout)}`);
  }

  if (code) {
    const sb = await serverClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${doel}`);
    return NextResponse.redirect(
      `${origin}/inloggen?rol=school&fout=${encodeURIComponent("De inloglink is verlopen of al gebruikt. Vraag een nieuwe aan.")}`,
    );
  }

  return NextResponse.redirect(`${origin}/inloggen?rol=school`);
}
