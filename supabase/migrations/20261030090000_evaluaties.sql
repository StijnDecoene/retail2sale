-- Evaluaties: stagementor (via de persoonlijke link), stagebegeleider (bezoekformulier) en zelfevaluatie van de stagiair.
-- Uit te voeren in de SQL Editor van Supabase (project SNH3), na 20261029090000_bezoeken.sql. Mag meermaals uitgevoerd worden.
--
-- De stagiair ziet de evaluatie van de mentor en die van de school pas wanneer de stagebegeleiding ze openstelt.

create table if not exists stage.evaluaties (
  dossier_id    uuid not null references stage.dossiers (id) on delete cascade,
  soort         text not null check (soort in ('mentor', 'school', 'zelf')),
  antwoorden    jsonb not null default '{}'::jsonb,
  status        text not null default 'concept' check (status in ('concept', 'ingediend')),
  naam          text,                       -- wie vulde in
  ingediend_op  timestamptz,
  gewijzigd_op  timestamptz not null default now(),
  primary key (dossier_id, soort)
);

-- Beslissing van de school: eindpunt en openstellen voor de stagiair.
create table if not exists stage.evaluatie_resultaten (
  dossier_id      uuid primary key references stage.dossiers (id) on delete cascade,
  eindpunt        numeric(5, 1),
  opmerking       text,
  vrijgegeven_op  timestamptz,
  vrijgegeven_door uuid references stage.begeleiders (id) on delete set null,
  gewijzigd_op    timestamptz not null default now()
);

-- Puntenschema per blokstage: punten per niveau (op 10), eindpunt op 'op', aandeel van de mentor in %.
create table if not exists stage.evaluatie_instellingen (
  blok_id  uuid primary key references stage.blokken (id) on delete cascade,
  punten   jsonb not null default '{"O": 4, "V": 6, "G": 8, "ZG": 10, "op": 20, "aandeel_mentor": 50}'::jsonb
);

drop trigger if exists evaluaties_gewijzigd on stage.evaluaties;
create trigger evaluaties_gewijzigd before update on stage.evaluaties for each row execute function stage.zet_gewijzigd_op();
drop trigger if exists evaluatie_resultaten_gewijzigd on stage.evaluatie_resultaten;
create trigger evaluatie_resultaten_gewijzigd before update on stage.evaluatie_resultaten for each row execute function stage.zet_gewijzigd_op();

