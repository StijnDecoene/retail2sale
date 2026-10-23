import type { Metadata } from "next";
import Handleiding from "@/components/Handleiding";
import { HANDLEIDINGEN } from "@/lib/handleidingen";

const h = HANDLEIDINGEN.stagegever;
export const metadata: Metadata = { title: "Handleiding voor stagegevers", description: h.beschrijving };

export default function HandleidingStagegever() {
  return <Handleiding inhoud={h} />;
}
