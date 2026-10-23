import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const sb = await serverClient();
  await sb.auth.signOut();
  return NextResponse.redirect(`${request.nextUrl.origin}/inloggen?rol=school`, { status: 303 });
}
