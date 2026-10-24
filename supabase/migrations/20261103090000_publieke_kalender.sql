-- Publieke kalender: blokstages en vakantie- of feestdagen van een schooljaar, voor de documentenpagina (kalender en voorbeeldcontract).
-- Bevat geen persoonsgegevens. Uit te voeren in de SQL Editor van Supabase (project SNH3). Mag meermaals uitgevoerd worden.

create or replace function stage.publieke_kalender(p_schooljaar text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'blokken', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'naam', b.naam, 'code', b.code, 'schooljaar', b.schooljaar,
        'start_datum', b.start_datum, 'eind_datum', b.eind_datum, 'uren', b.uren, 'uren_per_week', b.uren_per_week) order by b.start_datum)
      from stage.blokken b where b.schooljaar = p_schooljaar), '[]'::jsonb),
    'uitzonderingen', coalesce((select jsonb_agg(jsonb_build_object('blok_id', u.blok_id, 'van', u.van, 'tot', u.tot, 'naam', u.naam, 'soort', u.soort) order by u.van)
      from stage.uitzonderingen u join stage.blokken b on b.id = u.blok_id where b.schooljaar = p_schooljaar), '[]'::jsonb)
  );
$$;

revoke execute on function stage.publieke_kalender(text) from public;
grant execute on function stage.publieke_kalender(text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
