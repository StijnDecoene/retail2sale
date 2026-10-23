# Retail2Sale

Website en stageplatform van de richting **Onthaal, organisatie en sales** van Spes Nostra Heule.

Gebouwd met [Next.js](https://nextjs.org), gehost op [Vercel](https://vercel.com), met [Supabase](https://supabase.com) als databank en voor de logins.

## Wat er nu in zit (versie 0.1)

| Pagina | Wat |
| --- | --- |
| `/` | Publieke homepagina: opleiding, de stage in zeven stappen, stagebegeleiders, contact |
| `/inloggen` | Inlogscherm per rol (stagegever, stagiair, school). De knoppen staan uit tot het portaal open is |
| `/documenten` | Documenten per stap van de stage, met filter per rol en zoeken |
| `/privacy` | Voorlopige privacyverklaring (na te kijken door de school) |
| Stel een vraag | Formulier in de kopbalk en onderaan elke pagina; bewaart de vraag in Supabase (tabel `vragen`) |

Het stageportaal zelf (top 3, aanvraag, contract, werkrooster …) volgt in fase 1 van het technisch plan.

## Online zetten

### 1. Supabase

1. Maak in Supabase een nieuw project aan, regio **Central EU (Frankfurt)**.
2. Open **SQL Editor**, plak de inhoud van `supabase/migrations/20261023000000_vragen.sql` en klik op **Run**.
3. Ga naar **Project Settings → API** en noteer de **Project URL** en de **anon public** key.

### 2. Vercel

1. In Vercel: **Add New → Project**, kies de GitHub-repository `retail2sale` en klik op **Import**.
2. Open **Environment Variables** en voeg toe:
   - `NEXT_PUBLIC_SUPABASE_URL` = de Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = de anon public key
3. Klik op **Deploy**. De site staat daarna op een adres `….vercel.app`.

Elke wijziging die op de branch `main` komt, zet Vercel automatisch online. Wijzigingen op een andere branch krijgen een eigen testadres (preview).

### 3. Domein (pas als de nieuwe site klaar is)

In Vercel: **Settings → Domains**, voeg `retail2sale.com` en `www.retail2sale.com` toe en neem de DNS-records over die Vercel toont bij de domeinbeheerder. Daarmee verdwijnt de huidige Wix-site.

## Vragen opvolgen

Nieuwe vragen staan in Supabase → **Table Editor → vragen**. Zet `status` op `in behandeling` of `beantwoord`.

## Lokaal werken

```bash
npm install
cp .env.example .env.local   # en vul de twee waarden in
npm run dev                  # http://localhost:3000
```

## Mappen

```
app/            pagina's (Next.js App Router)
components/     kopbalk, voet, vraagformulier, iconen
lib/            stagegegevens (blokken, begeleiders) en de Supabase-client
public/         logo's, foto's en de infobrochure
supabase/       SQL voor de databank
```
