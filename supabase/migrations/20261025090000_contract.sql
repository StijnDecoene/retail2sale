-- Stagecontract: digitaal aanvullen en ondertekenen via een persoonlijke link per partij.
-- Uit te voeren in de SQL Editor van Supabase (project SNH3). Mag meermaals uitgevoerd worden.
--
-- Partijen en volgorde:
--   1. stagegever  (vult aan en tekent eerst; persoonlijke link)
--   2. stagiair    (na de stagegever; persoonlijke link, ook via het portaal)
--   3. ouder       (na de stagegever; enkel bij een minderjarige stagiair; eigen link of samen met de stagiair)
--   4. directie    (als laatste; in het beheer, door de directeur of een stagebegeleider in diens naam)
-- Wie een link heeft, hoeft niet in te loggen: de link zelf (een lange willekeurige code) is de sleutel.

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------
create table if not exists stage.contracten (
  dossier_id    uuid primary key references stage.dossiers (id) on delete cascade,
  gegevens      jsonb not null default '{}'::jsonb,   -- aanvullingen: ondertekenaar, hoedanigheid, mentor, winkel, kbo, pc, rsz, risico, toestellen, afspraken, stagiair_adres, ...
  meerderjarig  boolean not null default false,       -- stagiair 18+ op de eerste stagedag: geen handtekening van een ouder
  aangemaakt_op timestamptz not null default now(),
  gewijzigd_op  timestamptz not null default now(),
  afgerond_op   timestamptz                           -- alle handtekeningen gezet
);

create table if not exists stage.contract_partijen (
  dossier_id    uuid not null references stage.contracten (dossier_id) on delete cascade,
  rol           text not null check (rol in ('stagegever', 'stagiair', 'ouder', 'directie')),
  token         text unique,                          -- persoonlijke link (niet voor directie)
  email         text,
  uitgenodigd_op timestamptz,
  geopend_op    timestamptz,
  getekend_op   timestamptz,
  getekend_naam text,
  plaats        text,
  handtekening  text,                                 -- png als data-URL
  extra         jsonb not null default '{}'::jsonb,   -- bv. relatie ouder, hoedanigheid
  ip            text,
  browser       text,
  tekst_hash    text,                                 -- sha256 van de contracttekst op het moment van tekenen
  primary key (dossier_id, rol)
);

create table if not exists stage.contract_log (
  id         bigint generated always as identity primary key,
  dossier_id uuid not null references stage.contracten (dossier_id) on delete cascade,
  op         timestamptz not null default now(),
  wie        text not null,                           -- rol of naam begeleider
  wat        text not null
);
create index if not exists contract_log_dossier on stage.contract_log (dossier_id, op);

drop trigger if exists contracten_gewijzigd on stage.contracten;
create trigger contracten_gewijzigd before update on stage.contracten
  for each row execute function stage.zet_gewijzigd_op();

