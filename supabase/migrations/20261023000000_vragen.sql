-- Vragen via het formulier "Stel ons een vraag" op de publieke site.
-- Uitvoeren in Supabase → SQL Editor (of met `supabase db push`).

create table if not exists public.vragen (
  id            uuid primary key default gen_random_uuid(),
  aangemaakt_op timestamptz not null default now(),
  rol           text not null check (rol in ('stagegever', 'ouder', 'leerling', 'andere')),
  naam          text not null check (char_length(naam) between 1 and 200),
  email         text not null check (char_length(email) between 3 and 320 and email like '%@%'),
  telefoon      text check (char_length(telefoon) <= 50),
  organisatie   text check (char_length(organisatie) <= 200),
  klas          text check (char_length(klas) <= 50),
  leerling      text check (char_length(leerling) <= 200),
  onderwerp     text check (char_length(onderwerp) <= 200),
  vraag         text not null check (char_length(vraag) between 1 and 5000),
  antwoord_via  text not null default 'e-mail' check (antwoord_via in ('e-mail', 'telefoon')),
  -- opvolging door de stagebegeleiding
  status        text not null default 'nieuw' check (status in ('nieuw', 'in behandeling', 'beantwoord')),
  behandeld_door text,
  notitie       text
);

comment on table public.vragen is 'Vragen uit het contactformulier van retail2sale.com';

alter table public.vragen enable row level security;

-- Bezoekers mogen enkel invoegen (Supabase geeft dit niet altijd automatisch).
grant insert on public.vragen to anon;

-- Bezoekers (niet ingelogd) mogen enkel een nieuwe vraag toevoegen, nooit lezen of wijzigen.
drop policy if exists "bezoekers kunnen een vraag stellen" on public.vragen;
create policy "bezoekers kunnen een vraag stellen"
  on public.vragen
  for insert
  to anon
  with check (status = 'nieuw' and behandeld_door is null and notitie is null);

-- Lezen en opvolgen gebeurt voorlopig in het Supabase-dashboard (Table Editor).
-- Met fase 1 (inloggen voor begeleiders) komt hier een policy voor de rol begeleider.
