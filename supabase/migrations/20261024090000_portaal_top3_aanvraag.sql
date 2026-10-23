-- Leerlingportaal, deel 1: top 3 en aanvraag (24 oktober 2026).
--
-- Een leerling logt in (later met Smartschool, of met Microsoft) en wordt herkend aan de
-- Smartschool-gebruikersnaam in app_metadata (gezet door de Smartschool-login), anders aan het e-mailadres.
-- Een leerling ziet en schrijft enkel het eigen dossier. Beslissingen van de school staan apart in
-- stage.beoordelingen, zodat een leerling zichzelf nooit kan goedkeuren.
--
-- Uitvoeren in Supabase → SQL Editor, na 20261023120000_stage_beheer.sql en 20261023170000_blok_klassen.sql.

-- ---------------------------------------------------------------------------
-- Wie is de ingelogde leerling?
-- ---------------------------------------------------------------------------
create or replace function stage.mijn_leerling_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select l.id
  from stage.leerlingen l
  where l.status <> 'gestopt' and l.status <> 'verlaten'
    and (
      (l.smartschool_gebruikersnaam is not null
        and lower(l.smartschool_gebruikersnaam) = lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'smartschool_gebruikersnaam', '')))
      or (l.email is not null and l.email = lower(coalesce(auth.jwt() ->> 'email', '')))
    );
$$;

-- Hoort dit dossier bij de ingelogde leerling?
create or replace function stage.is_mijn_dossier(p_dossier uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from stage.dossiers d
    where d.id = p_dossier and d.leerling_id in (select stage.mijn_leerling_ids())
  );
$$;

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------
-- Gegevens die de leerling zelf aanvult (één keer per schooljaar, gedeeld door beide blokstages).
create table if not exists stage.leerling_profielen (
  leerling_id   uuid primary key references stage.leerlingen (id) on delete cascade,
  gegevens      jsonb not null default '{}'::jsonb,   -- gsm, straat, postcode, gemeente, ouder_naam, ouder_gsm, ouder_email, rijbewijs, talen, aandacht, toestemming
  gewijzigd_op  timestamptz not null default now()
);

-- Top 3: drie stageplaatsen in volgorde van voorkeur.
create table if not exists stage.top3 (
  dossier_id    uuid primary key references stage.dossiers (id) on delete cascade,
  keuzes        jsonb not null default '[]'::jsonb,  -- [{type: sales|onthaal, branche, winkel, adres, postcode, gemeente, web, contact, vervoer, motivatie}] × 3
  status        text not null default 'concept' check (status in ('concept', 'ingediend')),
  ingediend_op  timestamptz,
  gewijzigd_op  timestamptz not null default now()
);

-- Aanvraag: ingevuld door leerling en stagegever samen, vooraf ingevuld met de goedgekeurde keuze.
create table if not exists stage.aanvragen (
  dossier_id    uuid primary key references stage.dossiers (id) on delete cascade,
  keuze_nr      integer check (keuze_nr between 1 and 3),
  gegevens      jsonb not null default '{}'::jsonb,  -- stagiair, bedrijf, mentor, verantwoordelijke, werkvloer, akkoord
  status        text not null default 'concept' check (status in ('concept', 'ingediend')),
  ingediend_op  timestamptz,
  gewijzigd_op  timestamptz not null default now()
);

-- Beslissingen van de school per stap.
create table if not exists stage.beoordelingen (
  dossier_id    uuid not null references stage.dossiers (id) on delete cascade,
  stap          text not null check (stap in ('top3', 'aanvraag')),
  status        text not null check (status in ('goedgekeurd', 'aanpassen')),
  keuzes        integer[] not null default '{}',     -- top 3: goedgekeurde keuzes (1 of 2)
  feedback      text,
  op            timestamptz not null default now(),
  door          uuid references stage.begeleiders (id) on delete set null,
  primary key (dossier_id, stap)
);

-- Heeft de school deze stap van dit dossier goedgekeurd?
create or replace function stage.stap_goedgekeurd(p_dossier uuid, p_stap text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from stage.beoordelingen b
    where b.dossier_id = p_dossier and b.stap = p_stap and b.status = 'goedgekeurd'
  );
