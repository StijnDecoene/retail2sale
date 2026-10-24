import Link from "next/link";
import Logos from "./Logos";
import VraagKnop from "./VraagKnop";

type Props = { actief?: "home" | "documenten" | "briefing" | "andere" };

export default function Header({ actief = "home" }: Props) {
  const pre = actief === "home" ? "" : "/";
  return (
    <header className="kop">
      <div className="wrap">
        <Logos />
        <nav className="menu" aria-label="Hoofdmenu">
          <a href={`${pre}#opleiding`}>Opleiding</a>
          <a href={`${pre}#stage`}>Zo verloopt de stage</a>
          <Link href="/handleiding" aria-current={actief === "briefing" ? "page" : undefined}>
            Briefing
          </Link>
          <Link href="/documenten" aria-current={actief === "documenten" ? "page" : undefined}>
            Documenten
          </Link>
          <a href={`${pre}#team`}>Team</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="kop-acties">
          <VraagKnop className="btn btn-line vraag-knop">Stel een vraag</VraagKnop>
          <Link href="/inloggen" className="btn btn-blue">
            Inloggen
          </Link>
        </div>
      </div>
    </header>
  );
}
