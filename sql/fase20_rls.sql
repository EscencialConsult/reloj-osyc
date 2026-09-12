-- ============================================================================
-- FASE 20: RLS por rol — cierra H-01 (tablas abiertas) y la vía de líder de H-02
-- Ejecutar en: Supabase → SQL Editor → pegar TODO → Run   (idempotente)
-- ⚠️ CORRER PRIMERO EN ONE, PROBAR LOS 4 ROLES, Y RECIÉN DESPUÉS EN OSYC.
-- ----------------------------------------------------------------------------
-- Reactiva Row Level Security con políticas por rol en las 7 tablas que hoy
-- están abiertas a la clave pública. Reglas:
--   • Anónimo (sin login): nada (salvo leer `configuracion`, que no es sensible).
--   • Empleado: su propia fila de `personal`; nada más directo.
--   • Líder: lo de su(s) área(s) (personal, registros, horarios).
--   • Admin: todo.
-- Las funciones del servidor (fichar, crear_empleado, triggers, RPCs de líder)
-- son SECURITY DEFINER → siguen funcionando aunque RLS esté activo.
--
-- ROLLBACK de emergencia si algo legítimo se rompe:
--   alter table public.<tabla> disable row level security;
-- (y avisar para corregir la política)
-- ============================================================================


-- ── Helper: áreas que lidera el usuario logueado ─────────────────────────────
-- SECURITY DEFINER → lee `personal` sin disparar RLS (evita recursión).
create or replace function public.mis_areas_lider()
returns jsonb language sql security definer stable set search_path = public as $$
  select coalesce(
    (select lider_areas from public.personal
      where user_id = auth.uid() and es_lider = true and activo = true limit 1),
    '[]'::jsonb);
$$;
grant execute on function public.mis_areas_lider() to authenticated;

-- ── RPC para el EMPLEADO: ¿mi área tiene un líder (distinto de mí) que reciba
--    solicitudes? Devuelve {nombre} o null. Reemplaza la lectura directa de
--    `personal` que hacía el front (liderDeMiArea). ─────────────────────────────
create or replace function public.mi_lider_de_solicitudes()
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare v_area text; v_nombre text;
begin
  select area into v_area from public.personal where user_id = auth.uid() and activo = true limit 1;
  if v_area is null then return null; end if;
  select nombre into v_nombre from public.personal
    where es_lider = true and activo = true and user_id <> auth.uid()
      and coalesce((lider_permisos->>'solicitudes')::boolean, false) = true
      and lider_areas ? v_area
    limit 1;
  if v_nombre is null then return null; end if;
  return jsonb_build_object('nombre', v_nombre);
end $$;
grant execute on function public.mi_lider_de_solicitudes() to authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
--  PERSONAL
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.personal enable row level security;
revoke all on public.personal from anon;

drop policy if exists personal_select on public.personal;
create policy personal_select on public.personal for select to authenticated
  using (
    user_id = auth.uid()
    or public.es_admin()
    or (area is not null and public.mis_areas_lider() ? area)
  );

-- Escritura SOLO admin → un empleado no puede auto-asignarse es_lider/es_admin/etc.
drop policy if exists personal_write on public.personal;
create policy personal_write on public.personal for all to authenticated
  using (public.es_admin()) with check (public.es_admin());


-- ═════════════════════════════════════════════════════════════════════════════
--  REGISTROS
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.registros enable row level security;
revoke all on public.registros from anon;

drop policy if exists registros_select on public.registros;
create policy registros_select on public.registros for select to authenticated
  using (public.es_admin() or (area is not null and public.mis_areas_lider() ? area));

-- Admin: alta/edición/baja completa
drop policy if exists registros_admin_write on public.registros;
create policy registros_admin_write on public.registros for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Líder: puede actualizar los registros de su área (sincronización del turno al
-- guardar horarios). El fichaje entra por fichar() (SECURITY DEFINER).
drop policy if exists registros_lider_update on public.registros;
create policy registros_lider_update on public.registros for update to authenticated
  using (area is not null and public.mis_areas_lider() ? area)
  with check (area is not null and public.mis_areas_lider() ? area);


-- ═════════════════════════════════════════════════════════════════════════════
--  HORARIOS_SEMANALES
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.horarios_semanales enable row level security;
revoke all on public.horarios_semanales from anon;

drop policy if exists horarios_rw on public.horarios_semanales;
create policy horarios_rw on public.horarios_semanales for all to authenticated
  using (public.es_admin() or (area is not null and public.mis_areas_lider() ? area))
  with check (public.es_admin() or (area is not null and public.mis_areas_lider() ? area));


-- ═════════════════════════════════════════════════════════════════════════════
--  CONFIGURACION  (lectura abierta — no es sensible y se lee antes del login;
--                  escritura solo admin)
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.configuracion enable row level security;
revoke all on public.configuracion from anon;
grant select on public.configuracion to anon;   -- solo lectura para anónimo

drop policy if exists config_select on public.configuracion;
create policy config_select on public.configuracion for select using (true);

drop policy if exists config_write on public.configuracion;
create policy config_write on public.configuracion for all to authenticated
  using (public.es_admin()) with check (public.es_admin());


-- ═════════════════════════════════════════════════════════════════════════════
--  SEDES  (lectura: logueados · escritura: admin)
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.sedes enable row level security;
revoke all on public.sedes from anon;

drop policy if exists sedes_select on public.sedes;
create policy sedes_select on public.sedes for select to authenticated using (true);

drop policy if exists sedes_write on public.sedes;
create policy sedes_write on public.sedes for all to authenticated
  using (public.es_admin()) with check (public.es_admin());


-- ═════════════════════════════════════════════════════════════════════════════
--  ACTIVIDAD_LOG  (append-only: se inserta, lo lee solo admin, nadie edita/borra)
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.actividad_log enable row level security;
revoke all on public.actividad_log from anon;

drop policy if exists actividad_insert on public.actividad_log;
create policy actividad_insert on public.actividad_log for insert to authenticated with check (true);

drop policy if exists actividad_select on public.actividad_log;
create policy actividad_select on public.actividad_log for select to authenticated using (public.es_admin());


-- ═════════════════════════════════════════════════════════════════════════════
--  LIDERES  (tabla vieja en desuso → sin acceso desde la API)
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.lideres enable row level security;
revoke all on public.lideres from anon, authenticated;
-- (sin políticas → inaccesible; las funciones del servidor no la usan)


-- ============================================================================
-- Verificación rápida (opcional): RLS activo en todas
--   select relname, relrowsecurity from pg_class
--    where relname in ('personal','registros','horarios_semanales','configuracion',
--                      'sedes','actividad_log','lideres') order by relname;
-- ============================================================================
