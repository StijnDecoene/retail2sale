import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Handleiding from "@/components/Handleiding";
import { HANDLEIDINGEN, WIE, type Wie } from "@/lib/handleidingen";

export const dynamicParams = false;
export const generateStaticParams = () => WIE.map((wie) => ({ wie }));

export async function generateMetadata({ params }: { params: Promise<{ wie: string }> }): Promise<Metadata> {
  const h = HANDLEIDINGEN[(await params).wie as Wie];
  return h ? { title: h.titel, description: h.beschrijving } : {};
}

export default async function HandleidingPagina({ params }: { params: Promise<{ wie: string }> }) {
  const h = HANDLEIDINGEN[(await params).wie as Wie];
  if (!h) notFound();
  return <Handleiding inhoud={h} />;
}
