-- ============================================================================
-- FIX — La columna fichajes.metodo permitía solo 'gps_qr'/'manual', pero
-- fichar() inserta 'gps' → violaba la restricción y daba 400 en cada fichaje.
-- Ampliamos los métodos válidos (incluye 'nfc' para el futuro).
-- Ejecutar en: Supabase → SQL Editor → Run
-- ============================================================================

alter table public.fichajes drop constraint if exists fichajes_metodo_check;
alter table public.fichajes add constraint fichajes_metodo_check
  check (metodo in ('gps','gps_qr','nfc','manual'));
