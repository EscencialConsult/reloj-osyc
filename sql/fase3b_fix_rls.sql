-- ============================================================================
-- RUNAS Café — Arreglo: RLS de tablas heredadas + no guardar DNI en personal
-- Ejecutar en: Supabase → SQL Editor → Run
-- ----------------------------------------------------------------------------
-- 1) El panel admin escribe en estas tablas con la sesión del admin. En el
--    proyecto nuevo quedaron con RLS activo sin políticas → bloqueaba el alta.
--    Las dejamos SIN RLS (como el sistema original). La tabla `fichajes` sigue
--    protegida (esa NO se toca).
-- 2) El DNI es la contraseña del empleado → NO se guarda en `personal`
--    (queda solo encriptado en la cuenta de login). Se ajusta crear_empleado.
-- ============================================================================

-- 1) Desactivar RLS en las tablas heredadas (el admin las maneja desde el panel)
alter table public.personal            disable row level security;
alter table public.registros           disable row level security;
alter table public.horarios_semanales  disable row level security;
alter table public.actividad_log       disable row level security;
alter table public.configuracion       disable row level security;
alter table public.lideres             disable row level security;
-- (public.fichajes queda CON RLS a propósito: solo se escribe vía fichar())

-- 2) Alta de empleado sin guardar el DNI en la tabla personal
create or replace function public.crear_empleado(
  p_email  text,
  p_dni    text,
  p_nombre text,
  p_area   text,
  p_rol    text default null
) returns jsonb
language plpgsql security definer
set search_path = public, extensions as $$
declare v_id uuid; v_email text := lower(trim(p_email));
begin
  if not public.es_admin() then
    return jsonb_build_object('ok',false,'msg','No autorizado. Iniciá sesión como administrador.');
  end if;
  if v_email = '' or p_dni is null or trim(p_dni) = '' then
    return jsonb_build_object('ok',false,'msg','Email y DNI son obligatorios.');
  end if;

  -- crea/actualiza la cuenta de login (email + DNI como contraseña, encriptada)
  v_id := public._upsert_auth_user(v_email, trim(p_dni), p_nombre);

  -- vincula con personal por email; si no existe, lo crea (SIN guardar el DNI)
  update public.personal
     set user_id = v_id, email = v_email, activo = true
   where lower(email) = v_email;
  if not found then
    insert into public.personal (nombre, rol, area, activo, email, user_id)
    values (p_nombre, p_rol, p_area, true, v_email, v_id);
  end if;

  return jsonb_build_object('ok',true,'user_id',v_id,'email',v_email,
    'msg', p_nombre || ' dado de alta. Entra con ' || v_email || ' + su DNI.');
end $$;
grant execute on function public.crear_empleado(text,text,text,text,text) to authenticated;
