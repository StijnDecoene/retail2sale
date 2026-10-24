-- Meldingen voor de stagebegeleiding: wat stagiairs en stagegevers doen, verschijnt als melding in het beheer.
-- Uit te voeren in de SQL Editor van Supabase (project SNH3), na 20261027090000_afwezigheden.sql. Mag meermaals uitgevoerd worden.
--
-- De meldingen worden door de databank zelf gemaakt (triggers), ongeacht of iets via het portaal of een persoonlijke link gebeurt.
-- Elke begeleider heeft een eigen "gezien tot": alles wat later binnenkwam, is nieuw.

create table if not exists stage.meldingen (
  id         bigint generated always as identity primary key,
  dossier_id uuid references stage.dossiers (id) on delete cascade,
  soort      text not null,       -- afwezigheid | inhaal | rooster | contract | top3 | aanvraag
  tekst      text not null,
  door       text,                -- stagiair | stagegever | ouder | naam
  op         timestamptz not null default now()
);
create index if not exists meldingen_op on stage.meldingen (op desc);

create table if not exists stage.meldingen_gezien (
  begeleider_id uuid primary key references stage.begeleiders (id) on delete cascade,
  gezien_tot    timestamptz not null default now()
);

alter table stage.meldingen        enable row level security;
alter table stage.meldingen_gezien enable row level security;
grant select, insert, update, delete on stage.meldingen, stage.meldingen_gezien to authenticated;
grant all on stage.meldingen, stage.meldingen_gezien to service_role;
drop policy if exists "begeleiders lezen" on stage.meldingen;
create policy "begeleiders lezen" on stage.meldingen for select to authenticated using (stage.is_begeleider());
drop policy if exists "begeleiders beheren" on stage.meldingen_gezien;
create policy "begeleiders beheren" on stage.meldingen_gezien for all to authenticated
  using (stage.is_begeleider()) with check (stage.is_begeleider());

-- Hulpfuncties ----------------------------------------------------------------
create or replace function stage.dossier_naam(p_dossier uuid)
returns text language sql stable security definer set search_path = '' as $$
  select l.voornaam || ' ' || l.naam || ' (' || l.klas || ')'
  from stage.dossiers d join stage.leerlingen l on l.id = d.leerling_id where d.id = p_dossier;
$$;

create or replace function stage.uren_tekst(p_min integer)
returns text language sql immutable set search_path = '' as $$
  select (p_min / 60)::text || 'u' || case when p_min % 60 > 0 then lpad((p_min % 60)::text, 2, '0') else '' end;
$$;

create or replace function stage.dag_tekst(p_d date)
returns text language sql immutable set search_path = '' as $$
  select (array['ma','di','wo','do','vr','za','zo'])[extract(isodow from p_d)::int] || ' ' || extract(day from p_d)::int || '/' || extract(month from p_d)::int;
$$;

create or replace function stage.meld(p_dossier uuid, p_soort text, p_tekst text, p_door text)
returns void language sql security definer set search_path = '' as $$
  insert into stage.meldingen (dossier_id, soort, tekst, door) values (p_dossier, p_soort, p_tekst, p_door);
$$;

-- Triggers --------------------------------------------------------------------
create or replace function stage.trg_afwezigheid()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.door <> 'school' then
    perform stage.meld(new.dossier_id, 'afwezigheid',
      stage.dossier_naam(new.dossier_id) || ' afwezig op ' || stage.dag_tekst(new.datum) || ': ' ||
      case when new.soort = 'hele' then 'hele dag' else 'te laat of vroeger weg' end || ', ' || stage.uren_tekst(new.gemist_min) || ' gemist (' || new.reden || ')',
      coalesce(nullif(new.naam, ''), new.door) || ' (' || new.door || ')');
  elsif tg_op = 'DELETE' then
    perform stage.meld(old.dossier_id, 'afwezigheid',
      'Melding van afwezigheid op ' || stage.dag_tekst(old.datum) || ' ingetrokken voor ' || stage.dossier_naam(old.dossier_id), null);
  end if;
  return null;
end;
$$;
drop trigger if exists afwezigheden_melding on stage.afwezigheden;
create trigger afwezigheden_melding after insert or delete on stage.afwezigheden
  for each row execute function stage.trg_afwezigheid();

