import type { Metadata } from "next";
import Handleiding from "@/components/Handleiding";
import { HANDLEIDINGEN } from "@/lib/handleidingen";

const h = HANDLEIDINGEN.stagiair;
export const metadata: Metadata = { title: "Handleiding voor stagiairs", description: h.beschrijving };

export default function HandleidingStagiair() {
  return <Handleiding inhoud={h} />;
}