-- Begeleiders: alles. Anderen: enkel via de functies hieronder.
alter table stage.contracten        enable row level security;
alter table stage.contract_partijen enable row level security;
alter table stage.contract_log      enable row level security;
grant select, insert, update, delete on stage.contracten, stage.contract_partijen, stage.contract_log to authenticated;
grant all on stage.contracten, stage.contract_partijen, stage.contract_log to service_role;
do $$
declare t text;
begin
  foreach t in array array['contracten', 'contract_partijen', 'contract_log'] loop
    execute format('drop policy if exists "begeleiders beheren" on stage.%I', t);
    execute format(
      'create policy "begeleiders beheren" on stage.%I for all to authenticated
         using (stage.is_begeleider()) with check (stage.is_begeleider())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Functies voor wie een persoonlijke link heeft (ook zonder login)
-- ---------------------------------------------------------------------------

-- Alles wat de contractpagina nodig heeft, voor de partij met deze link.
create or replace function stage.contract_via_link(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partij stage.contract_partijen;
  v_uit    jsonb;
begin
  if p_token is null or length(p_token) < 30 then return null; end if;
  select * into v_partij from stage.contract_partijen where token = p_token;
  if not found then return null; end if;
  update stage.contract_partijen set geopend_op = coalesce(geopend_op, now()) where dossier_id = v_partij.dossier_id and rol = v_partij.rol;

  select jsonb_build_object(
    'rol', v_partij.rol,
    'dossier_id', d.id,
    'contract', jsonb_build_object('gegevens', c.gegevens, 'meerderjarig', c.meerderjarig, 'afgerond_op', c.afgerond_op),
    'partijen', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'rol', p.rol, 'getekend_op', p.getekend_op, 'getekend_naam', p.getekend_naam, 'plaats', p.plaats,
        'handtekening', p.handtekening, 'extra', p.extra) order by p.rol), '[]'::jsonb)
      from stage.contract_partijen p where p.dossier_id = d.id
    ),
    'leerling', jsonb_build_object('voornaam', l.voornaam, 'naam', l.naam, 'klas', l.klas, 'email', l.email, 'gsm', l.gsm),
    'blok', jsonb_build_object('naam', b.naam, 'code', b.code, 'schooljaar', b.schooljaar, 'start_datum', b.start_datum,
                               'eind_datum', b.eind_datum, 'uren', b.uren, 'uren_per_week', b.uren_per_week),
    'uitzonderingen', (
      select coalesce(jsonb_agg(jsonb_build_object('van', u.van, 'tot', u.tot, 'naam', u.naam, 'soort', u.soort) order by u.van), '[]'::jsonb)
      from stage.uitzonderingen u where u.blok_id = b.id
    ),
    'aanvraag', coalesce(a.gegevens, '{}'::jsonb),
    'team', (
      select coalesce(jsonb_agg(jsonb_build_object('naam', g.naam, 'telefoon', g.telefoon, 'email', g.email) order by g.naam), '[]'::jsonb)
      from stage.begeleiders g where g.actief and g.rol <> 'directie'
    )
  ) into v_uit
  from stage.dossiers d
  join stage.contracten c on c.dossier_id = d.id
  join stage.leerlingen l on l.id = d.leerling_id
  join stage.blokken b on b.id = d.blok_id
  left join stage.aanvragen a on a.dossier_id = d.id
  where d.id = v_partij.dossier_id;
  return v_uit;
end;
$$;

