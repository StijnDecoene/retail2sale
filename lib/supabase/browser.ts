"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/** Supabase-client in de browser, voor het inloggen. De sessie komt in cookies. */
export function browserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
