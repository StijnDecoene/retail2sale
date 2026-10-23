-- Per blokstage instellen welke klassen meedoen (23 oktober 2026).
-- null = alle klassen. Bv. 4OL1 en 4OL2 doen niet mee aan blokstage 1 van 2026-2027:
-- ze staan in de klaslijst om op het einde van het schooljaar hun top 3 te kiezen.
alter table stage.blokken add column if not exists klassen text[];
comment on column stage.blokken.klassen is 'Klassen die aan deze blokstage deelnemen; null = alle klassen.';
notify pgrst, 'reload schema';