grant select, insert, update, delete on stage.evaluaties, stage.evaluatie_resultaten, stage.evaluatie_instellingen to authenticated;
grant all on stage.evaluaties, stage.evaluatie_resultaten, stage.evaluatie_instellingen to service_role;
do $$
declare t text;
begin
  foreach t in array array['evaluaties', 'evaluatie_resultaten', 'evaluatie_instellingen'] loop
    execute format('alter table stage.%I enable row level security', t);
    execute format('drop policy if exists "begeleiders beheren" on stage.%I', t);
    execute format(
      'create policy "begeleiders beheren" on stage.%I for all to authenticated
         using (stage.is_begeleider()) with check (stage.is_begeleider())', t);
  end loop;
end $$;

-- Wat de mentor (link) of de stagiair (portaal) mag zien.
create or replace function stage.evaluatie_laden(p_token text, p_dossier uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_d uuid; v_wie text; v_vrij boolean; v_uit jsonb;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.rooster_wie(p_token, p_dossier) w;
  if v_d is null then return null; end if;
  select r.vrijgegeven_op is not null into v_vrij from stage.evaluatie_resultaten r where r.dossier_id = v_d;
  v_vrij := coalesce(v_vrij, false);
  select jsonb_build_object(
    'wie', v_wie,
    'dossier_id', d.id,
    'vrijgegeven', v_vrij,
    'stage', coalesce(a.gegevens->'bedrijf'->>'soort', ''),
    'leerling', jsonb_build_object('voornaam', l.voornaam, 'naam', l.naam, 'klas', l.klas),
    'winkel', coalesce(nullif(c.gegevens->>'winkel_naam', ''), a.gegevens->'bedrijf'->>'naam'),
    'mentor', coalesce(nullif(c.gegevens->>'mentor', ''), a.gegevens->'mentor'->>'naam'),
    'blok', jsonb_build_object('naam', b.naam, 'start_datum', b.start_datum, 'eind_datum', b.eind_datum, 'uren', b.uren),
    'evaluaties', (
      select coalesce(jsonb_agg(to_jsonb(e) order by e.soort), '[]'::jsonb) from stage.evaluaties e
       where e.dossier_id = d.id
         and ((v_wie = 'stagegever' and e.soort = 'mentor')
           or (v_wie = 'stagiair' and (e.soort = 'zelf' or (v_vrij and e.status = 'ingediend')))
           or v_wie = 'school')
    ),
    'eindpunt', case when v_vrij or v_wie = 'school' then (select r.eindpunt from stage.evaluatie_resultaten r where r.dossier_id = d.id) end,
    'opmerking', case when v_vrij or v_wie = 'school' then (select r.opmerking from stage.evaluatie_resultaten r where r.dossier_id = d.id) end
  ) into v_uit
  from stage.dossiers d
  join stage.leerlingen l on l.id = d.leerling_id
  join stage.blokken b on b.id = d.blok_id
  left join stage.aanvragen a on a.dossier_id = d.id
  left join stage.contracten c on c.dossier_id = d.id
  where d.id = v_d;
  return v_uit;
end;
$$;

-- Bewaren of indienen: de stagegever enkel de evaluatie van de mentor, de stagiair enkel de zelfevaluatie. Na indienen vast.
create or replace function stage.evaluatie_bewaren(p_token text, p_dossier uuid, p_soort text, p_antwoorden jsonb, p_indienen boolean, p_naam text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_d uuid; v_wie text;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.rooster_wie(p_token, p_dossier) w;
  if v_d is null then return 'onbekend'; end if;
  if not ((v_wie = 'stagegever' and p_soort = 'mentor') or (v_wie = 'stagiair' and p_soort = 'zelf') or v_wie = 'school') then return 'geen_rechten'; end if;
  if jsonb_typeof(p_antwoorden) <> 'object' or length(p_antwoorden::text) > 60000 then return 'ongeldig'; end if;
  if v_wie <> 'school' and exists (select 1 from stage.evaluaties where dossier_id = v_d and soort = p_soort and status = 'ingediend') then
    return 'vergrendeld';
  end if;
  insert into stage.evaluaties (dossier_id, soort, antwoorden, status, naam, ingediend_op)
  values (v_d, p_soort, p_antwoorden, case when p_indienen then 'ingediend' else 'concept' end, left(trim(p_naam), 200), case when p_indienen then now() end)
  on conflict (dossier_id, soort) do update
    set antwoorden = excluded.antwoorden,
        status = case when p_indienen then 'ingediend' else stage.evaluaties.status end,
        naam = coalesce(excluded.naam, stage.evaluaties.naam),
        ingediend_op = case when p_indienen then now() else stage.evaluaties.ingediend_op end;
  return 'ok';
end;
$$;

revoke execute on function stage.evaluatie_laden(text, uuid), stage.evaluatie_bewaren(text, uuid, text, jsonb, boolean, text) from public;
grant execute on function stage.evaluatie_laden(text, uuid), stage.evaluatie_bewaren(text, uuid, text, jsonb, boolean, text) to anon, authenticated, service_role;

-- Melding voor de stagebegeleiding als een mentor of stagiair een evaluatie indient.
create or replace function stage.trg_evaluatie()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.soort <> 'school' and new.status = 'ingediend' and (tg_op = 'INSERT' or old.status <> 'ingediend') then
    perform stage.meld(new.dossier_id, 'evaluatie',
      case new.soort when 'mentor' then 'Evaluatie van de stagementor' else 'Zelfevaluatie' end || ' van ' || stage.dossier_naam(new.dossier_id) || ' ingediend',
      new.naam);
  end if;
  return null;
end;
$$;
drop trigger if exists evaluaties_melding on stage.evaluaties;
create trigger evaluaties_melding after insert or update on stage.evaluaties for each row execute function stage.trg_evaluatie();

notify pgrst, 'reload schema';
