-- Tijdens de stage: afwezigheden en inhaalstage.
-- Uit te voeren in de SQL Editor van Supabase (project SNH3), na 20261026090000_werkrooster.sql. Mag meermaals uitgevoerd worden.
--
-- Stagiair (portaal) en stagegever (persoonlijke link) melden afwezigheden en plannen inhaalstage.
-- Enkel de stagegever (of de school) bevestigt na afloop dat een inhaalstage gepresteerd is.
-- De school beslist per afwezigheid of ze gewettigd is (een gewettigde afwezigheid moet niet worden ingehaald).

create table if not exists stage.afwezigheden (
  id             uuid primary key default gen_random_uuid(),
  dossier_id     uuid not null references stage.dossiers (id) on delete cascade,
  datum          date not null,
  soort          text not null check (soort in ('hele', 'deel')),
  aan            text,                                   -- bij 'deel': aangekomen om
  ver            text,                                   -- bij 'deel': vertrokken om
  gemist_min     integer not null check (gemist_min between 0 and 1440),
  gepland        jsonb,                                  -- rooster van die dag {aan, ver, pau, min}
  auto           boolean not null default false,         -- gemiste uren uit het rooster (niet aangepast)
  reden          text not null,
  opm            text,
  door           text not null check (door in ('stagiair', 'stagegever', 'school')),
  naam           text,
  op             timestamptz not null default now(),
  gewettigd      boolean,                                -- null = nog niet beoordeeld
  gewettigd_op   timestamptz,
  gewettigd_door uuid references stage.begeleiders (id) on delete set null,
  unique (dossier_id, datum)
);

create table if not exists stage.inhaalmomenten (
  id          uuid primary key default gen_random_uuid(),
  dossier_id  uuid not null references stage.dossiers (id) on delete cascade,
  datum       date not null,
  aan         text not null,
  ver         text not null,
  pau         integer not null default 0 check (pau between 0 and 240),
  min         integer not null check (min between 0 and 1440),
  afw         uuid[] not null default '{}',              -- gekoppelde afwezigheden
  opm         text,
  door        text not null check (door in ('stagiair', 'stagegever', 'school')),
  naam        text,
  op          timestamptz not null default now(),
  status      text not null default 'gepland' check (status in ('gepland', 'ingehaald', 'geannuleerd')),
  bev         jsonb,                                     -- {naam, at, aan, ver, pau, min}: bevestiging door de stagegever
  annul       jsonb                                      -- {door, naam, at}
);
create index if not exists afwezigheden_dossier on stage.afwezigheden (dossier_id, datum);
create index if not exists inhaalmomenten_dossier on stage.inhaalmomenten (dossier_id, datum);