create or replace function stage.trg_inhaal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.door <> 'school' then
    perform stage.meld(new.dossier_id, 'inhaal',
      'Inhaalstage gepland voor ' || stage.dossier_naam(new.dossier_id) || ' op ' || stage.dag_tekst(new.datum) || ' (' || new.aan || '–' || new.ver || ', ' || stage.uren_tekst(new.min) || ')' ||
      case when cardinality(new.afw) = 0 then ' · niet gekoppeld aan een afwezigheid' else '' end,
      coalesce(nullif(new.naam, ''), new.door) || ' (' || new.door || ')');
  elsif tg_op = 'UPDATE' and new.status <> old.status and new.status = 'ingehaald' and coalesce(new.bev->>'door', '') <> 'school' then
    perform stage.meld(new.dossier_id, 'inhaal',
      'Inhaalstage van ' || stage.dossier_naam(new.dossier_id) || ' op ' || stage.dag_tekst(new.datum) || ' bevestigd: ' || stage.uren_tekst((new.bev->>'min')::int) || ' ingehaald',
      new.bev->>'naam');
  elsif tg_op = 'UPDATE' and new.status <> old.status and new.status = 'geannuleerd' and coalesce(new.annul->>'door', '') <> 'school' then
    perform stage.meld(new.dossier_id, 'inhaal',
      'Inhaalstage van ' || stage.dossier_naam(new.dossier_id) || ' op ' || stage.dag_tekst(new.datum) || ' niet doorgegaan',
      coalesce(nullif(new.annul->>'naam', ''), new.annul->>'door'));
  end if;
  return null;
end;
$$;
drop trigger if exists inhaal_melding on stage.inhaalmomenten;
create trigger inhaal_melding after insert or update on stage.inhaalmomenten
  for each row execute function stage.trg_inhaal();

create or replace function stage.trg_rooster()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.gewijzigd_door, '') = 'school' then return null; end if;
  if new.status = 'ingediend' and (tg_op = 'INSERT' or old.status <> 'ingediend') then
    perform stage.meld(new.dossier_id, 'rooster',
      case when new.vorige is not null then 'Gewijzigd werkrooster' else 'Werkrooster' end || ' van ' || stage.dossier_naam(new.dossier_id) ||
      ' ingediend (' || stage.uren_tekst(new.totaal_min) || '), na te kijken',
      coalesce(new.bevestiging->>'naam', new.ingediend_door));
  elsif tg_op = 'UPDATE' and old.status = 'goedgekeurd' and new.status = 'concept' and new.vorige is not null then
    perform stage.meld(new.dossier_id, 'rooster',
      'Goedgekeurd werkrooster van ' || stage.dossier_naam(new.dossier_id) || ' wordt aangepast', new.gewijzigd_door);
  elsif tg_op = 'UPDATE' and old.status = 'ingediend' and new.status = 'concept' then
    perform stage.meld(new.dossier_id, 'rooster',
      'Indiening van het werkrooster van ' || stage.dossier_naam(new.dossier_id) || ' ingetrokken', new.gewijzigd_door);
  end if;
  return null;
end;
$$;
drop trigger if exists roosters_melding on stage.roosters;
create trigger roosters_melding after insert or update on stage.roosters
  for each row execute function stage.trg_rooster();

create or replace function stage.trg_contract()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.rol <> 'directie' and new.getekend_op is not null and old.getekend_op is null then
    perform stage.meld(new.dossier_id, 'contract',
      'Contract van ' || stage.dossier_naam(new.dossier_id) || ' ondertekend door de ' ||
      case new.rol when 'stagegever' then 'stagegever' when 'stagiair' then 'stagiair' else 'ouder of voogd' end ||
      case when not exists (
        select 1 from stage.contract_partijen p join stage.contracten c on c.dossier_id = p.dossier_id
        where p.dossier_id = new.dossier_id and p.rol not in ('directie') and p.getekend_op is null
          and not (p.rol = 'ouder' and c.meerderjarig)
      ) then ' · klaar voor de handtekening van de school' else '' end,
      new.getekend_naam);
  end if;
  return null;
end;
$$;
drop trigger if exists contract_partijen_melding on stage.contract_partijen;
create trigger contract_partijen_melding after update on stage.contract_partijen
  for each row execute function stage.trg_contract();

create or replace function stage.trg_ingediend()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'ingediend' and (tg_op = 'INSERT' or old.status <> 'ingediend') and not stage.is_begeleider() then
    perform stage.meld(new.dossier_id, tg_argv[0],
      case tg_argv[0] when 'top3' then 'Top 3' else 'Aanvraag' end || ' van ' || stage.dossier_naam(new.dossier_id) || ' ingediend, na te kijken',
      'stagiair');
  end if;
  return null;
end;
$$;
drop trigger if exists top3_melding on stage.top3;
create trigger top3_melding after insert or update on stage.top3
  for each row execute function stage.trg_ingediend('top3');
drop trigger if exists aanvragen_melding on stage.aanvragen;
create trigger aanvragen_melding after insert or update on stage.aanvragen
  for each row execute function stage.trg_ingediend('aanvraag');

revoke execute on function stage.meld(uuid, text, text, text), stage.dossier_naam(uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
