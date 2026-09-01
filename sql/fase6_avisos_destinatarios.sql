-- ============================================================================
-- OSYC — FASE 6: Avisos dirigidos (a todos / a un área / a personas)
-- Ejecutar en: Supabase → SQL Editor → Run   (idempotente)
-- ----------------------------------------------------------------------------
-- Antes: un aviso tenía solo "area" (texto). Ahora se puede dirigir a:
--   • TODOS            → area NULL y destinatarios vacío
--   • UN ÁREA          → area = 'Barra' (lo ven los de esa área)
--   • PERSONAS puntuales → destinatarios = {user_id, user_id, ...}
-- La visibilidad se aplica con RLS: cada empleado solo VE los avisos que le
-- corresponden; el admin ve todos.
-- ============================================================================

alter table public.avisos add column if not exists destinatarios uuid[];
comment on column public.avisos.destinatarios is
  'Lista de user_id destinatarios. Vacío/NULL = no dirigido a personas puntuales (usa area o es para todos).';

-- ── Política de lectura: cada uno ve lo que le corresponde ──────────────────
drop policy if exists avisos_select on public.avisos;
create policy avisos_select on public.avisos
  for select to authenticated using (
    public.es_admin()
    or ((area is null) and (destinatarios is null or array_length(destinatarios, 1) is null))
    or (auth.uid() = any(destinatarios))
    or (area is not null and area = (select p.area from public.personal p where p.user_id = auth.uid()))
  );

-- ── Contador de no leídos: respeta la misma visibilidad ─────────────────────
create or replace function public.avisos_no_leidos()
returns integer language sql security definer stable set search_path = public as $$
  select count(*)::int from public.avisos a
   where not exists (
           select 1 from public.avisos_lecturas l
            where l.aviso_id = a.id and l.user_id = auth.uid())
     and (
           public.es_admin()
           or ((a.area is null) and (a.destinatarios is null or array_length(a.destinatarios, 1) is null))
           or (auth.uid() = any(a.destinatarios))
           or (a.area is not null and a.area = (select p.area from public.personal p where p.user_id = auth.uid()))
         );
$$;
grant execute on function public.avisos_no_leidos() to authenticated;

-- Verificación:
--   select titulo, area, destinatarios from public.avisos order by created_at desc;
-- ============================================================================
