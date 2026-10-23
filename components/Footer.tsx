import Link from "next/link";
import { SCHOOL } from "@/lib/stage";
import VraagKnop from "./VraagKnop";

export default function Footer() {
  return (
    <footer id="contact" className="voet">
      <div className="wrap">
        <div className="voet-rij">
          <div className="voet-merk">
            <span className="woordmerk">
              RETAIL<span>2</span>SALE
            </span>
            <p>Vragen over een stage of een stageplaats aanbieden? We helpen graag.</p>
          </div>
          <address className="voet-adres" style={{ fontStyle: "normal" }}>
            <b>{SCHOOL.naam}</b>
            <span>{SCHOOL.straat}</span>
            <span>{SCHOOL.gemeente}</span>
            <a href={`tel:${SCHOOL.telLink}`}>{SCHOOL.tel}</a>
          </address>
          <div className="voet-acties">
            <VraagKnop className="btn btn-wit">Stel ons een vraag</VraagKnop>
            <Link href="/inloggen" className="btn btn-rand">
              Inloggen op het portaal
            </Link>
          </div>
        </div>
        <div className="voet-onder">
          <span>© {new Date().getFullYear()} Spes Nostra Heule · Retail2Sale</span>
          <div>
            <Link href="/privacy">Privacyverklaring</Link>
            <a href={SCHOOL.web}>www.snh.be</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
