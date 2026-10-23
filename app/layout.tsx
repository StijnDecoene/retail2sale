import type { Metadata, Viewport } from "next";
import "@fontsource/figtree/400.css";
import "@fontsource/figtree/500.css";
import "@fontsource/figtree/600.css";
import "@fontsource/schibsted-grotesk/500.css";
import "@fontsource/schibsted-grotesk/600.css";
import "@fontsource/schibsted-grotesk/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Retail2Sale – Onthaal, organisatie en sales | Spes Nostra Heule",
    template: "%s | Retail2Sale",
  },
  description:
    "Retail2Sale is de richting Onthaal, organisatie en sales van Spes Nostra Heule. Alles over de stage voor stagiairs, stagegevers en de school.",
  icons: { icon: "/img/logo-retail2sale.png" },
};

export const viewport: Viewport = {
  themeColor: "#0E1A2B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
