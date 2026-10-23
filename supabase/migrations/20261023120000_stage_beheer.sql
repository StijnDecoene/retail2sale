-- Stageplatform Retail2Sale – fase 1, deel 1: beheer voor de school.
-- Alles staat in een eigen schema `stage`, zodat het niet botst met andere tabellen
-- in hetzelfde Supabase-project (bv. public.leerlingen van een andere toepassing).
--
-- Na het uitvoeren: Supabase → Integrations → Data API → Settings → Exposed schemas: voeg `stage` toe.

create schema if not exists stage;

-- ---------------------------------------------------------------------------
-- Begeleiders: wie mag het beheer gebruiken
-- ---------------------------------------------------------------------------
create table if not exists stage.begeleiders (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique check (email = lower(email) and email like '%@%'),
  naam          text not null,
  rol           text not null default 'begeleider' check (rol in ('begeleider', 'beheerder', 'directie')),
  telefoon      text,
  kleur         text default '#1D5BAA',
  actief        boolean not null default true,
  aangemaakt_op timestamptz not null default now()
);

-- Is de ingelogde gebruiker een actieve begeleider? (security definer: leest begeleiders zonder RLS-lus)
create or replace function stage.is_begeleider()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from stage.begeleiders b
    where b.actief and b.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Beheerder of directie: mag begeleiders toevoegen en rechten wijzigen.
create or replace function stage.is_beheerder()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from stage.begeleiders b
    where b.actief and b.rol in ('beheerder', 'directie') and b.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------------------
-- Blokstages en uitzonderingen
-- ---------------------------------------------------------------------------
create table if not exists stage.blokken (
  id            uuid primary key default gen_random_uuid(),
  schooljaar    text not null check (schooljaar ~ '^\d{4}-\d{4}$'),
  code          text not null check (code in ('b1', 'b2')),
  naam          text not null,
  start_datum   date not null,
  eind_datum    date not null check (eind_datum >= start_datum),
  uren          integer not null default 120 check (uren > 0),
  uren_per_week integer not null default 24 check (uren_per_week > 0),
  deadline_top3 date,
  unique (schooljaar, code)
);

create table if not exists stage.uitzonderingen (
  id      uuid primary key default gen_random_uuid(),
  blok_id uuid not null references stage.blokken (id) on delete cascade,
  van     date not null,
  tot     date not null check (tot >= van),
  naam    text not null,
  soort   text not null check (soort in ('vakantie', 'vm', 'geen'))
);

-- ---------------------------------------------------------------------------
-- Stageplaatsen (over alle schooljaren heen)
-- ---------------------------------------------------------------------------
create table if not exists stage.stageplaatsen (
  id              uuid primary key default gen_random_uuid(),
  naam            text not null,
  juridische_naam text,
  kbo             text,
  sector          text,
  status          text not null default 'actief' check (status in ('actief', 'pauze', 'stop')),
  straat          text,
  postcode        text,
  gemeente        text,
  telefoon        text,
  email           text,
  website         text,
  contactpersoon  text,
  max_stagiairs   integer not null default 1 check (max_stagiairs between 0 and 20),
  beoordeling     integer check (beoordeling between 1 and 5),
  notities        text,
  aangemaakt_op   timestamptz not null default now(),
  gewijzigd_op    timestamptz not null default now()
);
create index if not exists stageplaatsen_naam_idx on stage.stageplaatsen (lower(naam));

-- ---------------------------------------------------------------------------
-- Leerlingen (fiche per schooljaar, uit de klaslijst van Smartschool)
-- ---------------------------------------------------------------------------
create table if not exists stage.leerlingen (
  id                        uuid primary key default gen_random_uuid(),
  schooljaar                text not null check (schooljaar ~ '^\d{4}-\d{4}$'),
  voornaam                  text not null,
  naam                      text not null,
  klas                      text not null,
  smartschool_gebruikersnaam text,
  email                     text check (email is null or email = lower(email)),
  gsm                       text,
  status                    text not null default 'actief'
                              check (status in ('actief', 'ziek', 'vrijgesteld', 'verlaten', 'gestopt')),
  status_van                date,
  status_tot                date,
  notities                  text,
  aangemaakt_op             timestamptz not null default now(),
  gewijzigd_op              timestamptz not null default now()
);
create unique index if not exists leerlingen_ss_uniek
  on stage.leerlingen (schooljaar, lower(smartschool_gebruikersnaam))
  where smartschool_gebruikersnaam is not null;
create index if not exists leerlingen_jaar_klas_idx on stage.leerlingen (schooljaar, klas, naam);

-- ---------------------------------------------------------------------------
-- Dossiers: één per leerling per blokstage
-- ---------------------------------------------------------------------------
create table if not exists stage.dossiers (
  id              uuid primary key default gen_random_uuid(),
  leerling_id     uuid not null references stage.leerlingen (id) on delete cascade,
  blok_id         uuid not null references stage.blokken (id) on delete restrict,
  stageplaats_id  uuid references stage.stageplaatsen (id) on delete set null,
  begeleider_id   uuid references stage.begeleiders (id) on delete set null,
  mentor_naam     text,
  mentor_telefoon text,
  mentor_email    text,
  aangemaakt_op   timestamptz not null default now(),
  gewijzigd_op    timestamptz not null default now(),
  unique (leerling_id, blok_id)
);

