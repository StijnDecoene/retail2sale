"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type * as LT from "leaflet";

export type KaartMarker = { id: string; lat: number; lng: number; kleur: string; label: string; titel: string; vaag?: boolean; groot?: boolean };
export type KaartLijn = { kleur: string; pts: [number, number][]; vaag?: boolean };

/** Kaart (OpenStreetMap) met genummerde punten per route, lijnen tussen de stops en de school als vertrekpunt. */
export default function Kaart({
  vertrek, markers, lijnen = [], hoogte = 460, onMarker, onKlik, kruis,
}: {
  vertrek: { lat: number; lng: number; label: string };
  markers: KaartMarker[];
  lijnen?: KaartLijn[];
  hoogte?: number;
  onMarker?: (id: string) => void;
  onKlik?: (lat: number, lng: number) => void;
  kruis?: { lat: number; lng: number } | null;
}) {
  const el = useRef<HTMLDivElement>(null);
  const kaart = useRef<LT.Map | null>(null);
  const laag = useRef<LT.LayerGroup | null>(null);
  const L = useRef<typeof LT | null>(null);
  const klik = useRef(onKlik);
  const mk = useRef(onMarker);
  klik.current = onKlik;
  mk.current = onMarker;
  const sleutel = JSON.stringify([markers.map((m) => [m.id, m.lat, m.lng, m.kleur, m.label, m.vaag]), lijnen, kruis]);
  const eersteKeer = useRef(true);

  useEffect(() => {
    let weg = false;
    (async () => {
      const mod = await import("leaflet");
      if (weg || !el.current || kaart.current) return;
      L.current = mod;
      const m = mod.map(el.current, { scrollWheelZoom: false, zoomControl: true }).setView([vertrek.lat, vertrek.lng], 11);
      mod.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      m.on("click", (e: LT.LeafletMouseEvent) => klik.current?.(e.latlng.lat, e.latlng.lng));
      m.on("focus", () => m.scrollWheelZoom.enable());
      m.on("blur", () => m.scrollWheelZoom.disable());
      kaart.current = m;
      laag.current = mod.layerGroup().addTo(m);
      teken();
    })();
    return () => {
      weg = true;
      kaart.current?.remove();
      kaart.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function teken() {
    const mod = L.current, m = kaart.current, g = laag.current;
    if (!mod || !m || !g) return;
    g.clearLayers();
    for (const l of lijnen) mod.polyline(l.pts, { color: l.kleur, weight: l.vaag ? 2 : 4, opacity: l.vaag ? 0.25 : 0.8, dashArray: l.vaag ? "4 6" : undefined }).addTo(g);
    mod.marker([vertrek.lat, vertrek.lng], {
      icon: mod.divIcon({ className: "kt-school", html: "S", iconSize: [26, 26] }),
      title: vertrek.label,
      zIndexOffset: 1000,
    }).addTo(g);
    for (const p of markers) {
      const r = p.groot ? 26 : 22;
      const mm = mod.marker([p.lat, p.lng], {
        icon: mod.divIcon({ className: "kt-punt", html: `<span style="background:${p.kleur};width:${r}px;height:${r}px;opacity:${p.vaag ? 0.35 : 1}">${p.label}</span>`, iconSize: [r, r] }),
        title: p.titel,
        riseOnHover: true,
      }).addTo(g);
      mm.bindTooltip(p.titel, { direction: "top", offset: [0, -10] });
      mm.on("click", () => mk.current?.(p.id));
    }
    if (kruis) mod.circleMarker([kruis.lat, kruis.lng], { radius: 10, color: "#c21f2e", weight: 3, fillOpacity: 0.15 }).addTo(g);
    if (eersteKeer.current) {
      const pts: [number, number][] = [[vertrek.lat, vertrek.lng], ...markers.filter((x) => !x.vaag).map((x) => [x.lat, x.lng] as [number, number])];
      if (pts.length > 1) m.fitBounds(mod.latLngBounds(pts), { padding: [30, 30], maxZoom: 14 });
      eersteKeer.current = false;
    }
  }

  useEffect(() => {
    teken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleutel]);

  return <div ref={el} className="kt" style={{ height: hoogte }} role="region" aria-label="Kaart" tabIndex={0} />;
}
