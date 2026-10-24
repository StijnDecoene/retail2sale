"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BResultaat } from "@/app/beheer/bezoeken/acties";
import { punt, routeKleur, type BezoekData, type BLln, type Route } from "@/lib/bezoeken";
import type { KaartLijn, KaartMarker } from "./Kaart";

/** Server action uitvoeren, melding tonen en de pagina verversen. */
export function useActie() {
  const router = useRouter();
  const [bezig, start] = useTransition();
  const [melding, setMelding] = useState<{ t: string; fout?: boolean } | null>(null);
  const doe = (f: () => Promise<BResultaat>, na?: (r: BResultaat) => void) =>
    start(async () => {
      const r = await f();
      if (r?.fout) setMelding({ t: r.fout, fout: true });
      else if (r?.ok) setMelding({ t: r.ok });
      na?.(r);
      router.refresh();
      setTimeout(() => setMelding(null), 4000);
    });
  return { bezig, doe, melding };
}

export function Melding({ m }: { m: { t: string; fout?: boolean } | null }) {
  if (!m) return null;
  return <div className={`bz-toast${m.fout ? " fout" : ""}`} role="status">{m.t}</div>;
}

export const lijstVan = (d: BezoekData) => new Map(d.leerlingen.map((l) => [l.dossier_id, l]));
export const routeVan = (d: BezoekData) => {
  const m = new Map<string, Route>();
  d.routes.forEach((r) => r.volgorde.forEach((id) => m.set(id, r)));
  return m;
};

/** Markers en lijnen voor de kaart: elke route in haar kleur, leerlingen zonder route grijs. */
export function kaartLagen(d: BezoekData, lln: Map<string, BLln>, opties: { routes: Route[]; uitgelicht?: string | null; losse?: boolean }) {
  const markers: KaartMarker[] = [];
  const lijnen: KaartLijn[] = [];
  const v = d.instellingen.vertrek;
  for (const r of opties.routes) {
    const kleur = routeKleur(r);
    const vaag = !!opties.uitgelicht && opties.uitgelicht !== r.id;
    const pts: [number, number][] = [[v.lat, v.lng]];
    r.volgorde.forEach((id, i) => {
      const l = lln.get(id);
      const p = punt(l);
      if (!l || !p) return;
      pts.push([p.lat, p.lng]);
      markers.push({ id, lat: p.lat, lng: p.lng, kleur: l.bezoek?.bezocht_op ? "#1e7a4f" : kleur, label: opties.routes.length === 1 ? String(i + 1) : String(r.nr), titel: `${l.voornaam} ${l.naam} · ${l.plaats?.naam ?? ""} (route ${r.nr})`, vaag });
    });
    pts.push([v.lat, v.lng]);
    if (pts.length > 2) lijnen.push({ kleur, pts, vaag });
  }
  if (opties.losse) {
    const inRoute = new Set(d.routes.flatMap((r) => r.volgorde));
    d.leerlingen.filter((l) => !inRoute.has(l.dossier_id)).forEach((l) => {
      const p = punt(l);
      if (p) markers.push({ id: l.dossier_id, lat: p.lat, lng: p.lng, kleur: "#7a8580", label: "·", titel: `${l.voornaam} ${l.naam} · ${l.plaats?.naam ?? ""} (geen route)` });
    });
  }
  return { markers, lijnen };
}
