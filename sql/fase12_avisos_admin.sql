-- ============================================================================
-- OSYC — FASE 12: El admin NO recibe avisos (solo los manda)
-- Ejecutar en: Supabase → SQL Editor → Run   (idempotente)
-- ----------------------------------------------------------------------------
-- avisos_no_leidos() devolvía un conteo también para el admin (porque es_admin()
-- veía todos). Ahora para el admin devuelve 0 (no es destinatario de avisos).
-- ============================================================================

create or replace function public.avisos_no_leidos()
returns integer language sql security definer stable set search_path = public as $$
  select case when public.es_admin() then 0 else (
    select count(*)::int from public.avisos a
     where not exists (
             select 1 from public.avisos_lecturas l
              where l.aviso_id = a.id and l.user_id = auth.uid())
       and (
             ((a.area is null) and (a.destinatarios is null or array_length(a.destinatarios, 1) is null))
             or (auth.uid() = any(a.destinatarios))
             or (a.area is not null and a.area = (select p.area from public.personal p where p.user_id = auth.uid()))
           )
  ) end;
$$;
grant execute on function public.avisos_no_leidos() to authenticated;

-- ============================================================================