$$;

drop trigger if exists leerling_profielen_gewijzigd on stage.leerling_profielen;
create trigger leerling_profielen_gewijzigd before update on stage.leerling_profielen
  for each row execute function stage.zet_gewijzigd_op();
drop trigger if exists top3_gewijzigd on stage.top3;
create trigger top3_gewijzigd before update on stage.top3
  for each row execute function stage.zet_gewijzigd_op();
drop trigger if exists aanvragen_gewijzigd on stage.aanvragen;
create trigger aanvragen_gewijzigd before update on stage.aanvragen
  for each row execute function stage.zet_gewijzigd_op();

-- ---------------------------------------------------------------------------
-- Dossier openen voor de ingelogde leerling (zonder dat een leerling zelf dossiers mag aanmaken)
-- ---------------------------------------------------------------------------
create or replace function stage.mijn_dossier(p_blok uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_leerling uuid;
  v_klas text;
  v_dossier uuid;
begin
  select l.id, l.klas into v_leerling, v_klas
  from stage.leerlingen l
  join stage.blokken b on b.id = p_blok and b.schooljaar = l.schooljaar
  where l.id in (select stage.mijn_leerling_ids())
  limit 1;
  if v_leerling is null then
    return null;
  end if;
  if exists (select 1 from stage.blokken b where b.id = p_blok and b.klassen is not null and not (v_klas = any (b.klassen))) then
    return null; -- klas doet niet mee aan deze blokstage
  end if;
  insert into stage.dossiers (leerling_id, blok_id) values (v_leerling, p_blok)
  on conflict (leerling_id, blok_id) do nothing;
  select d.id into v_dossier from stage.dossiers d where d.leerling_id = v_leerling and d.blok_id = p_blok;
  return v_dossier;
end;
$$;

-- Stageplaatsen als suggestie in de top 3: enkel wie meewerkt, zonder notities, score of contactgegevens.
-- `bezet` = in die blokstage al zoveel leerlingen als max_stagiairs.
create or replace function stage.publieke_stageplaatsen(p_blok uuid)
returns table (naam text, straat text, postcode text, gemeente text, website text, sector text, bezet boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.naam, p.straat, p.postcode, p.gemeente, p.website, p.sector,
         (select count(*) from stage.dossiers d where d.blok_id = p_blok and d.stageplaats_id = p.id) >= greatest(p.max_stagiairs, 1)
  from stage.stageplaatsen p
  where p.status = 'actief'
    and (stage.is_begeleider() or exists (select 1 from stage.mijn_leerling_ids()))
  order by lower(p.naam);
$$;

-- Naam en adres van de stageplaats in een dossier (een leerling leest de tabel stageplaatsen zelf niet).
create or replace function stage.stageplaats_van_dossier(p_dossier uuid)
returns table (naam text, straat text, postcode text, gemeente text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.naam, p.straat, p.postcode, p.gemeente
  from stage.dossiers d join stage.stageplaatsen p on p.id = d.stageplaats_id
  where d.id = p_dossier and (stage.is_begeleider() or stage.is_mijn_dossier(p_dossier));
$$;

-- ---------------------------------------------------------------------------
-- Rechten
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on stage.leerling_profielen, stage.top3, stage.aanvragen, stage.beoordelingen to authenticated;
grant all on stage.leerling_profielen, stage.top3, stage.aanvragen, stage.beoordelingen to service_role;
grant execute on function stage.mijn_leerling_ids(), stage.is_mijn_dossier(uuid), stage.stap_goedgekeurd(uuid, text),
  stage.mijn_dossier(uuid), stage.publieke_stageplaatsen(uuid), stage.stageplaats_van_dossier(uuid) to authenticated;
revoke execute on function stage.mijn_dossier(uuid), stage.publieke_stageplaatsen(uuid), stage.stageplaats_van_dossier(uuid) from anon, public;

alter table stage.leerling_profielen enable row level security;
alter table stage.top3               enable row level security;
alter table stage.aanvragen          enable row level security;
alter table stage.beoordelingen      enable row level security;

-- Begeleiders: alles.
do $$
declare t text;
begin
  foreach t in array array['leerling_profielen', 'top3', 'aanvragen', 'beoordelingen'] loop
    execute format('drop policy if exists "begeleiders beheren" on stage.%I', t);
    execute format(
      'create policy "begeleiders beheren" on stage.%I for all to authenticated
         using (stage.is_begeleider()) with check (stage.is_begeleider())', t);
  end loop;
end $$;

-- Leerling: eigen fiche, eigen dossiers, blokstages en uitzonderingen lezen.
drop policy if exists "leerling leest zichzelf" on stage.leerlingen;
create policy "leerling leest zichzelf" on stage.leerlingen
  for select to authenticated using (id in (select stage.mijn_leerling_ids()));
drop policy if exists "leerling leest eigen dossiers" on stage.dossiers;
create policy "leerling leest eigen dossiers" on stage.dossiers
  for select to authenticated using (leerling_id in (select stage.mijn_leerling_ids()));
drop policy if exists "ingelogd leest blokstages" on stage.blokken;
create policy "ingelogd leest blokstages" on stage.blokken
  for select to authenticated using (true);
drop policy if exists "ingelogd leest uitzonderingen" on stage.uitzonderingen;
create policy "ingelogd leest uitzonderingen" on stage.uitzonderingen
  for select to authenticated using (true);

-- Leerling: eigen profiel lezen en aanvullen.
drop policy if exists "leerling eigen profiel" on stage.leerling_profielen;
create policy "leerling eigen profiel" on stage.leerling_profielen
  for all to authenticated
  using (leerling_id in (select stage.mijn_leerling_ids()))
  with check (leerling_id in (select stage.mijn_leerling_ids()));

-- Leerling: top 3 lezen; schrijven zolang ze een concept is (na "aanpassing gevraagd" zet de school ze terug op concept).
drop policy if exists "leerling leest top3" on stage.top3;
create policy "leerling leest top3" on stage.top3
  for select to authenticated using (stage.is_mijn_dossier(dossier_id));
drop policy if exists "leerling maakt top3" on stage.top3;
create policy "leerling maakt top3" on stage.top3
  for insert to authenticated
  with check (stage.is_mijn_dossier(dossier_id) and not stage.stap_goedgekeurd(dossier_id, 'top3'));
drop policy if exists "leerling wijzigt top3" on stage.top3;
create policy "leerling wijzigt top3" on stage.top3
  for update to authenticated
  using (stage.is_mijn_dossier(dossier_id) and status = 'concept' and not stage.stap_goedgekeurd(dossier_id, 'top3'))
  with check (stage.is_mijn_dossier(dossier_id) and not stage.stap_goedgekeurd(dossier_id, 'top3'));

-- Leerling: aanvraag pas na goedkeuring van de top 3; zelfde regels.
drop policy if exists "leerling leest aanvraag" on stage.aanvragen;
create policy "leerling leest aanvraag" on stage.aanvragen
  for select to authenticated using (stage.is_mijn_dossier(dossier_id));
drop policy if exists "leerling maakt aanvraag" on stage.aanvragen;
create policy "leerling maakt aanvraag" on stage.aanvragen
  for insert to authenticated
  with check (stage.is_mijn_dossier(dossier_id) and stage.stap_goedgekeurd(dossier_id, 'top3')
              and not stage.stap_goedgekeurd(dossier_id, 'aanvraag'));
drop policy if exists "leerling wijzigt aanvraag" on stage.aanvragen;
create policy "leerling wijzigt aanvraag" on stage.aanvragen
  for update to authenticated
  using (stage.is_mijn_dossier(dossier_id) and status = 'concept' and stage.stap_goedgekeurd(dossier_id, 'top3')
         and not stage.stap_goedgekeurd(dossier_id, 'aanvraag'))
  with check (stage.is_mijn_dossier(dossier_id) and not stage.stap_goedgekeurd(dossier_id, 'aanvraag'));

-- Leerling: beslissingen van de school lezen (niet schrijven).
drop policy if exists "leerling leest beoordelingen" on stage.beoordelingen;
create policy "leerling leest beoordelingen" on stage.beoordelingen
  for select to authenticated using (stage.is_mijn_dossier(dossier_id));

notify pgrst, 'reload schema';
