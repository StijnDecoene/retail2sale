-- Partners op de homepagina: stagegevers die we (met hun akkoord) tonen, met logo.
-- Uit te voeren in de SQL Editor van Supabase (project SNH3). Mag meermaals uitgevoerd worden.

alter table stage.stageplaatsen add column if not exists partner   boolean not null default false;
alter table stage.stageplaatsen add column if not exists logo      bytea;
alter table stage.stageplaatsen add column if not exists logo_type text;
alter table stage.stageplaatsen add column if not exists logo_op   timestamptz;

-- Publieke lijst (enkel naam, gemeente en website).
create or replace function stage.publieke_partners()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'naam', p.naam, 'gemeente', p.gemeente, 'website', p.website,
           'logo', p.logo is not null, 'versie', extract(epoch from p.logo_op)::bigint) order by lower(p.naam)), '[]'::jsonb)
  from stage.stageplaatsen p where p.partner and p.status <> 'stop';
$$;

create or replace function stage.partner_logo(p_id uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('type', p.logo_type, 'inhoud', encode(p.logo, 'base64'))
  from stage.stageplaatsen p where p.id = p_id and p.partner and p.logo is not null;
$$;

revoke execute on function stage.publieke_partners(), stage.partner_logo(uuid) from public;
grant execute on function stage.publieke_partners(), stage.partner_logo(uuid) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
