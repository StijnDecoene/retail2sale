-- Werkrooster: stagegever en stagiair plannen samen de stagedagen, de school keurt goed.
-- Uit te voeren in de SQL Editor van Supabase (project SNH3), na 20261025090000_contract.sql. Mag meermaals uitgevoerd worden.
--
-- Wie kan het rooster invullen?
--   - de stagegever, via dezelfde persoonlijke link als het contract (/rooster/<link>);
--   - de stagiair, in het portaal;
--   - de stagebegeleiding, in het beheer.
-- Indienen kan pas met de naam van de stagegever en zijn bevestiging. Daarna keurt de school goed of stuurt terug.
-- Een goedgekeurd rooster kan later gewijzigd worden: het goedgekeurde rooster blijft gelden (kolom `vorige`)
-- tot de wijziging opnieuw is goedgekeurd.

create table if not exists stage.roosters (
  dossier_id      uuid primary key references stage.dossiers (id) on delete cascade,
  dagen           jsonb not null default '{}'::jsonb,   -- {"2026-11-03": {"aan": "08:00", "ver": "17:00", "pau": 60}, ...}
  opmerkingen     text,
  totaal_min      integer not null default 0,
  status          text not null default 'concept' check (status in ('concept', 'ingediend', 'goedgekeurd', 'terug')),
  ingediend_op    timestamptz,
  ingediend_door  text,                                 -- stagegever | stagiair | school
  bevestiging     jsonb,                                -- {naam, at, vakAkkoord}
  feedback        text,                                 -- uitleg van de school bij terugsturen of goedkeuren
  goedgekeurd_op  timestamptz,
  goedgekeurd_door uuid references stage.begeleiders (id) on delete set null,
  vorige          jsonb,                                -- goedgekeurde versie zolang een wijziging loopt
  heropend_op     timestamptz,
  historiek       jsonb not null default '[]'::jsonb,   -- [{goedgekeurd_op, totaal_min, gewijzigd_op}]
  gewijzigd_op    timestamptz not null default now(),
  gewijzigd_door  text
);

drop trigger if exists roosters_gewijzigd on stage.roosters;
create trigger roosters_gewijzigd before update on stage.roosters
  for each row execute function stage.zet_gewijzigd_op();

alter table stage.roosters enable row level security;
grant select, insert, update, delete on stage.roosters to authenticated;
grant all on stage.roosters to service_role;
drop policy if exists "begeleiders beheren" on stage.roosters;
create policy "begeleiders beheren" on stage.roosters
  for all to authenticated using (stage.is_begeleider()) with check (stage.is_begeleider());

