-- Mail-log: welke mails het platform verstuurde per dossier (bv. de bevestiging bij goedkeuring van de aanvraag).
-- Uit te voeren in de SQL Editor van Supabase (project SNH3). Mag meermaals uitgevoerd worden.

create table if not exists stage.mails (
  id          uuid primary key default gen_random_uuid(),
  dossier_id  uuid not null references stage.dossiers (id) on delete cascade,
  soort       text not null,                 -- bv. 'bevestiging'
  aan         text[] not null default '{}',
  cc          text[] not null default '{}',
  onderwerp   text not null,
  verstuurd_op timestamptz not null default now(),
  door        uuid references stage.begeleiders (id) on delete set null,
  fout        text                            -- gevuld als versturen mislukte
);
create index if not exists mails_dossier on stage.mails (dossier_id, verstuurd_op desc);

alter table stage.mails enable row level security;
grant select, insert, update, delete on stage.mails to authenticated;
drop policy if exists "begeleiders beheren" on stage.mails;
create policy "begeleiders beheren" on stage.mails for all to authenticated
  using (stage.is_begeleider()) with check (stage.is_begeleider());

notify pgrst, 'reload schema';
