-- Afronding van de stage: stageverslag (stagiair), feedback (stagegever), stageattest en afronden door de school.
-- Ook: een stagegever kan zijn links opnieuw aanvragen en ziet al zijn stagiairs op één overzicht.
-- Uit te voeren in de SQL Editor van Supabase (project SNH3), na 20261030090000_evaluaties.sql. Mag meermaals uitgevoerd worden.

-- ---------------------------------------------------------------------------
-- Verslag en feedback als extra soorten in stage.evaluaties
-- ---------------------------------------------------------------------------
alter table stage.evaluaties drop constraint if exists evaluaties_soort_check;
alter table stage.evaluaties add constraint evaluaties_soort_check check (soort in ('mentor', 'school', 'zelf', 'verslag', 'feedback'));

-- Afronding door de school.
create table if not exists stage.afrondingen (
  dossier_id     uuid primary key references stage.dossiers (id) on delete cascade,
  afgerond_op    timestamptz not null default now(),
  afgerond_door  uuid references stage.begeleiders (id) on delete set null,
  uren_min       integer not null default 0,       -- gepresteerde minuten op het attest
  attest_code    text not null,                    -- documentcode op het attest
  attest         jsonb not null default '{}'::jsonb, -- gegevens op het attest (vastgelegd bij het afronden)
  gemaild_op     timestamptz                       -- attest en bedankmail verstuurd
);
alter table stage.afrondingen add column if not exists attest jsonb not null default '{}'::jsonb;

-- Toegang van een stagegever tot het overzicht van al zijn stagiairs (link per mail, 30 dagen geldig).
create table if not exists stage.stagegever_toegang (
  token        text primary key,
  email        text not null,
  aangemaakt_op timestamptz not null default now(),
  verloopt_op  timestamptz not null default now() + interval '30 days'
);
create index if not exists stagegever_toegang_email on stage.stagegever_toegang (email);

-- Aanvragen van links (tegen misbruik: maximum enkele per uur per adres).
create table if not exists stage.link_aanvragen (
  id    bigint generated always as identity primary key,
  email text not null,
  op    timestamptz not null default now()
);
create index if not exists link_aanvragen_email on stage.link_aanvragen (email, op);

grant select, insert, update, delete on stage.afrondingen to authenticated;
grant all on stage.afrondingen, stage.stagegever_toegang, stage.link_aanvragen to service_role;
alter table stage.afrondingen enable row level security;
alter table stage.stagegever_toegang enable row level security;
alter table stage.link_aanvragen enable row level security;
drop policy if exists "begeleiders beheren" on stage.afrondingen;
create policy "begeleiders beheren" on stage.afrondingen for all to authenticated
  using (stage.is_begeleider()) with check (stage.is_begeleider());
-- stagegever_toegang en link_aanvragen: geen policies, enkel via de server (service role) en de functies hieronder.

-- ---------------------------------------------------------------------------
-- Evaluaties laden en bewaren: nu ook verslag (stagiair) en feedback (stagegever)
-- ---------------------------------------------------------------------------
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
         and ((v_wie = 'stagegever' and e.soort in ('mentor', 'feedback'))
           or (v_wie = 'stagiair' and (e.soort in ('zelf', 'verslag') or (v_vrij and e.status = 'ingediend' and e.soort in ('mentor', 'school'))))
           or v_wie = 'school')
    ),
    'eindpunt', case when v_vrij or v_wie = 'school' then (select r.eindpunt from stage.evaluatie_resultaten r where r.dossier_id = d.id) end,
    'opmerking', case when v_vrij or v_wie = 'school' then (select r.opmerking from stage.evaluatie_resultaten r where r.dossier_id = d.id) end,
    'afgerond', exists (select 1 from stage.afrondingen f where f.dossier_id = d.id),
    'afronding', (select jsonb_build_object('afgerond_op', f.afgerond_op, 'uren_min', f.uren_min, 'attest_code', f.attest_code, 'attest', f.attest)
                  from stage.afrondingen f where f.dossier_id = d.id and v_wie in ('stagiair', 'school'))
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
  if not ((v_wie = 'stagegever' and p_soort in ('mentor', 'feedback'))
       or (v_wie = 'stagiair' and p_soort in ('zelf', 'verslag'))
       or v_wie = 'school') then return 'geen_rechten'; end if;
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

