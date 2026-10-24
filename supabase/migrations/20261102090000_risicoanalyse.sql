-- Risicoanalyse of werkpostfiche: de stagegever laadt die op via zijn persoonlijke link (contract), de school kan ze ook opladen.
-- Bestanden staan in de databank zelf (max. 4 MB per bestand, max. 6 per dossier). Geen aparte opslag nodig.
-- Uit te voeren in de SQL Editor van Supabase (project SNH3), na 20261101090000_activiteitenlijst.sql. Mag meermaals uitgevoerd worden.

create table if not exists stage.documenten (
  id             uuid primary key default gen_random_uuid(),
  dossier_id     uuid not null references stage.dossiers (id) on delete cascade,
  soort          text not null check (soort in ('risicoanalyse', 'werkpostfiche', 'ander')),
  naam           text not null,
  type           text not null,
  grootte        integer not null,
  inhoud         bytea not null,
  door           text not null check (door in ('stagegever', 'school')),
  door_naam      text,
  op             timestamptz not null default now(),
  nagekeken_op   timestamptz,
  nagekeken_door text
);
create index if not exists documenten_dossier on stage.documenten (dossier_id);

alter table stage.documenten enable row level security;
grant select, insert, update, delete on stage.documenten to authenticated;
grant all on stage.documenten to service_role;
drop policy if exists "begeleiders beheren" on stage.documenten;
create policy "begeleiders beheren" on stage.documenten for all to authenticated
  using (stage.is_begeleider()) with check (stage.is_begeleider());

-- Wie mag: stagegever via zijn link (p_token), of een begeleider (p_dossier).
create or replace function stage.document_wie(p_token text, p_dossier uuid)
returns table (dossier uuid, wie text)
language plpgsql stable security definer set search_path = '' as $$
declare v_d uuid;
begin
  if p_token is not null and length(p_token) >= 30 then
    select p.dossier_id into v_d from stage.contract_partijen p where p.token = p_token and p.rol = 'stagegever';
    if v_d is not null then return query select v_d, 'stagegever'::text; end if;
  elsif p_dossier is not null and stage.is_begeleider() then
    return query select p_dossier, 'school'::text;
  end if;
end;
$$;

-- Lijst (zonder inhoud).
create or replace function stage.documenten_lijst(p_token text, p_dossier uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_d uuid; v_wie text;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.document_wie(p_token, p_dossier) w;
  if v_d is null then return null; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'soort', x.soort, 'naam', x.naam, 'type', x.type, 'grootte', x.grootte,
            'door', x.door, 'door_naam', x.door_naam, 'op', x.op, 'nagekeken_op', x.nagekeken_op) order by x.op), '[]'::jsonb)
          from stage.documenten x where x.dossier_id = v_d);
end;
$$;

-- Opladen (inhoud als base64).
create or replace function stage.document_opladen(p_token text, p_dossier uuid, p_soort text, p_naam text, p_type text, p_inhoud text, p_door_naam text)
returns text
language plpgsql security definer set search_path = '' as $$
declare v_d uuid; v_wie text; v_bin bytea;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.document_wie(p_token, p_dossier) w;
  if v_d is null then return 'onbekend'; end if;
  if p_soort not in ('risicoanalyse', 'werkpostfiche', 'ander') then return 'ongeldig'; end if;
  if p_type not in ('application/pdf', 'image/jpeg', 'image/png', 'image/heic',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword') then return 'type'; end if;
  begin
    v_bin := decode(p_inhoud, 'base64');
  exception when others then return 'ongeldig';
  end;
  if octet_length(v_bin) = 0 or octet_length(v_bin) > 4 * 1024 * 1024 then return 'grootte'; end if;
  if (select count(*) from stage.documenten where dossier_id = v_d) >= 6 then return 'te_veel'; end if;
  insert into stage.documenten (dossier_id, soort, naam, type, grootte, inhoud, door, door_naam)
  values (v_d, p_soort, left(trim(p_naam), 200), p_type, octet_length(v_bin), v_bin, v_wie, left(trim(p_door_naam), 200));
  if v_wie = 'stagegever' then
    perform stage.meld(v_d, 'document',
      case p_soort when 'risicoanalyse' then 'Risicoanalyse' when 'werkpostfiche' then 'Werkpostfiche' else 'Document' end
      || ' opgeladen voor ' || stage.dossier_naam(v_d), p_door_naam);
  end if;
  return 'ok';
end;
$$;

-- Ophalen (met inhoud als base64).
create or replace function stage.document_ophalen(p_token text, p_dossier uuid, p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_d uuid; v_wie text;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.document_wie(p_token, p_dossier) w;
  if v_d is null then return null; end if;
  return (select jsonb_build_object('naam', x.naam, 'type', x.type, 'inhoud', encode(x.inhoud, 'base64'))
          from stage.documenten x where x.id = p_id and x.dossier_id = v_d);
end;
$$;

-- Verwijderen: de stagegever enkel zolang de school het niet nagekeken heeft.
create or replace function stage.document_verwijderen(p_token text, p_dossier uuid, p_id uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare v_d uuid; v_wie text; v_n int;
begin
  select w.dossier, w.wie into v_d, v_wie from stage.document_wie(p_token, p_dossier) w;
  if v_d is null then return 'onbekend'; end if;
  delete from stage.documenten x where x.id = p_id and x.dossier_id = v_d and (v_wie = 'school' or x.nagekeken_op is null);
  get diagnostics v_n = row_count;
  return case when v_n = 1 then 'ok' else 'vergrendeld' end;
end;
$$;

revoke execute on function stage.document_wie(text, uuid), stage.documenten_lijst(text, uuid),
  stage.document_opladen(text, uuid, text, text, text, text, text), stage.document_ophalen(text, uuid, uuid),
  stage.document_verwijderen(text, uuid, uuid) from public;
grant execute on function stage.documenten_lijst(text, uuid), stage.document_opladen(text, uuid, text, text, text, text, text),
  stage.document_ophalen(text, uuid, uuid), stage.document_verwijderen(text, uuid, uuid) to anon, authenticated, service_role;

-- Overzicht van de stagegever: nu ook de risicoanalyse.
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
          'te_bevestigen', (select count(*) from stage.inhaalmomenten i where i.dossier_id = d.id and i.status = 'gepland' and i.datum <= current_date),
          'risico', coalesce(c.gegevens->>'risico', ''),
          'risico_doc', exists (select 1 from stage.documenten x where x.dossier_id = d.id and x.soort in ('risicoanalyse', 'werkpostfiche'))
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

notify pgrst, 'reload schema';