-- Stagegever: gegevens aanvullen, zolang nog niemand getekend heeft.
create or replace function stage.contract_aanvullen(p_token text, p_gegevens jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_partij stage.contract_partijen;
begin
  select * into v_partij from stage.contract_partijen where token = p_token and length(p_token) >= 30;
  if not found then return 'onbekend'; end if;
  if v_partij.rol <> 'stagegever' then return 'geen_rechten'; end if;
  if exists (select 1 from stage.contract_partijen where dossier_id = v_partij.dossier_id and getekend_op is not null) then
    return 'vergrendeld';
  end if;
  -- Enkel de velden die de stagegever mag invullen.
  update stage.contracten
     set gegevens = gegevens || (
       select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each(p_gegevens) as e(k, v)
       where k in ('ondertekenaar', 'hoedanigheid', 'mentor', 'mentor_tel', 'winkel_naam', 'winkel_adres', 'winkel_tel',
                   'winkel_email', 'kbo', 'pc', 'rsz', 'risico', 'toestellen', 'afspraken')
     )
   where dossier_id = v_partij.dossier_id;
  insert into stage.contract_log (dossier_id, wie, wat) values (v_partij.dossier_id, 'stagegever', 'gegevens bewaard');
  return 'ok';
end;
$$;

-- Ondertekenen via de link. p_rol = rol van de link, of 'ouder' vanaf de link van de stagiair (ouder tekent mee).
create or replace function stage.contract_tekenen(
  p_token text, p_rol text, p_naam text, p_plaats text, p_handtekening text,
  p_extra jsonb, p_ip text, p_browser text, p_tekst_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partij stage.contract_partijen;
  v_c      stage.contracten;
  v_g      jsonb;
begin
  select * into v_partij from stage.contract_partijen where token = p_token and length(p_token) >= 30;
  if not found then return 'onbekend'; end if;
  if not (p_rol = v_partij.rol or (v_partij.rol = 'stagiair' and p_rol = 'ouder')) then return 'geen_rechten'; end if;
  if coalesce(trim(p_naam), '') = '' or coalesce(trim(p_plaats), '') = '' then return 'onvolledig'; end if;
  if p_handtekening is null or p_handtekening not like 'data:image/png;base64,%' or length(p_handtekening) > 400000 then
    return 'handtekening';
  end if;
  select * into v_c from stage.contracten where dossier_id = v_partij.dossier_id;
  if p_rol = 'ouder' and v_c.meerderjarig then return 'niet_nodig'; end if;
  if exists (select 1 from stage.contract_partijen where dossier_id = v_partij.dossier_id and rol = p_rol and getekend_op is not null) then
    return 'al_getekend';
  end if;
  -- Volgorde: eerst de stagegever (met volledige gegevens), daarna stagiair en ouder.
  if p_rol = 'stagegever' then
    v_g := v_c.gegevens;
    if coalesce(v_g->>'ondertekenaar', '') = '' or coalesce(v_g->>'hoedanigheid', '') = '' or coalesce(v_g->>'mentor', '') = '' then
      return 'gegevens';
    end if;
  elsif not exists (select 1 from stage.contract_partijen where dossier_id = v_partij.dossier_id and rol = 'stagegever' and getekend_op is not null) then
    return 'volgorde';
  end if;
  -- Stagiair: adres voor het contract mee bewaren.
  if p_rol = 'stagiair' and coalesce(p_extra->>'adres', '') <> '' then
    update stage.contracten set gegevens = gegevens || jsonb_build_object('stagiair_adres', p_extra->>'adres')
     where dossier_id = v_partij.dossier_id;
  end if;

  insert into stage.contract_partijen (dossier_id, rol) values (v_partij.dossier_id, p_rol) on conflict do nothing;
  update stage.contract_partijen
     set getekend_op = now(), getekend_naam = trim(p_naam), plaats = trim(p_plaats), handtekening = p_handtekening,
         extra = coalesce(p_extra, '{}'::jsonb), ip = p_ip, browser = left(p_browser, 300), tekst_hash = p_tekst_hash
   where dossier_id = v_partij.dossier_id and rol = p_rol;
  insert into stage.contract_log (dossier_id, wie, wat) values (v_partij.dossier_id, p_rol, 'ondertekend door ' || trim(p_naam));
  return 'ok';
end;
$$;

-- Leerling in het portaal: de eigen link om te tekenen (enkel het eigen dossier).
create or replace function stage.mijn_contract_link(p_dossier uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.token from stage.contract_partijen p
  where p.dossier_id = p_dossier and p.rol = 'stagiair' and stage.is_mijn_dossier(p_dossier);
$$;

-- Leerling in het portaal: stand van de ondertekening (enkel het eigen dossier).
create or replace function stage.mijn_contract_status(p_dossier uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'meerderjarig', c.meerderjarig,
    'afgerond_op', c.afgerond_op,
    'getekend', (select coalesce(jsonb_agg(p.rol), '[]'::jsonb) from stage.contract_partijen p
                 where p.dossier_id = c.dossier_id and p.getekend_op is not null)
  )
  from stage.contracten c
  where c.dossier_id = p_dossier and stage.is_mijn_dossier(p_dossier);
$$;

-- Rechten: functies niet standaard voor iedereen; de linkfuncties ook voor bezoekers zonder login.
revoke execute on all functions in schema stage from public;
grant execute on all functions in schema stage to authenticated, service_role;
grant usage on schema stage to anon;
grant execute on function stage.contract_via_link(text), stage.contract_aanvullen(text, jsonb),
  stage.contract_tekenen(text, text, text, text, text, jsonb, text, text, text) to anon;

notify pgrst, 'reload schema';