-- gewijzigd_op bijhouden
create or replace function stage.zet_gewijzigd_op()
returns trigger language plpgsql as $$
begin
  new.gewijzigd_op := now();
  return new;
end;
$$;

drop trigger if exists stageplaatsen_gewijzigd on stage.stageplaatsen;
create trigger stageplaatsen_gewijzigd before update on stage.stageplaatsen
  for each row execute function stage.zet_gewijzigd_op();
drop trigger if exists leerlingen_gewijzigd on stage.leerlingen;
create trigger leerlingen_gewijzigd before update on stage.leerlingen
  for each row execute function stage.zet_gewijzigd_op();
drop trigger if exists dossiers_gewijzigd on stage.dossiers;
create trigger dossiers_gewijzigd before update on stage.dossiers
  for each row execute function stage.zet_gewijzigd_op();

-- ---------------------------------------------------------------------------
-- Rechten: enkel actieve begeleiders, en niets voor bezoekers (anon)
-- ---------------------------------------------------------------------------
grant usage on schema stage to authenticated, service_role;
grant select, insert, update, delete on all tables in schema stage to authenticated;
grant all on all tables in schema stage to service_role;
grant execute on function stage.is_begeleider(), stage.is_beheerder() to authenticated;
alter default privileges in schema stage grant select, insert, update, delete on tables to authenticated;
revoke all on schema stage from anon;

alter table stage.begeleiders    enable row level security;
alter table stage.blokken        enable row level security;
alter table stage.uitzonderingen enable row level security;
alter table stage.stageplaatsen  enable row level security;
alter table stage.leerlingen     enable row level security;
alter table stage.dossiers       enable row level security;

-- Begeleiders: alle begeleiders lezen; enkel beheerders (of directie) voegen toe of passen aan.
drop policy if exists "begeleiders lezen" on stage.begeleiders;
create policy "begeleiders lezen" on stage.begeleiders
  for select to authenticated using (stage.is_begeleider());
drop policy if exists "beheerders beheren begeleiders" on stage.begeleiders;
create policy "beheerders beheren begeleiders" on stage.begeleiders
  for all to authenticated using (stage.is_beheerder()) with check (stage.is_beheerder());

-- Overige tabellen: elke actieve begeleider leest en schrijft.
do $$
declare t text;
begin
  foreach t in array array['blokken', 'uitzonderingen', 'stageplaatsen', 'leerlingen', 'dossiers'] loop
    execute format('drop policy if exists "begeleiders beheren" on stage.%I', t);
    execute format(
      'create policy "begeleiders beheren" on stage.%I for all to authenticated
         using (stage.is_begeleider()) with check (stage.is_begeleider())', t);
  end loop;
end $$;

-- Vragen uit het contactformulier: begeleiders lezen en volgen op.
drop policy if exists "begeleiders lezen vragen" on public.vragen;
create policy "begeleiders lezen vragen" on public.vragen
  for select to authenticated using (stage.is_begeleider());
drop policy if exists "begeleiders volgen vragen op" on public.vragen;
create policy "begeleiders volgen vragen op" on public.vragen
  for update to authenticated using (stage.is_begeleider()) with check (stage.is_begeleider());
grant select, update on public.vragen to authenticated;
grant insert on public.vragen to anon;

-- ---------------------------------------------------------------------------
-- Startgegevens 2026-2027
-- ---------------------------------------------------------------------------
insert into stage.begeleiders (email, naam, rol, telefoon, kleur) values
  ('stijn.decoene@snh.be', 'Stijn Decoene', 'beheerder', '0479 28 85 07', '#0F7C8C'),
  ('fien.claeys@snh.be',   'Fien Claeys',   'begeleider', '0498 64 48 89', '#8A3FFC')
on conflict (email) do nothing;

insert into stage.blokken (schooljaar, code, naam, start_datum, eind_datum, uren, uren_per_week, deadline_top3) values
  ('2026-2027', 'b1', 'Blokstage 1', '2026-10-13', '2026-11-21', 120, 24, '2026-09-25'),
  ('2026-2027', 'b2', 'Blokstage 2', '2027-05-04', '2027-06-12', 120, 20, '2027-02-26')
on conflict (schooljaar, code) do nothing;

insert into stage.uitzonderingen (blok_id, van, tot, naam, soort)
select b.id, u.van::date, u.tot::date, u.naam, u.soort
from stage.blokken b
join (values
  ('b1', '2026-11-02', '2026-11-08', 'Herfstvakantie', 'vakantie'),
  ('b1', '2026-11-11', '2026-11-11', 'Wapenstilstand (feestdag)', 'vakantie'),
  ('b1', '2026-11-12', '2026-11-12', 'Geen stage in de voormiddag', 'vm'),
  ('b2', '2027-05-06', '2027-05-06', 'Hemelvaartsdag (feestdag)', 'vakantie')
) as u (code, van, tot, naam, soort) on u.code = b.code
where b.schooljaar = '2026-2027'
  and not exists (select 1 from stage.uitzonderingen x where x.blok_id = b.id and x.van = u.van::date and x.naam = u.naam);