alter table stage.afwezigheden   enable row level security;
alter table stage.inhaalmomenten enable row level security;
grant select, insert, update, delete on stage.afwezigheden, stage.inhaalmomenten to authenticated;
grant all on stage.afwezigheden, stage.inhaalmomenten to service_role;
do $$
declare t text;
begin
  foreach t in array array['afwezigheden', 'inhaalmomenten'] loop
    execute format('drop policy if exists "begeleiders beheren" on stage.%I', t);
    execute format(
      'create policy "begeleiders beheren" on stage.%I for all to authenticated
         using (stage.is_begeleider()) with check (stage.is_begeleider())', t);
  end loop;
end $$;

-- Alles over afwezigheden en inhaalstage van één dossier (zelfde toegang als het werkrooster).
create or replace function stage.tijdens_laden(p_token text, p_dossier uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_d uuid; v_wie text;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.rooster_wie(p_token, p_dossier) w;
  if v_d is null then return null; end if;
  return jsonb_build_object(
    'wie', v_wie,
    'afwezigheden', (select coalesce(jsonb_agg(to_jsonb(a) - 'gewettigd_door' order by a.datum), '[]'::jsonb) from stage.afwezigheden a where a.dossier_id = v_d),
    'inhaal', (select coalesce(jsonb_agg(to_jsonb(i) order by i.datum, i.aan), '[]'::jsonb) from stage.inhaalmomenten i where i.dossier_id = v_d)
  );
end;
$$;

-- Afwezigheid melden (één per dag).
create or replace function stage.afwezigheid_melden(
  p_token text, p_dossier uuid, p_datum date, p_soort text, p_aan text, p_ver text, p_gemist integer,
  p_gepland jsonb, p_auto boolean, p_reden text, p_opm text, p_naam text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_d uuid; v_wie text;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.rooster_wie(p_token, p_dossier) w;
  if v_d is null then return 'onbekend'; end if;
  if coalesce(trim(p_reden), '') = '' then return 'reden'; end if;
  if exists (select 1 from stage.afwezigheden where dossier_id = v_d and datum = p_datum) then return 'dubbel'; end if;
  insert into stage.afwezigheden (dossier_id, datum, soort, aan, ver, gemist_min, gepland, auto, reden, opm, door, naam)
  values (v_d, p_datum, p_soort, p_aan, p_ver, p_gemist, p_gepland, coalesce(p_auto, false), left(trim(p_reden), 100), left(p_opm, 1000), v_wie, left(trim(p_naam), 200));
  return 'ok';
end;
$$;

-- Een melding verwijderen: zolang de school niet besliste en er geen bevestigde inhaalstage aan gekoppeld is.
create or replace function stage.afwezigheid_verwijderen(p_token text, p_dossier uuid, p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_d uuid; v_wie text;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.rooster_wie(p_token, p_dossier) w;
  if v_d is null then return 'onbekend'; end if;
  if exists (select 1 from stage.afwezigheden where id = p_id and dossier_id = v_d and gewettigd is not null) then return 'beoordeeld'; end if;
  if exists (select 1 from stage.inhaalmomenten where dossier_id = v_d and status = 'ingehaald' and p_id = any (afw)) then return 'ingehaald'; end if;
  delete from stage.afwezigheden where id = p_id and dossier_id = v_d;
  if not found then return 'onbekend'; end if;
  update stage.inhaalmomenten set afw = array_remove(afw, p_id) where dossier_id = v_d and p_id = any (afw);
  return 'ok';
end;
$$;

-- Inhaalstage plannen, gekoppeld aan nul of meer afwezigheden van hetzelfde dossier.
create or replace function stage.inhaal_plannen(
  p_token text, p_dossier uuid, p_datum date, p_aan text, p_ver text, p_pau integer, p_min integer,
  p_afw uuid[], p_opm text, p_naam text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_d uuid; v_wie text;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.rooster_wie(p_token, p_dossier) w;
  if v_d is null then return 'onbekend'; end if;
  if exists (select 1 from unnest(coalesce(p_afw, '{}')) x where x not in (select id from stage.afwezigheden where dossier_id = v_d)) then
    return 'koppeling';
  end if;
  insert into stage.inhaalmomenten (dossier_id, datum, aan, ver, pau, min, afw, opm, door, naam)
  values (v_d, p_datum, p_aan, p_ver, coalesce(p_pau, 0), p_min, coalesce(p_afw, '{}'), left(p_opm, 1000), v_wie, left(trim(p_naam), 200));
  return 'ok';
end;
$$;

-- Koppeling van een inhaalstage aanpassen (zolang ze niet geannuleerd is).
create or replace function stage.inhaal_koppelen(p_token text, p_dossier uuid, p_id uuid, p_afw uuid[])
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_d uuid; v_wie text;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.rooster_wie(p_token, p_dossier) w;
  if v_d is null then return 'onbekend'; end if;
  if exists (select 1 from unnest(coalesce(p_afw, '{}')) x where x not in (select id from stage.afwezigheden where dossier_id = v_d)) then
    return 'koppeling';
  end if;
  update stage.inhaalmomenten set afw = coalesce(p_afw, '{}') where id = p_id and dossier_id = v_d and status <> 'geannuleerd';
  return case when found then 'ok' else 'onbekend' end;
end;
$$;

-- Bevestigen dat de inhaalstage gepresteerd is: enkel de stagegever (of de school), vanaf de dag zelf.
create or replace function stage.inhaal_bevestigen(p_token text, p_dossier uuid, p_id uuid, p_naam text, p_aan text, p_ver text, p_pau integer, p_min integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_d uuid; v_wie text;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.rooster_wie(p_token, p_dossier) w;
  if v_d is null then return 'onbekend'; end if;
  if v_wie = 'stagiair' then return 'geen_rechten'; end if;
  if coalesce(trim(p_naam), '') = '' then return 'naam'; end if;
  update stage.inhaalmomenten
     set status = 'ingehaald',
         bev = jsonb_build_object('naam', left(trim(p_naam), 200), 'at', now(), 'aan', p_aan, 'ver', p_ver, 'pau', coalesce(p_pau, 0), 'min', p_min, 'door', v_wie)
   where id = p_id and dossier_id = v_d and status = 'gepland' and datum <= (now() at time zone 'Europe/Brussels')::date;
  return case when found then 'ok' else 'niet_mogelijk' end;
end;
$$;

-- Niet doorgegaan / niet meer nodig.
create or replace function stage.inhaal_annuleren(p_token text, p_dossier uuid, p_id uuid, p_naam text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_d uuid; v_wie text;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.rooster_wie(p_token, p_dossier) w;
  if v_d is null then return 'onbekend'; end if;
  update stage.inhaalmomenten
     set status = 'geannuleerd', annul = jsonb_build_object('door', v_wie, 'naam', left(trim(coalesce(p_naam, '')), 200), 'at', now())
   where id = p_id and dossier_id = v_d and status = 'gepland';
  return case when found then 'ok' else 'niet_mogelijk' end;
end;
$$;

revoke execute on function
  stage.tijdens_laden(text, uuid),
  stage.afwezigheid_melden(text, uuid, date, text, text, text, integer, jsonb, boolean, text, text, text),
  stage.afwezigheid_verwijderen(text, uuid, uuid),
  stage.inhaal_plannen(text, uuid, date, text, text, integer, integer, uuid[], text, text),
  stage.inhaal_koppelen(text, uuid, uuid, uuid[]),
  stage.inhaal_bevestigen(text, uuid, uuid, text, text, text, integer, integer),
  stage.inhaal_annuleren(text, uuid, uuid, text)
from public;
grant execute on function
  stage.tijdens_laden(text, uuid),
  stage.afwezigheid_melden(text, uuid, date, text, text, text, integer, jsonb, boolean, text, text, text),
  stage.afwezigheid_verwijderen(text, uuid, uuid),
  stage.inhaal_plannen(text, uuid, date, text, text, integer, integer, uuid[], text, text),
  stage.inhaal_koppelen(text, uuid, uuid, uuid[]),
  stage.inhaal_bevestigen(text, uuid, uuid, text, text, text, integer, integer),
  stage.inhaal_annuleren(text, uuid, uuid, text)
to anon, authenticated, service_role;

notify pgrst, 'reload schema';
