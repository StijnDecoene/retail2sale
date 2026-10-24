-- Stagebezoeken: routes per begeleider, planning met het werkrooster, bezoeken afvinken.
-- Uit te voeren in de SQL Editor van Supabase (project SNH3), na 20261028090000_meldingen.sql. Mag meermaals uitgevoerd worden.
-- Enkel voor begeleiders (geen toegang voor leerlingen of stagegevers).

-- Ligging van de stageplaats (voor kaart en routes).
alter table stage.stageplaatsen add column if not exists lat double precision;
alter table stage.stageplaatsen add column if not exists lng double precision;
alter table stage.stageplaatsen add column if not exists ligging_bron text;   -- import | adres | kaart

-- Instellingen per blokstage.
create table if not exists stage.bezoek_instellingen (
  blok_id        uuid primary key references stage.blokken (id) on delete cascade,
  start_datum    date,
  eind_datum     date,
  vertrek        jsonb not null default '{"label": "Instituut Spes Nostra", "adres": "Heulsekasteelstraat 2A, 8501 Kortrijk", "lat": 50.8445, "lng": 3.231}'::jsonb,
  max_per_route  integer not null default 8 check (max_per_route between 1 and 20),
  geblokkeerd    jsonb not null default '{}'::jsonb,   -- {"2026-11-11": "Wapenstilstand"}
  gewijzigd_op   timestamptz not null default now()
);

-- Wanneer kan een begeleider op bezoek? Per weekdag (2 = dinsdag … 5 = vrijdag) voormiddag en/of namiddag; losse dagdelen overslaan.
create table if not exists stage.bezoek_beschikbaarheid (
  begeleider_id uuid not null references stage.begeleiders (id) on delete cascade,
  blok_id       uuid not null references stage.blokken (id) on delete cascade,
  slots         jsonb not null default '{"2": ["vm", "nm"], "3": ["vm", "nm"], "4": ["vm", "nm"], "5": ["vm", "nm"]}'::jsonb,
  overslaan     text[] not null default '{}',             -- "2026-11-12" (hele dag) of "2026-11-12:vm"
  primary key (begeleider_id, blok_id)
);

-- Routes: een begeleider bezoekt op één dag(deel) een reeks leerlingen, in volgorde.
create table if not exists stage.bezoek_routes (
  id             uuid primary key default gen_random_uuid(),
  blok_id        uuid not null references stage.blokken (id) on delete cascade,
  nr             integer not null,
  naam           text not null default '',
  begeleider_id  uuid references stage.begeleiders (id) on delete set null,
  datum          date,
  dagdeel        text not null default 'dag' check (dagdeel in ('vm', 'nm', 'dag')),
  volgorde       uuid[] not null default '{}',             -- dossier-id's in volgorde
  opm            text,
  gewijzigd_op   timestamptz not null default now()
);
create index if not exists bezoek_routes_blok on stage.bezoek_routes (blok_id, nr);

-- Per leerling (dossier): bezoek gedaan, eerste bezoek, evaluatie, opmerking.
create table if not exists stage.bezoeken (
  dossier_id     uuid primary key references stage.dossiers (id) on delete cascade,
  bezocht_op     date,
  bezocht_door   uuid references stage.begeleiders (id) on delete set null,
  eerste_bezoek  date,                                     -- kennismaking vóór het eigenlijke bezoek
  evaluatie      boolean not null default false,           -- evaluatie besproken
  opmerking      text,
  te_doen        text,
  niet_plannen   boolean not null default false,           -- geen bezoek nodig (bv. al geregeld)
  gewijzigd_op   timestamptz not null default now()
);

drop trigger if exists bezoek_routes_gewijzigd on stage.bezoek_routes;
create trigger bezoek_routes_gewijzigd before update on stage.bezoek_routes for each row execute function stage.zet_gewijzigd_op();
drop trigger if exists bezoeken_gewijzigd on stage.bezoeken;
create trigger bezoeken_gewijzigd before update on stage.bezoeken for each row execute function stage.zet_gewijzigd_op();
drop trigger if exists bezoek_instellingen_gewijzigd on stage.bezoek_instellingen;
create trigger bezoek_instellingen_gewijzigd before update on stage.bezoek_instellingen for each row execute function stage.zet_gewijzigd_op();

grant select, insert, update, delete on stage.bezoek_instellingen, stage.bezoek_beschikbaarheid, stage.bezoek_routes, stage.bezoeken to authenticated;
grant all on stage.bezoek_instellingen, stage.bezoek_beschikbaarheid, stage.bezoek_routes, stage.bezoeken to service_role;
do $$
declare t text;
begin
  foreach t in array array['bezoek_instellingen', 'bezoek_beschikbaarheid', 'bezoek_routes', 'bezoeken'] loop
    execute format('alter table stage.%I enable row level security', t);
    execute format('drop policy if exists "begeleiders beheren" on stage.%I', t);
    execute format(
      'create policy "begeleiders beheren" on stage.%I for all to authenticated
         using (stage.is_begeleider()) with check (stage.is_begeleider())', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
