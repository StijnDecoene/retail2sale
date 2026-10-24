-- Activiteitenlijst bij het stagecontract (verplicht onderdeel van de leerlingenstageovereenkomst, omzendbrief SO/2015/01).
-- 1. Schooleigen lijst (stage.activiteiten), aanpasbaar in het beheer. Startvoorstel op basis van leerplan III-OOS-a.
-- 2. Individuele lijst per stagiair: de stagegever kiest en vult aan in het contract (contracten.gegevens.activiteiten).
-- Uit te voeren in de SQL Editor van Supabase (project SNH3), na 20261031090000_afronding.sql. Mag meermaals uitgevoerd worden.

create table if not exists stage.activiteiten (
  id         uuid primary key default gen_random_uuid(),
  code       text unique,
  soort      text not null check (soort in ('algemeen', 'sales', 'onthaal')),
  groep      text not null,
  tekst      text not null,
  lpd        text,                               -- leerplandoelen (III-OOS-a), bv. '39' of '12, 17'
  toezicht   boolean not null default false,     -- enkel onder rechtstreeks toezicht
  standaard  boolean not null default true,      -- staat standaard aangevinkt bij een nieuw contract
  actief     boolean not null default true,
  volgorde   integer not null default 0,
  gewijzigd_op timestamptz not null default now()
);

drop trigger if exists activiteiten_gewijzigd on stage.activiteiten;
create trigger activiteiten_gewijzigd before update on stage.activiteiten for each row execute function stage.zet_gewijzigd_op();

alter table stage.activiteiten enable row level security;
grant select on stage.activiteiten to anon, authenticated;
grant insert, update, delete on stage.activiteiten to authenticated;
grant all on stage.activiteiten to service_role;
drop policy if exists "begeleiders beheren" on stage.activiteiten;
create policy "begeleiders beheren" on stage.activiteiten for all to authenticated
  using (stage.is_begeleider()) with check (stage.is_begeleider());
drop policy if exists "iedereen leest actieve" on stage.activiteiten;
create policy "iedereen leest actieve" on stage.activiteiten for select to anon, authenticated using (actief);

-- Startvoorstel (enkel toegevoegd als de code nog niet bestaat; eigen aanpassingen blijven behouden).
insert into stage.activiteiten (code, soort, groep, tekst, lpd, toezicht, standaard, volgorde) values
  ('alg1', 'algemeen', 'Op de werkvloer', 'Kennismaken met de werking, de huisregels en de veiligheidsvoorschriften van de stageplaats', '1', false, true, 10),
  ('alg2', 'algemeen', 'Op de werkvloer', 'Klanten en bezoekers vriendelijk en correct te woord staan', '4', false, true, 20),
  ('alg3', 'algemeen', 'Op de werkvloer', 'Samenwerken met collega''s en taken afstemmen met de mentor', '1', false, true, 30),
  ('alg4', 'algemeen', 'Op de werkvloer', 'De werkplek ordelijk, net en veilig houden', '1', false, true, 40),
  ('alg5', 'algemeen', 'Op de werkvloer', 'Werken met de digitale toepassingen van de stageplaats (mail, agenda, kassa- of registratiesysteem)', null, false, true, 50),
  ('s1', 'sales', 'Goederen en winkel', 'Goederen ontvangen, controleren met de leveringsbon en uitpakken', '30', false, true, 60),
  ('s2', 'sales', 'Goederen en winkel', 'Goederen prijzen, labelen en presenteren; rekken aanvullen en ordenen', null, false, true, 70),
  ('s3', 'sales', 'Goederen en winkel', 'De voorraad opvolgen en meewerken aan een bestelling of inventaris', '32', false, true, 80),
  ('s4', 'sales', 'Goederen en winkel', 'De winkel of etalage mee aankleden (visual merchandising)', null, false, false, 90),
  ('s5', 'sales', 'Verkoop', 'Klanten begroeten, aanspreken en hun wensen vaststellen', '39', false, true, 100),
  ('s6', 'sales', 'Verkoop', 'Klanten adviseren over producten en diensten', '39', false, true, 110),
  ('s7', 'sales', 'Verkoop', 'Een verkoop afsluiten en bij- of meerverkoop voorstellen', '40', false, true, 120),
  ('s8', 'sales', 'Verkoop', 'Geschenkverpakkingen maken', null, false, false, 130),
  ('s9', 'sales', 'Kassa en administratie', 'Afrekenen aan de kassa: scannen, betalingen ontvangen en verwerken', '41', true, true, 140),
  ('s10', 'sales', 'Kassa en administratie', 'Verkoopdocumenten opmaken (bestelbon, factuur, retour of omruiling)', '44', false, true, 150),
  ('s11', 'sales', 'Kassa en administratie', 'Dienst na verkoop en klachten: observeren en onder begeleiding afhandelen', '43', true, true, 160),
  ('o1', 'onthaal', 'Onthaal', 'Bezoekers verwelkomen, registreren en doorverwijzen', '12, 17', false, true, 170),
  ('o2', 'onthaal', 'Onthaal', 'Bezoekers informeren over de organisatie, producten of diensten', '12', false, true, 180),
  ('o3', 'onthaal', 'Onthaal', 'Telefoongesprekken aannemen, doorverbinden en telefoonnotities maken', '13', false, true, 190),
  ('o4', 'onthaal', 'Onthaal', 'De onthaalruimte openen, verzorgen en afsluiten', '14', false, true, 200),
  ('o5', 'onthaal', 'Onthaal', 'Badges of toegangsbewijzen aanmaken', '17', false, false, 210),
  ('o6', 'onthaal', 'Organisatie en administratie', 'In- en uitgaande post en pakjes verwerken', '18', false, true, 220),
  ('o7', 'onthaal', 'Organisatie en administratie', 'Mails beantwoorden en eenvoudige documenten of brieven opmaken', null, false, true, 230),
  ('o8', 'onthaal', 'Organisatie en administratie', 'Afspraken noteren en agenda''s beheren', null, false, true, 240),
  ('o9', 'onthaal', 'Organisatie en administratie', 'Vergaderingen of activiteiten mee voorbereiden (zaal, materiaal, catering)', null, false, true, 250),
  ('o10', 'onthaal', 'Organisatie en administratie', 'Gegevens invoeren, documenten klasseren en archiveren', null, false, true, 260),
  ('o11', 'onthaal', 'Organisatie en administratie', 'Betalingen of kassaverrichtingen aan het onthaal verwerken', null, true, false, 270)

on conflict (code) do nothing;

-- Stagegever mag nu ook de activiteitenlijst aanvullen.
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
  if p_gegevens ? 'activiteiten' and (jsonb_typeof(p_gegevens->'activiteiten') <> 'array' or length((p_gegevens->'activiteiten')::text) > 20000) then
    return 'ongeldig';
  end if;
  update stage.contracten
     set gegevens = gegevens || (
       select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each(p_gegevens) as e(k, v)
       where k in ('ondertekenaar', 'hoedanigheid', 'mentor', 'mentor_tel', 'winkel_naam', 'winkel_adres', 'winkel_tel',
                   'winkel_email', 'kbo', 'pc', 'rsz', 'risico', 'toestellen', 'afspraken', 'activiteiten')
     )
   where dossier_id = v_partij.dossier_id;
  insert into stage.contract_log (dossier_id, wie, wat) values (v_partij.dossier_id, 'stagegever', 'gegevens bewaard');
  return 'ok';
end;
$$;

notify pgrst, 'reload schema';