-- ---------------------------------------------------------------------------
-- Wie vraagt het rooster op? Stagegever (link), stagiair (eigen dossier) of school (begeleider).
-- Het rooster opent pas als het contract klaarstaat (dus na de goedgekeurde aanvraag).
-- ---------------------------------------------------------------------------
create or replace function stage.rooster_wie(p_token text, p_dossier uuid)
returns table (dossier uuid, wie text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_d uuid; v_wie text;
begin
  if p_token is not null and length(p_token) >= 30 then
    select p.dossier_id into v_d from stage.contract_partijen p where p.token = p_token and p.rol = 'stagegever';
    if v_d is not null then v_wie := 'stagegever'; end if;
  elsif p_dossier is not null then
    if stage.is_begeleider() then v_d := p_dossier; v_wie := 'school';
    elsif stage.is_mijn_dossier(p_dossier) then v_d := p_dossier; v_wie := 'stagiair';
    end if;
  end if;
  if v_d is null or not exists (select 1 from stage.contracten c where c.dossier_id = v_d) then return; end if;
  return query select v_d, v_wie;
end;
$$;

-- Alles wat de roosterpagina nodig heeft.
create or replace function stage.rooster_laden(p_token text, p_dossier uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_d uuid; v_wie text; v_uit jsonb;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.rooster_wie(p_token, p_dossier) w;
  if v_d is null then return null; end if;
  select jsonb_build_object(
    'wie', v_wie,
    'dossier_id', d.id,
    'rooster', (select to_jsonb(r) - 'goedgekeurd_door' from stage.roosters r where r.dossier_id = d.id),
    'meerderjarig', c.meerderjarig,
    'leerling', jsonb_build_object('voornaam', l.voornaam, 'naam', l.naam, 'klas', l.klas),
    'blok', jsonb_build_object('naam', b.naam, 'code', b.code, 'schooljaar', b.schooljaar, 'start_datum', b.start_datum,
                               'eind_datum', b.eind_datum, 'uren', b.uren, 'uren_per_week', b.uren_per_week),
    'uitzonderingen', (
      select coalesce(jsonb_agg(jsonb_build_object('van', u.van, 'tot', u.tot, 'naam', u.naam, 'soort', u.soort) order by u.van), '[]'::jsonb)
      from stage.uitzonderingen u where u.blok_id = b.id
    ),
    'stagegever', jsonb_build_object(
      'winkel', coalesce(nullif(c.gegevens->>'winkel_naam', ''), a.gegevens->'bedrijf'->>'naam'),
      'naam', coalesce(nullif(c.gegevens->>'ondertekenaar', ''), nullif(c.gegevens->>'mentor', ''), a.gegevens->'mentor'->>'naam'),
      'mentor', coalesce(nullif(c.gegevens->>'mentor', ''), a.gegevens->'mentor'->>'naam')
    ),
    'startuur', a.gegevens->'werkvloer'->>'startuur'
  ) into v_uit
  from stage.dossiers d
  join stage.contracten c on c.dossier_id = d.id
  join stage.leerlingen l on l.id = d.leerling_id
  join stage.blokken b on b.id = d.blok_id
  left join stage.aanvragen a on a.dossier_id = d.id
  where d.id = v_d;
  return v_uit;
end;
$$;

-- Bewaren als concept (of na terugsturen). Niet tijdens het nakijken en niet als het goedgekeurd is.
create or replace function stage.rooster_bewaren(p_token text, p_dossier uuid, p_dagen jsonb, p_opmerkingen text, p_totaal integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_d uuid; v_wie text; v_r stage.roosters;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.rooster_wie(p_token, p_dossier) w;
  if v_d is null then return 'onbekend'; end if;
  if jsonb_typeof(p_dagen) <> 'object' or length(p_dagen::text) > 50000 then return 'ongeldig'; end if;
  select * into v_r from stage.roosters where dossier_id = v_d;
  if found and v_r.status in ('ingediend', 'goedgekeurd') then return 'vergrendeld'; end if;
  insert into stage.roosters (dossier_id, dagen, opmerkingen, totaal_min, gewijzigd_door)
  values (v_d, p_dagen, left(p_opmerkingen, 2000), coalesce(p_totaal, 0), v_wie)
  on conflict (dossier_id) do update
    set dagen = excluded.dagen, opmerkingen = excluded.opmerkingen, totaal_min = excluded.totaal_min, gewijzigd_door = excluded.gewijzigd_door;
  return 'ok';
end;
$$;

-- Indienen: bewaren en bevestigen met de naam van de stagegever.
create or replace function stage.rooster_indienen(p_token text, p_dossier uuid, p_dagen jsonb, p_opmerkingen text, p_totaal integer,
                                                  p_naam text, p_vak_akkoord boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_d uuid; v_wie text; v_uit text;
begin
  if coalesce(trim(p_naam), '') = '' then return 'naam'; end if;
  v_uit := stage.rooster_bewaren(p_token, p_dossier, p_dagen, p_opmerkingen, p_totaal);
  if v_uit <> 'ok' then return v_uit; end if;
  select w.dossier, w.wie into v_d, v_wie from stage.rooster_wie(p_token, p_dossier) w;
  update stage.roosters
     set status = 'ingediend', ingediend_op = now(), ingediend_door = v_wie,
         bevestiging = jsonb_build_object('naam', trim(p_naam), 'at', now(), 'vakAkkoord', coalesce(p_vak_akkoord, false))
   where dossier_id = v_d;
  return 'ok';
end;
$$;

-- Indiening intrekken zolang de school niet heeft beslist.
create or replace function stage.rooster_intrekken(p_token text, p_dossier uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_d uuid; v_wie text;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.rooster_wie(p_token, p_dossier) w;
  if v_d is null then return 'onbekend'; end if;
  update stage.roosters set status = 'concept', ingediend_op = null, bevestiging = null, gewijzigd_door = v_wie
   where dossier_id = v_d and status = 'ingediend';
  return case when found then 'ok' else 'niet_ingediend' end;
end;
$$;

-- Een goedgekeurd rooster wijzigen: het goedgekeurde rooster blijft gelden tot de wijziging is goedgekeurd.
create or replace function stage.rooster_aanpassen(p_token text, p_dossier uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_d uuid; v_wie text;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.rooster_wie(p_token, p_dossier) w;
  if v_d is null then return 'onbekend'; end if;
  update stage.roosters
     set vorige = jsonb_build_object('dagen', dagen, 'opmerkingen', opmerkingen, 'totaal_min', totaal_min, 'ingediend_op', ingediend_op,
                                     'bevestiging', bevestiging, 'goedgekeurd_op', goedgekeurd_op),
         status = 'concept', heropend_op = now(), ingediend_op = null, bevestiging = null, feedback = null, gewijzigd_door = v_wie
   where dossier_id = v_d and status = 'goedgekeurd';
  return case when found then 'ok' else 'niet_goedgekeurd' end;
end;
$$;

-- Een lopende wijziging annuleren: het goedgekeurde rooster geldt opnieuw.
create or replace function stage.rooster_annuleren(p_token text, p_dossier uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_d uuid; v_wie text;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.rooster_wie(p_token, p_dossier) w;
  if v_d is null then return 'onbekend'; end if;
  update stage.roosters
     set dagen = vorige->'dagen', opmerkingen = vorige->>'opmerkingen', totaal_min = (vorige->>'totaal_min')::integer,
         ingediend_op = (vorige->>'ingediend_op')::timestamptz, bevestiging = vorige->'bevestiging',
         goedgekeurd_op = (vorige->>'goedgekeurd_op')::timestamptz, status = 'goedgekeurd', vorige = null, heropend_op = null,
         feedback = null, gewijzigd_door = v_wie
   where dossier_id = v_d and vorige is not null and status in ('concept', 'terug');
  return case when found then 'ok' else 'geen_wijziging' end;
end;
$$;

-- Rechten: ingelogd (stagiair, begeleider) en bezoekers met een link (stagegever).
revoke execute on function stage.rooster_wie(text, uuid) from public, anon, authenticated;
grant execute on function
  stage.rooster_laden(text, uuid),
  stage.rooster_bewaren(text, uuid, jsonb, text, integer),
  stage.rooster_indienen(text, uuid, jsonb, text, integer, text, boolean),
  stage.rooster_intrekken(text, uuid),
  stage.rooster_aanpassen(text, uuid),
  stage.rooster_annuleren(text, uuid)
to anon, authenticated, service_role;
revoke execute on function
  stage.rooster_laden(text, uuid),
  stage.rooster_bewaren(text, uuid, jsonb, text, integer),
  stage.rooster_indienen(text, uuid, jsonb, text, integer, text, boolean),
  stage.rooster_intrekken(text, uuid),
  stage.rooster_aanpassen(text, uuid),
  stage.rooster_annuleren(text, uuid)
from public;

notify pgrst, 'reload schema';
