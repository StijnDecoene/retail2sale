import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DocumentenLijst from "./DocumentenLijst";

export const metadata: Metadata = { title: "Documenten" };

export default function Documenten() {
  return (
    <>
      <Header actief="documenten" />
      <main className="wrap doc-pagina">
        <DocumentenLijst />
      </main>
      <Footer />
    </>
  );
}