create or replace function stage.trg_evaluatie()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.soort <> 'school' and new.status = 'ingediend' and (tg_op = 'INSERT' or old.status <> 'ingediend') then
    perform stage.meld(new.dossier_id, case when new.soort in ('verslag', 'feedback') then 'afronding' else 'evaluatie' end,
      case new.soort
        when 'mentor' then 'Evaluatie van de stagementor'
        when 'zelf' then 'Zelfevaluatie'
        when 'verslag' then 'Stageverslag'
        else 'Feedback van de stagegever' end
      || ' van ' || stage.dossier_naam(new.dossier_id) || ' ingediend',
      new.naam);
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Overzicht voor de stagegever: al zijn stagiairs (op basis van het mailadres)
-- p_token = een overzichtslink (stagegever_toegang) of de persoonlijke link van één stagiair.
-- ---------------------------------------------------------------------------
create or replace function stage.stagegever_overzicht(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_email text;
begin
  if p_token is null or length(p_token) < 30 then return null; end if;
  select lower(t.email) into v_email from stage.stagegever_toegang t where t.token = p_token and t.verloopt_op > now();
  if v_email is null then
    select lower(p.email) into v_email from stage.contract_partijen p where p.token = p_token and p.rol = 'stagegever';
  end if;
  if v_email is null or v_email = '' then return null; end if;
  return jsonb_build_object(
    'email', v_email,
    'stagiairs', (
      select coalesce(jsonb_agg(x order by x->>'start_datum' desc, x->>'naam'), '[]'::jsonb) from (
        select jsonb_build_object(
          'token', p.token,
          'naam', l.voornaam || ' ' || l.naam,
          'klas', l.klas,
          'blok', b.naam,
          'start_datum', b.start_datum,
          'eind_datum', b.eind_datum,
          'winkel', coalesce(nullif(c.gegevens->>'winkel_naam', ''), a.gegevens->'bedrijf'->>'naam'),
          'getekend', p.getekend_op is not null,
          'contract_rond', c.afgerond_op is not null,
          'rooster', (select r.status from stage.roosters r where r.dossier_id = d.id),
          'mentor_eval', (select e.status from stage.evaluaties e where e.dossier_id = d.id and e.soort = 'mentor'),
          'feedback', (select e.status from stage.evaluaties e where e.dossier_id = d.id and e.soort = 'feedback'),
          'afgerond', exists (select 1 from stage.afrondingen f where f.dossier_id = d.id),
          'te_bevestigen', (select count(*) from stage.inhaalmomenten i where i.dossier_id = d.id and i.status = 'gepland' and i.datum <= current_date)
        ) as x
        from stage.contract_partijen p
        join stage.contracten c on c.dossier_id = p.dossier_id
        join stage.dossiers d on d.id = p.dossier_id
        join stage.leerlingen l on l.id = d.leerling_id
        join stage.blokken b on b.id = d.blok_id
        left join stage.aanvragen a on a.dossier_id = d.id
        where p.rol = 'stagegever' and lower(p.email) = v_email and p.token is not null
          and l.status in ('actief', 'ziek')
      ) s
    )
  );
end;
$$;

-- Enkel voor de server (service role): mailadres opzoeken en een overzichtslink aanmaken.
-- Geeft null als het adres niet gekend is of als er te veel aanvragen waren.
create or replace function stage.stagegever_link_aanvragen(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_email text := lower(trim(p_email)); v_token text; v_n int;
begin
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return null; end if;
  if (select count(*) from stage.link_aanvragen where email = v_email and op > now() - interval '1 hour') >= 3 then
    return jsonb_build_object('te_veel', true);
  end if;
  insert into stage.link_aanvragen (email) values (v_email);
  select count(*) into v_n from stage.contract_partijen p join stage.dossiers d on d.id = p.dossier_id join stage.leerlingen l on l.id = d.leerling_id
   where p.rol = 'stagegever' and lower(p.email) = v_email and p.token is not null and l.status in ('actief', 'ziek');
  if v_n = 0 then return jsonb_build_object('aantal', 0); end if;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into stage.stagegever_toegang (token, email) values (v_token, v_email);
  delete from stage.stagegever_toegang where verloopt_op < now();
  return jsonb_build_object('aantal', v_n, 'token', v_token);
end;
$$;

revoke execute on function stage.stagegever_overzicht(text), stage.stagegever_link_aanvragen(text) from public;
grant execute on function stage.stagegever_overzicht(text) to anon, authenticated, service_role;
grant execute on function stage.stagegever_link_aanvragen(text) to service_role;
revoke execute on function stage.stagegever_link_aanvragen(text) from anon, authenticated;
grant execute on function stage.evaluatie_laden(text, uuid), stage.evaluatie_bewaren(text, uuid, text, jsonb, boolean, text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
