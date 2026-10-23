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
| `/beheer` | Beheer voor begeleiders (inloggen via School): Overzicht, Leerlingen (met import van de klaslijst), Stageplaatsen, Vragen, Instellingen |

Het leerlingportaal (top 3, aanvraag, contract, werkrooster …) en het inloggen voor stagiairs en stagegevers volgen in fase 1 van het technisch plan.

## Beheer instellen (eenmalig, in Supabase)

Alle tabellen van het stageplatform staan in een eigen schema **`stage`**. Zo botsen ze niet met andere tabellen in hetzelfde project (bv. `public.leerlingen`).

1. **SQL Editor**: voer `supabase/migrations/20261023120000_stage_beheer.sql` uit. Dit maakt de tabellen, de toegangsregels en de startgegevens (begeleiders Stijn en Fien, blokstages 2026-2027) aan.
2. **Integrations → Data API → Settings → Exposed schemas**: voeg `stage` toe en bewaar.
3. **Authentication → URL Configuration → Redirect URLs**: voeg toe:
   - `https://retail2sale.vercel.app/auth/callback`
   - `https://retail2sale.vercel.app/**` (voor de previews kan ook `https://*-spes-nostra-heule.vercel.app/**`)

   Verander de **Site URL** niet als het project ook voor een andere toepassing gebruikt wordt.

### Inloggen met een link per e-mail
Werkt meteen. Let op: de ingebouwde mailservice van Supabase stuurt enkel naar leden van de Supabase-organisatie en maar een paar mails per uur. Voor andere begeleiders: stel onder **Authentication → Emails → SMTP Settings** een eigen mailserver in (bv. Microsoft 365 of een mailservice).

### Inloggen met Microsoft (aan te raden)
1. Laat de ICT-beheerder in **Microsoft Entra ID** een app registreren: *App registrations → New registration*, enkel accounts van de school (single tenant), redirect URI (Web) = de **Callback URL** die Supabase toont onder *Authentication → Sign In / Providers → Azure*.
2. Maak een *client secret* aan en noteer de *Application (client) ID* en de *Directory (tenant) ID*.
3. In Supabase → **Authentication → Sign In / Providers → Azure**: zet aan, vul client ID en secret in, en als *Azure Tenant URL* `https://login.microsoftonline.com/<tenant-id>`.
4. In Vercel → **Settings → Environment Variables**: `NEXT_PUBLIC_MICROSOFT_LOGIN` = `aan`, en daarna opnieuw deployen. De knop verschijnt dan op het inlogscherm.

### Wie mag binnen
Alleen adressen in **Instellingen → Begeleiders** (tabel `stage.begeleiders`). Een beheerder of de directie kan begeleiders toevoegen of hun toegang intrekken. Iemand die inlogt maar niet op de lijst staat, ziet "Geen toegang" en kan niets lezen: de databank zelf bewaakt dat (row level security).

## Online zetten

### 1. Supabase

1. Gebruik het Supabase-project **SNH3** (regio eu-west-1, Ierland) van de organisatie Spes Nostra Heule. Een nieuw project kan ook, zolang de regio in de EU ligt.
2. Open **SQL Editor**, plak de inhoud van `supabase/migrations/20261023000000_vragen.sql` en klik op **Run**.
3. Klik bovenaan op **Connect** en noteer de **Project URL** en de **publishable key**. Nooit de `service_role`- of `secret`-key gebruiken.

### 2. Vercel

1. In Vercel: **Add New → Project**, kies de GitHub-repository `retail2sale` en klik op **Import**.
2. Open **Environment Variables** en voeg toe:
   - `NEXT_PUBLIC_SUPABASE_URL` = de Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = de publishable key (`sb_publishable_…`)

   Tip: in Supabase → **Connect → Framework → Next.js** staan beide regels klaar; je kan ze in één keer in het veld *Key* van Vercel plakken.
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
