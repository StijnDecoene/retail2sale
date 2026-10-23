import { handleidingAntwoord } from "@/lib/handleiding-pdf";

export const runtime = "nodejs";
export const GET = () => handleidingAntwoord("stagiair");
